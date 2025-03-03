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
const { initializeNextcloudAPI } = require("./utils/nextcloud");

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
const fileSharingRoutes = require("./routes/fileSharingRoutes");
const teamRequest = require("./routes/teamRequests");
const ganttRoutes = require("./routes/gantt/ganttRoutes");
const adminRoutes = require("./routes/adminRoutes");

console.log(process.env.NODE_ENV);

let usersEditing = {};

connectDatabase();

async function getCloudinaryConfig() {
  try {
    const config = await AdminConfigurations.findOne({}, "cloudinary");
    if (!config) {
      throw new Error("Cloudinary configuration not found in database.");
    }

    const cloudinaryConfig = {
      cloud_name: config.cloudinary.name || "",
      api_key: config.cloudinary.api_key || "",
      api_secret: config.cloudinary.api_secret || "",
    };

    // Configure Cloudinary after fetching credentials
    cloudinary.config(cloudinaryConfig);
  } catch (error) {
    console.error("Error fetching Cloudinary configuration:", error);
  }
}

getCloudinaryConfig().then(() => {
  console.log("Cloudinary configured successfully");
});

initializeNextcloudAPI().then(() => {
  console.log("Nextcloud API initialized successfully");
});

//middleware
app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ limit: "500mb", extended: true }));
app.use(logger);

app.use(
  cors({
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    exposedHeaders: ["Content-Disposition"],
  })
);

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
app.use("/api/v1", adminRoutes);
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

async function updateUserStatusOnLogin(userId) {
  try {
    const user = await User.findById(userId);
    if (user) {
      user.status = "active";
      await user.save();
      console.log(`User ${userId} logged in and status updated to active.`);
    }
  } catch (error) {
    console.error("Error updating user status on login:", error);
  }
}

async function updateUserStatusOnLogout(userId) {
  try {
    const user = await User.findById(userId);
    if (user) {
      user.status = "offline";
      await user.save();
      console.log(`User ${userId} logged out and status updated to offline.`);
    }
  } catch (error) {
    console.error("Error updating user status on logout:", error);
  }
}

const activeConnections = {}; // Track active connections for each user

io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  socket.setMaxListeners(20);

  socket.on("login", async (userId) => {
    try {
      // Store the userId in the socket object
      socket.userId = userId;

      // Track the connection
      if (!activeConnections[userId]) {
        activeConnections[userId] = new Set(); // Use a Set to store unique socket IDs
      }
      activeConnections[userId].add(socket.id);

      // Update the user's status to "active" if this is their first connection
      if (activeConnections[userId].size === 1) {
        await updateUserStatusOnLogin(userId);
      }

      console.log(`User ${userId} logged in and status updated to active.`);
    } catch (error) {
      console.error("Error updating user status on login:", error);
    }
  });

  socket.on("logout", async (userId) => {
    await updateUserStatusOnLogout(userId);
  });

  socket.on("disconnect", async () => {
    console.log("User Disconnected:", socket.id);

    const userId = socket.userId;

    if (userId) {
      if (activeConnections[userId]) {
        activeConnections[userId].delete(socket.id);

        if (activeConnections[userId].size === 0) {
          await updateUserStatusOnLogout(userId);
          delete activeConnections[userId]; 
        }
      }
    }
  });

  socket.on("joinGroup", (groupId) => {
    const validGroupId = mongoose.Types.ObjectId.isValid(groupId)
      ? groupId
      : null;
    if (!validGroupId) return console.log("Invalid Group ID");

    socket.join(groupId);
    console.log(`User joined group: ${groupId}`);
  });

  // Handle user editing updates (add this part for update-user-status and user-editing)
  socket.on("update-user-status", (data) => {
    const { documentId, user } = data;

    // Track users editing the document
    usersEditing[documentId] = usersEditing[documentId] || [];
    if (!usersEditing[documentId].includes(user)) {
      usersEditing[documentId].push(user);
    }

    // Emit the updated list of users editing the document to all clients in the room
    io.to(documentId).emit("user-editing", {
      documentId,
      users: usersEditing[documentId],
    });

    console.log(`User ${user} is editing document: ${documentId}`);
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

    if (
      !document.data ||
      typeof document.data !== "object" ||
      !document.data.ops
    ) {
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
        io.to(docId).emit("user-editing", {
          documentId: docId,
          users: usersEditing[docId],
        });
      }
    });
  });

  socket.on("disconnect", async () => {
    console.log("User Disconnected:", socket.id);
  });
});

async function findOrCreateDocument(id) {
  if (!id) return null;

  let document = await Document.findById(id);
  if (document) {
    return document;
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
