require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const { MessageGroup } = require("./models/Team");
const User = require("./models/User");
const Document = require("./models/Document");
const AdminConfigurations = require("./models/AdminConfiguration");

const app = express();
const path = require("path");

const { logger, logEvents } = require("./middleware/logger");
const errorHandler = require("./middleware/errorHandler");

const cors = require("cors");
const connectDatabase = require("./config/database");

const mongoose = require("mongoose");
const PORT = process.env.PORT || 8000;

const cloudinary = require("cloudinary");

const root = require("./routes/root");
const account = require("./routes/account");
const teamRoutes = require("./routes/teamRoutes");
const messageRoutes = require("./routes/messageRoutes");
const meetingRoutes = require("./routes/meetingRoutes");
const eventRoutes = require("./routes/calendar/events");
const documentRoutes = require("./routes/documentRoutes");
const listRoutes = require("./routes/kanban/listRoutes");
const cardRoutes = require("./routes/kanban/cardRoutes"); 
const nextCloudRoutes = require("./routes/nextCloudUpload");
const fileSharingRoutes = require("./routes/fileSharingRoutes");;
const teamRequest = require("./routes/teamRequests");
const ganttRoutes = require("./routes/gantt/ganttRoutes"); 
const adminRoutes = require("./routes/adminRoutes")

console.log(process.env.NODE_ENV);

let usersEditing = {}; 

connectDatabase();

async function getCloudinaryConfig() {
  try {
    const config = await AdminConfigurations.findOne({}, "cloudinary");
    if (!config) {
      throw new Error("Cloudinary configuration not found in database.");
    }
    cloud_name = `${config.cloudinary.name || ""}`;
    api_key = `${config.cloudinary.api_key || ""}`;
    api_secret = `${config.cloudinary.api_secret || ""}`;
   

  } catch (error) {
    console.error("Error fetching Nextcloud configuration:", error);
    throw error;
  }
}

let cloud_name = ""
let api_key = ""
let api_secret = ""

getCloudinaryConfig();

cloudinary.config({
  cloud_name: cloud_name,
  api_key: api_key,
  api_secret: api_secret,
});

//middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(logger);

app.use(cors());

app.use("/", express.static(path.join(__dirname, "public")));
app.use(errorHandler);

