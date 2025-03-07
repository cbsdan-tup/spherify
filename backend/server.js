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

// Import routes
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
const teamReportRoutes = require("./routes/teamReportRoutes");

// Import and start the scheduler
require("./scheduler/enableUsers");

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

// Middleware
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
app.use("/api/v1", ganttRoutes);
app.use("/api/v1", adminRoutes);
app.use("/api/v1", teamReportRoutes);

// 404 not found routes
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

// Status update helper functions
async function updateUserStatusOnLogin(userId) {
  try {
    const user = await User.findById(userId);
    if (user) {
      const previousStatus = user.status;
      user.status = "active";
      user.statusUpdatedAt = new Date();
      await user.save();
      
      console.log(`[LOGIN] User ${user.firstName} ${user.lastName} (${userId}) logged in: ${previousStatus} → active`);
      return { user, previousStatus };
    }
  } catch (error) {
    console.error("Error updating user status on login:", error);
  }
  return null;
}

async function updateUserStatusOnLogout(userId) {
  try {
    const user = await User.findById(userId);
    if (user) {
      const previousStatus = user.status;
      user.status = "offline";
      user.statusUpdatedAt = new Date();
      await user.save();
      
      console.log(`[LOGOUT] User ${user.firstName} ${user.lastName} (${userId}) logged out: ${previousStatus} → offline`);
      return { user, previousStatus };
    }
  } catch (error) {
    console.error("Error updating user status on logout:", error);
  }
  return null;
}

// Track active connections for each user
const activeConnections = {};

// Status logging storage
const statusLogs = [];
const MAX_STATUS_LOGS = 1000;

