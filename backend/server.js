require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const { Team, MessageGroup } = require("./models/Team");
const User = require("./models/User");

const app = express();
const path = require("path");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const { logger, logEvents } = require("./middleware/logger");
const errorHandler = require("./middleware/errorHandler");

const cors = require("cors");
const connectDatabase = require("./config/database");

const mongoose = require("mongoose");
const PORT = process.env.PORT || 8000;

const cloudinary = require("cloudinary");

const account = require("./routes/account");
const teamRoutes = require("./routes/teamRoutes");
const messageRoutes = require("./routes/messageRoutes");

console.log(process.env.NODE_ENV);

connectDatabase();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ZOOM_API_KEY = process.env.ZOOM_API_KEY;
const ZOOM_API_SECRET = process.env.ZOOM_API_SECRET;

//middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(logger);

app.use(cors());

app.use("/", express.static(path.join(__dirname, "public")));
app.use(errorHandler);

// Routes
app.use("/", require("./routes/root"));
app.use("/api/v1", account);
app.use("/api/v1", teamRoutes);
app.use("/api/v1", messageRoutes);

//404 not found routes
app.all("*", (req, res) => {
  res.status(404);
  if (req.accepts("html")) {
    res.sendFile(path.join(__dirname, "views", "404.html"));
  } else if (req.accepts("json")) {
    res.json({ message: "404 Not Found" });
  } else {
    res.type("txt").send("404 Not Found");
  }
});

app.post("/api/v1/generate-signature", (req, res) => {
  try {
    const { meetingNumber, role } = req.body;

    const timestamp = new Date().getTime() - 30000;
    const msg = Buffer.from(`${ZOOM_API_KEY}${meetingNumber}${timestamp}${role}`).toString("base64");
    const hash = crypto.createHmac("sha256", ZOOM_API_SECRET).update(msg).digest("base64");
    const signature = Buffer.from(`${ZOOM_API_KEY}.${meetingNumber}.${timestamp}.${role}.${hash}`).toString("base64");

    res.json({ success: true, signature });
  } catch (error) {
    console.error("Signature Error:", error);
    res.status(500).json({ success: false, message: "Error generating signature" });
  }
});

// Generate JWT Token for Zoom API Authentication
const generateZoomToken = () => {
  return jwt.sign(
    { iss: ZOOM_API_KEY, exp: Math.floor(Date.now() / 1000) + 3600 },
    ZOOM_API_SECRET
  );
};

// API to Create a Zoom Meeting
app.post("/create-meeting", async (req, res) => {
  try {
    const { topic, duration } = req.body;

    const token = generateZoomToken();
    const response = await axios.post(
      `https://api.zoom.us/v2/users/me/meetings`,
      {
        topic,
        type: 2, // Scheduled meeting
        duration,
        timezone: "Asia/Manila", // Change as needed
        settings: {
          host_video: true,
          participant_video: true,
        },
      },
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );

    res.json({ success: true, meeting: response.data });
  } catch (error) {
    console.error("Zoom API Error:", error.response?.data || error.message);
    res.status(500).json({ success: false, message: "Failed to create meeting" });
  }
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Socket.io for Real-time Messaging
io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  socket.on("joinGroup", (groupId) => {
    const validGroupId = mongoose.Types.ObjectId.isValid(groupId)
      ? groupId
      : null;
    if (!validGroupId) return console.log("Invalid Group ID");

    socket.join(groupId);
    console.log(`User joined group: ${groupId}`);
  });
  socket.on("sendMessage", async ({ groupId, sender, content, images }) => {
    try {
      const messageGroup = await MessageGroup.findById(groupId);
      if (!messageGroup) return;
  
      const senderDetails = await User.findById(sender).select(
        "firstName lastName email"
      );
      if (!senderDetails) return console.log("Sender not found");
  
      let uploadedImages = [];
  
      // If there are images, upload them directly to Cloudinary
      if (Array.isArray(images) && images.length > 0) {
        uploadedImages = await Promise.all(
          images.map(async (image) => {
            const uploadResponse = await cloudinary.uploader.upload(image, {
              folder: "group_images",
            });
            return {
              publicId: uploadResponse.public_id,
              url: uploadResponse.secure_url,
            };
          })
        );
      }
  
      const newMessage = {
        sender: senderDetails._id,
        content,
        createdAt: new Date(),
        images: uploadedImages,
      };
  
      messageGroup.messages.push(newMessage);
      await messageGroup.save();
  
      // Emit the message with populated sender details
      io.to(groupId).emit("receiveMessage", {
        ...newMessage,
        sender: {
          _id: senderDetails._id,
          firstName: senderDetails.firstName,
          lastName: senderDetails.lastName,
          email: senderDetails.email,
        },
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  });
  

  socket.on("disconnect", () => {
    console.log("User Disconnected:", socket.id);
  });
});

mongoose.connection.once("open", () => {
  console.log("Connected to MongoDB");
  server.listen(PORT, () =>
    console.log(
      `Server running on port ${PORT} in ${process.env.NODE_ENV} mode`
    )
  );
});

mongoose.connection.on("error", (err) => {
  console.log(err);
  logEvents(
    `${err.no}: ${err.code}\t${err.syscall}\t${err.hostname}`,
    "mongoErrLog.log"
  );
});