// Routes
app.use("/", root);
app.use("/api/v1", account);
app.use("/api/v1", teamRoutes);
app.use("/api/v1", messageRoutes);
app.use("/api/v1", meetingRoutes);
app.use("/api/v1", eventRoutes);
app.use("/api/v1", documentRoutes);
app.use("/api/v1", listRoutes);
app.use("/api/v1", cardRoutes); 
app.use("/api/v1", nextCloudRoutes);
app.use("/api/v1", fileSharingRoutes);
app.use("/api/v1", teamRequest);
app.use("/api/v1", teamRequest);
app.use("/api/v1", ganttRoutes);  
app.use("/api/v1", adminRoutes)
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

  socket.setMaxListeners(20);

  socket.on("joinGroup", (groupId) => {
    const validGroupId = mongoose.Types.ObjectId.isValid(groupId)
      ? groupId
      : null;
    if (!validGroupId) return console.log("Invalid Group ID");

    socket.join(groupId);
    console.log(`User joined group: ${groupId}`);
  });

  const usersEditing = {}; // Store users editing documents as { documentId: { userId: userData } }

  // Handle user joining a document room
  socket.on("join-document", (documentId, user) => {
    try {
      if (!documentId || !user || !user.id || !user.firstName || !user.lastName) {
        console.error("Invalid documentId or user data:", documentId, user);
        return;
      }
  
      socket.join(documentId); // Add the user to the document room
      console.log(`User ${user.firstName} ${user.lastName} joined document room: ${documentId}`);
  
      // Initialize the usersEditing object for the document if it doesn't exist
      if (!usersEditing[documentId]) {
        usersEditing[documentId] = {};
      }
  
      // Add or update the user in the editing list
      if (!usersEditing[documentId][user.id]) {
        usersEditing[documentId][user.id] = { ...user, socketId: socket.id };
      }
  
      // Emit the updated list of users editing the document to all clients in the room
      console.log("Emitting user-editing:", {
        documentId,
        users: Object.values(usersEditing[documentId]),
      });
      io.to(documentId).emit("user-editing", {
        documentId,
        users: Object.values(usersEditing[documentId]),
      });
    } catch (error) {
      console.error("Error in join-document:", error);
    }
  });
  
  // Handle user leaving a document room
  socket.on("leave-document", (documentId, user) => {
    try {
      if (!documentId || !user || !user.id) {
        console.error("Invalid documentId or user data:", documentId, user);
        return;
      }
  
      socket.leave(documentId); // Remove the user from the document room
      console.log(`User ${user.firstName} ${user.lastName} left document room: ${documentId}`);
  
      // Remove the user from the editing list
      if (usersEditing[documentId] && usersEditing[documentId][user.id]) {
        delete usersEditing[documentId][user.id];
  
        // If no users are editing the document, delete the entry to free up memory
        if (Object.keys(usersEditing[documentId]).length === 0) {
          delete usersEditing[documentId];
        }
      }
  
      // Emit the updated list of users editing the document to all clients in the room
      console.log("Emitting user-editing:", {
        documentId,
        users: usersEditing[documentId] ? Object.values(usersEditing[documentId]) : [],
      });
      io.to(documentId).emit("user-editing", {
        documentId,
        users: usersEditing[documentId] ? Object.values(usersEditing[documentId]) : [],
      });
    } catch (error) {
      console.error("Error in leave-document:", error);
    }
  });
  
  // Handle user disconnect
  socket.on("disconnect", () => {
    try {
      console.log(`User disconnected: ${socket.id}`);
  
      // Clean up usersEditing
      for (const documentId in usersEditing) {
        if (usersEditing[documentId]) {
          const initialLength = Object.keys(usersEditing[documentId]).length;
  
          for (const userId in usersEditing[documentId]) {
            if (usersEditing[documentId][userId].socketId === socket.id) {
              delete usersEditing[documentId][userId];
            }
          }
  
          // If the user was removed, broadcast the updated list
          if (Object.keys(usersEditing[documentId]).length !== initialLength) {
            // If no users are editing the document, delete the entry to free up memory
            if (Object.keys(usersEditing[documentId]).length === 0) {
              delete usersEditing[documentId];
            }
  
            console.log("Emitting user-editing:", {
              documentId,
              users: usersEditing[documentId] ? Object.values(usersEditing[documentId]) : [],
            });
            io.to(documentId).emit("user-editing", {
              documentId,
              users: usersEditing[documentId] ? Object.values(usersEditing[documentId]) : [],
            });
            console.log(`Removed user from document ${documentId}:`, usersEditing[documentId]);
          }
        }
      }
    } catch (error) {
      console.error("Error in disconnect handler:", error);
    }
  });

  socket.on("sendMessage", async ({ groupId, sender, content, images }) => {
    try {
      const messageGroup = await MessageGroup.findById(groupId);
      if (!messageGroup) return;

      const senderDetails = await User.findById(sender).select(
        "firstName lastName email avatar"
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

      // Notify sender that message is sent
      socket.emit("messageSentConfirmation");
      // Emit the message with populated sender details
      io.to(groupId).emit("receiveMessage", {
        ...newMessage,
        sender: {
          _id: senderDetails._id,
          firstName: senderDetails.firstName,
          lastName: senderDetails.lastName,
          email: senderDetails.email,
          avatar: senderDetails.avatar,
        },
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  });

  socket.on("get-document", async (documentId) => {
    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      console.error("❌ Invalid document ID:", documentId);
      return;
      }
  
    console.log(`✅ User joined document: ${documentId}`);
  
    const document = await findOrCreateDocument(documentId);
    socket.join(documentId);
  
    if (!document.data || typeof document.data !== "object" || !document.data.ops) {
      document.data = { ops: [] };
    }
  
    socket.emit("load-document", document.data);
  
    // Ensure no duplicate listeners
    socket.removeAllListeners("send-changes");
    socket.on("send-changes", (delta) => {
      if (!delta || typeof delta !== "object" || !delta.ops) {
        console.error("⚠️ Invalid delta received:", delta);
        return;
      }
      socket.broadcast.to(documentId).emit("receive-changes", delta);
    });
  
    socket.removeAllListeners("send-format");
    socket.on("send-format", ({ format, range }) => {
      if (!format || !range) return;
      socket.broadcast.to(documentId).emit("receive-format", { format, range });
    });
  
    socket.removeAllListeners("save-document");
    socket.on("save-document", async (data) => {
      if (data && typeof data === "object" && data.ops) {
        await Document.findByIdAndUpdate(documentId, { data });
      }
    });
  
     socket.on("disconnect", () => {
      console.log(`❌ User disconnected from document: ${documentId}`);
      // Remove the user from the editing list when they disconnect
      for (let docId in usersEditing) {
        usersEditing[docId] = usersEditing[docId].filter(
          (user) => user !== socket.id
        );
        io.to(docId).emit("user-editing", { documentId: docId, users: usersEditing[docId] });
      }
    });
  });

  

  socket.on("disconnect", () => {
    console.log("User Disconnected:", socket.id);
  });
});

async function findOrCreateDocument(id) {
  if (!id) return null;

  let document = await Document.findById(id);
  if (document) {
    return document 
  } else {
    return false;
  } 
}

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