io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);
  
  socket.setMaxListeners(20);

  // Add error handler
  socket.on("error", (error) => {
    console.error("Socket error:", error);
  });

  // Handle login event
  socket.on("login", async (userId) => {
    try {
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        console.error("Invalid userId received during login:", userId);
        return;
      }
      
      // Store the userId in the socket object
      socket.userId = userId;

      // Track the connection
      if (!activeConnections[userId]) {
        activeConnections[userId] = new Set(); // Use a Set to store unique socket IDs
      }
      activeConnections[userId].add(socket.id);

      // Update the user's status to "active" if this is their first connection
      if (activeConnections[userId].size === 1) {
        const result = await updateUserStatusOnLogin(userId);
        
        if (result) {
          const { user, previousStatus } = result;
          
          // Broadcast the status change
          io.emit("userStatusChanged", {
            userId: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            avatar: user.avatar,
            previousStatus,
            currentStatus: "active",
            statusUpdatedAt: user.statusUpdatedAt
          });
        }
      } else {
        console.log(`[RECONNECTION] User ${userId} reconnected. Active connections: ${activeConnections[userId].size}`);
      }
    } catch (error) {
      console.error("Error handling login event:", error);
    }
  });

  // Handle status update event
  socket.on("updateStatus", async ({ userId, status }) => {
    try {
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        console.error("Invalid userId received during status update:", userId);
        return;
      }
      
      if (!["active", "inactive", "offline"].includes(status)) {
        console.error("Invalid status received:", status);
        return;
      }
      
      const user = await User.findById(userId);
      if (user) {
        const previousStatus = user.status;
        
        // Only update if status actually changed
        if (previousStatus !== status) {
          user.status = status;
          user.statusUpdatedAt = new Date();
          await user.save();
          
          // Enhanced logging for status changes
          console.log(`[STATUS CHANGE] User ${user.firstName} ${user.lastName} (${userId}): ${previousStatus} → ${status}`);
          
          // Broadcast status change to all connected clients
          io.emit("userStatusChanged", {
            userId: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            avatar: user.avatar,
            previousStatus,
            currentStatus: status,
            statusUpdatedAt: user.statusUpdatedAt
          });
          
          // Log active connections count
          const activeUsers = Object.keys(activeConnections).length;
          console.log(`[ACTIVE USERS] Current active users: ${activeUsers}`);
        } else {
          console.log(`[STATUS UNCHANGED] User ${user.firstName} ${user.lastName} (${userId}) remains ${status}`);
        }
      } else {
        console.error(`User not found for ID: ${userId}`);
      }
    } catch (error) {
      console.error("Error updating user status:", error);
    }
  });

  // Handle logout event
  socket.on("logout", async (userId) => {
    try {
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        console.error("Invalid userId received during logout:", userId);
        return;
      }
      
      const result = await updateUserStatusOnLogout(userId);
      
      if (result) {
        const { user, previousStatus } = result;
        
        // Broadcast the status change
        io.emit("userStatusChanged", {
          userId: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          avatar: user.avatar,
          previousStatus,
          currentStatus: "offline",
          statusUpdatedAt: user.statusUpdatedAt
        });
      }
    } catch (error) {
      console.error("Error handling logout event:", error);
    }
  });

  // Handle disconnect event
  socket.on("disconnect", async () => {
    const userId = socket.userId;
    console.log(`[DISCONNECT] Socket ${socket.id} disconnected. User: ${userId || 'Unknown'}`);

    if (userId) {
      if (activeConnections[userId]) {
        activeConnections[userId].delete(socket.id);
        console.log(`[CONNECTION COUNT] User ${userId} connections remaining: ${activeConnections[userId].size}`);

        if (activeConnections[userId].size === 0) {
          const result = await updateUserStatusOnLogout(userId);
          
          if (result) {
            const { user, previousStatus } = result;
            
            // Broadcast the status change
            io.emit("userStatusChanged", {
              userId: user._id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              avatar: user.avatar,
              previousStatus,
              currentStatus: "offline",
              statusUpdatedAt: user.statusUpdatedAt
            });
          }
          
          delete activeConnections[userId];
        }
      }
    }
  });

  // Handle join group event
  socket.on("joinGroup", (groupId) => {
    const validGroupId = mongoose.Types.ObjectId.isValid(groupId) ? groupId : null;
    if (!validGroupId) {
      console.log("Invalid Group ID");
      return;
    }

    socket.join(groupId);
    console.log(`User joined group: ${groupId}`);
  });

  // Handle user editing updates
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

  // Handle send message event
  socket.on("sendMessage", async ({ groupId, sender, content, images }) => {
    try {
      const messageGroup = await MessageGroup.findById(groupId);
      if (!messageGroup) return;

      const senderDetails = await User.findById(sender).select(
        "firstName lastName email avatar"
      );
      if (!senderDetails) {
        console.log("Sender not found");
        return;
      }

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

      // Create new message with the sender automatically added to seenBy array
      const newMessage = {
        sender: senderDetails._id,
        content,
        createdAt: new Date(),
        images: uploadedImages,
        seenBy: [{ user: senderDetails._id, seenAt: new Date() }] // Add sender as first seener
      };

      messageGroup.messages.push(newMessage);
      await messageGroup.save();

      // Get the newly created message with its ID from the database
      const savedMessage = messageGroup.messages[messageGroup.messages.length - 1];

      // Notify sender that message is sent
      socket.emit("messageSentConfirmation");
      
      // Emit the message with populated sender details and seenBy information
      io.to(groupId).emit("receiveMessage", {
        ...savedMessage.toObject(),
        _id: savedMessage._id, // Ensure _id is included
        sender: {
          _id: senderDetails._id,
          firstName: senderDetails.firstName,
          lastName: senderDetails.lastName,
          email: senderDetails.email,
          avatar: senderDetails.avatar,
        },
        seenBy: [{
          user: {
            _id: senderDetails._id,
            firstName: senderDetails.firstName,
            lastName: senderDetails.lastName,
            email: senderDetails.email,
            avatar: senderDetails.avatar,
          },
          seenAt: new Date()
        }]
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  });

  // Handle message seen event
  socket.on("messageSeen", async ({ messageId, groupId, userId }) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(groupId) || !mongoose.Types.ObjectId.isValid(userId)) {
        console.error("Invalid groupId or userId in messageSeen event");
        return;
      }
      
      const messageGroup = await MessageGroup.findById(groupId);
      if (!messageGroup) return;
      
      // Find the message in the messages array
      const message = messageGroup.messages.id(messageId);
      if (!message) return;
      
      // Check if user already marked this message as seen
      const alreadySeen = message.seenBy.some(seen => seen.user.toString() === userId);
      
      if (!alreadySeen) {
        message.seenBy.push({ user: userId, seenAt: new Date() });
        await messageGroup.save();
        
        // Populate the seenBy field to include user details
        const updatedGroup = await MessageGroup.findById(groupId)
          .populate("messages.sender", "firstName lastName email avatar status statusUpdatedAt")
          .populate("messages.seenBy.user", "firstName lastName email avatar");
        
        const updatedMessage = updatedGroup.messages.id(messageId);
        
        // Broadcast to all users in the group
        io.to(groupId).emit("messageSeenUpdate", updatedMessage);
      }
    } catch (err) {
      console.error("Error handling message seen:", err);
    }
  });

  // Handle get document event
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
        io.to(docId).emit("user-editing", {
          documentId: docId,
          users: usersEditing[docId],
        });
      }
    });
  });

  // Handle log status change event
  socket.on("logStatusChange", (logData) => {
    // Store the log
    statusLogs.unshift(logData); // Add to beginning
    
    // Trim logs if needed
    if (statusLogs.length > MAX_STATUS_LOGS) {
      statusLogs.pop(); // Remove oldest
    }
  });
});

// Status logs endpoint
app.get("/api/v1/admin/status-logs", async (req, res) => {
  try {
    // You should add proper authentication here
    res.json({ logs: statusLogs });
  } catch (error) {
    console.error("Error retrieving status logs:", error);
    res.status(500).json({ error: "Failed to retrieve status logs" });
  }
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
