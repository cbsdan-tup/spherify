require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const { MessageGroup } = require("./models/Team");
const User = require("./models/User");
const {Team} = require("./models/Team");

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
const { getCloudinaryConfig } = require("./config/cloudinary");
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
const contactRoutes = require("./routes/contactRoutes"); // Add this line
const searchRoutes = require("./routes/searchRoutes");
const teamApplicationRoutes = require("./routes/teamApplicationRoutes");

const sendNotification = require("./config/sendNotification");

// Import and start the scheduler
require("./scheduler/enableUsers");

console.log(process.env.NODE_ENV);

let usersEditing = {};

connectDatabase();

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
app.use("/api/v1/contact", contactRoutes); // Add this line
app.use("/api/v1", searchRoutes);
app.use("/api/v1", teamApplicationRoutes);

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

// Add this helper function at the top of the file after imports
function getUniqueColorForUser(userId) {
  if (!userId) return "#ccc";
  const colors = [
    "#FF6633",
    "#FFB399",
    "#FF33FF",
    "#FFFF99",
    "#00B3E6",
    "#E6B333",
    "#3366E6",
    "#999966",
    "#99FF99",
    "#B34D4D",
    "#80B300",
    "#809900",
    "#E6B3B3",
    "#6680B3",
    "#66991A",
    "#FF99E6",
    "#CCFF1A",
    "#FF1A66",
    "#E6331A",
    "#33FFCC",
    "#66994D",
    "#B366CC",
    "#4D8000",
    "#B33300",
    "#CC80CC",
    "#66664D",
    "#991AFF",
    "#E666FF",
    "#4DB3FF",
    "#1AB399",
    "#E666B3",
    "#33991A",
    "#CC9999",
    "#B3B31A",
    "#00E680",
    "#4D8066",
    "#809980",
    "#E6FF80",
    "#1AFF33",
    "#999933",
    "#FF3380",
    "#CCCC00",
    "#66E64D",
    "#4D80CC",
    "#9900B3",
    "#E64D66",
    "#4DB380",
    "#FF4D4D",
    "#99E6E6",
    "#6666FF",
  ];
  let hash = 5381;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 33) ^ userId.charCodeAt(i);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

// Status update helper functions
async function updateUserStatusOnLogin(userId) {
  try {
    const user = await User.findById(userId);
    if (user) {
      const previousStatus = user.status;
      user.status = "active";
      user.statusUpdatedAt = new Date();
      await user.save();

      console.log(
        `[LOGIN] User ${user.firstName} ${user.lastName} (${userId}) logged in: ${previousStatus} → active`
      );
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

      console.log(
        `[LOGOUT] User ${user.firstName} ${user.lastName} (${userId}) logged out: ${previousStatus} → offline`
      );
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
            statusUpdatedAt: user.statusUpdatedAt,
          });
        }
      } else {
        console.log(
          `[RECONNECTION] User ${userId} reconnected. Active connections: ${activeConnections[userId].size}`
        );
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
          console.log(
            `[STATUS CHANGE] User ${user.firstName} ${user.lastName} (${userId}): ${previousStatus} → ${status}`
          );

          // Broadcast status change to all connected clients
          io.emit("userStatusChanged", {
            userId: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            avatar: user.avatar,
            previousStatus,
            currentStatus: status,
            statusUpdatedAt: user.statusUpdatedAt,
          });

          // Log active connections count
          const activeUsers = Object.keys(activeConnections).length;
          console.log(`[ACTIVE USERS] Current active users: ${activeUsers}`);
        } else {
          console.log(
            `[STATUS UNCHANGED] User ${user.firstName} ${user.lastName} (${userId}) remains ${status}`
          );
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
          statusUpdatedAt: user.statusUpdatedAt,
        });
      }
    } catch (error) {
      console.error("Error handling logout event:", error);
    }
  });

  // Handle disconnect event
  socket.on("disconnect", async () => {
    const userId = socket.userId;
    console.log(
      `[DISCONNECT] Socket ${socket.id} disconnected. User: ${
        userId || "Unknown"
      }`
    );

    if (userId) {
      if (activeConnections[userId]) {
        activeConnections[userId].delete(socket.id);
        console.log(
          `[CONNECTION COUNT] User ${userId} connections remaining: ${activeConnections[userId].size}`
        );

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
              statusUpdatedAt: user.statusUpdatedAt,
            });
          }

          delete activeConnections[userId];
        }
      }
    }
  });

  socket.on("joinGroup", (groupId) => {
    const validGroupId = mongoose.Types.ObjectId.isValid(groupId)
      ? groupId
      : null;
    if (!validGroupId) {
      console.log("Invalid Group ID");
      return;
    }

    socket.join(groupId);
    console.log(`User joined group: ${groupId}`);
  });

  socket.on("join-document", (documentId, user) => {
    try {
      if (
        !documentId ||
        !user ||
        !user.id ||
        !user.firstName ||
        !user.lastName
      ) {
        console.error("Invalid documentId or user data:", documentId, user);
        return;
      }

      socket.join(documentId);
      console.log(
        `User ${user.firstName} ${user.lastName} joined document room: ${documentId}`
      );

      const userId = user.id || user._id;

      if (!usersEditing[documentId]) {
        usersEditing[documentId] = {};
      }

      usersEditing[documentId][userId] = {
        ...user,
        id: userId,
        _id: userId,
        socketId: socket.id,
        color: getUniqueColorForUser(userId),
      };

      console.log(
        `User added to document ${documentId}:`,
        usersEditing[documentId][userId]
      );

      io.to(documentId).emit("user-editing", {
        documentId,
        users: Object.values(usersEditing[documentId]),
      });
    } catch (error) {
      console.error("Error in join-document:", error);
    }
  });

  socket.on(
    "update-cursor-position",
    async ({ documentId, userId, cursorPosition }) => {
      try {
        console.log(
          `[CURSOR] Received cursor update for user ${userId} in doc ${documentId}`
        );

        if (!documentId || !userId || !cursorPosition) {
          console.error("[CURSOR] Invalid data for cursor position update");
          return;
        }

        if (!usersEditing[documentId]) {
          console.log(`[CURSOR] Creating new document entry: ${documentId}`);
          usersEditing[documentId] = {};
        }

        let userData = usersEditing[documentId][userId];

        if (!userData) {
          console.log(
            `[CURSOR] User ${userId} not found in document ${documentId}, fetching from DB`
          );
          try {
            const dbUser = await User.findById(userId)
              .select("firstName lastName avatar")
              .lean();

            if (dbUser) {
              userData = {
                ...dbUser,
                id: userId,
                _id: userId,
                socketId: socket.id,
                color: getUniqueColorForUser(userId),
              };
              usersEditing[documentId][userId] = userData;
              console.log(
                `[CURSOR] User added from DB: ${dbUser.firstName} ${dbUser.lastName}`
              );
            } else {
              userData = {
                id: userId,
                _id: userId,
                firstName: "Anonymous",
                lastName: "User",
                socketId: socket.id,
                color: getUniqueColorForUser(userId),
              };
              usersEditing[documentId][userId] = userData;
              console.log(`[CURSOR] Created fallback user data for ${userId}`);
            }
          } catch (err) {
            console.error(`[CURSOR] DB error for ${userId}:`, err);
            userData = {
              id: userId,
              _id: userId,
              firstName: "Unknown",
              lastName: "User",
              socketId: socket.id,
              color: getUniqueColorForUser(userId),
            };
            usersEditing[documentId][userId] = userData;
          }
        } else {
          userData.socketId = socket.id;
          usersEditing[documentId][userId] = userData;
        }

        const name =
          `${userData.firstName || ""} ${userData.lastName || ""}`.trim() ||
          "Anonymous";
        const color = userData.color || getUniqueColorForUser(userId);

        io.to(documentId).emit("cursor-position-updated", {
          userId,
          name,
          range: cursorPosition,
          color,
        });

        io.to(documentId).emit("user-editing", {
          documentId,
          users: Object.values(usersEditing[documentId] || {}),
        });

        console.log(
          `[CURSOR] Broadcast complete: ${name}'s cursor position in ${documentId}`
        );
      } catch (error) {
        console.error("[CURSOR] Error in update-cursor-position:", error);
      }
    }
  );

  socket.on("update-user-status", ({ documentId, user }) => {
    try {
      if (!documentId || !user || !user.id) {
        console.error("Invalid data for user status update:", {
          documentId,
          user,
        });
        return;
      }

      const userId = user.id || user._id;

      if (usersEditing[documentId] && usersEditing[documentId][userId]) {
        usersEditing[documentId][userId].lastActive = new Date();

        io.to(documentId).emit("user-editing", {
          documentId,
          users: Object.values(usersEditing[documentId]),
        });
      }
    } catch (error) {
      console.error("Error handling user status update:", error);
    }
  });

  socket.on("leave-document", (documentId, user) => {
    try {
      if (!documentId || !user || !user.id) {
        console.error("Invalid documentId or user data:", documentId, user);
        return;
      }

      socket.leave(documentId);
      console.log(
        `User ${user.firstName} ${user.lastName} left document room: ${documentId}`
      );

      if (usersEditing[documentId] && usersEditing[documentId][user.id]) {
        delete usersEditing[documentId][user.id];

        if (Object.keys(usersEditing[documentId]).length === 0) {
          delete usersEditing[documentId];
        }
      }

      console.log("Emitting user-editing:", {
        documentId,
        users: usersEditing[documentId]
          ? Object.values(usersEditing[documentId])
          : [],
      });
      io.to(documentId).emit("user-editing", {
        documentId,
        users: usersEditing[documentId]
          ? Object.values(usersEditing[documentId])
          : [],
      });
    } catch (error) {
      console.error("Error in leave-document:", error);
    }
  });

  socket.on("disconnect", () => {
    try {
      console.log(`User disconnected: ${socket.id}`);

      for (const documentId in usersEditing) {
        if (usersEditing[documentId]) {
          const initialLength = Object.keys(usersEditing[documentId]).length;

          for (const userId in usersEditing[documentId]) {
            if (usersEditing[documentId][userId].socketId === socket.id) {
              delete usersEditing[documentId][userId];
            }
          }

          if (Object.keys(usersEditing[documentId]).length !== initialLength) {
            if (Object.keys(usersEditing[documentId]).length === 0) {
              delete usersEditing[documentId];
            }

            console.log("Emitting user-editing:", {
              documentId,
              users: usersEditing[documentId]
                ? Object.values(usersEditing[documentId])
                : [],
            });
            io.to(documentId).emit("user-editing", {
              documentId,
              users: usersEditing[documentId]
                ? Object.values(usersEditing[documentId])
                : [],
            });
            console.log(
              `Removed user from document ${documentId}:`,
              usersEditing[documentId]
            );
          }
        }
      }
    } catch (error) {
      console.error("Error in disconnect handler:", error);
    }
  });

  socket.on("sendMessage", async ({ groupId, sender, content, images, teamId }) => {
    try {
      const messageGroup = await MessageGroup.findById(groupId);
      if (!messageGroup) return;

      const senderDetails = await User.findById(sender).select(
        "firstName lastName email avatar permissionToken"
      );

      if (!senderDetails) {
        console.log("Sender not found");
        return;
      }
      console.log("Receiving message");
      
      // Remove the sender notification code - don't notify the sender about their own message
      
      // Get the team to find all members with permission tokens
      const { Team } = require("./models/Team");
      const team = await Team.findById(teamId).populate({
        path: 'members.user',
        select: 'permissionToken'
      });
      
      if (team) {
        console.log(`Sending notifications to team ${team.name} members (excluding sender)`);
        
        // Get all team members with permission tokens (excluding sender)
        const teamMembersWithTokens = team.members
          .filter(member => 
            member.user && 
            member.user._id.toString() !== sender.toString() && 
            member.user.permissionToken
          );
        
        // Send notifications to all team members with tokens
        teamMembersWithTokens.forEach(async (member) => {
          try {
            const notifResult = await sendNotification(
              member.user.permissionToken,
              {
                title: `Spherify: New Message`,
                body: `${senderDetails.firstName} ${senderDetails.lastName} sent a message to ${team?.name} in ${messageGroup.name}: ${content}`,
                image: senderDetails?.avatar?.url,
                tag: "new-message",
                url: `https://spherify.vercel.app/main/${teamId}`,
              }
            );
            notifResult &&
              console.log("Notification sent successfully to team member:", member.user._id);
          } catch (error) {
            console.error("Error sending notification to team member:", error);
          }
        });
      } else {
        // Fallback to previous behavior - only notify message group members
        const recipients = await User.find({
          _id: { $in: messageGroup.members, $ne: senderDetails._id },
          permissionToken: { $exists: true, $ne: null },
        }).select("permissionToken");
        
        recipients.forEach(async (recipient) => {
          try {
            const notifResult = await sendNotification(
              recipient.permissionToken,
              {
                title: `${senderDetails.firstName} ${senderDetails.lastName} sent a message`,
                body: content,
                image: senderDetails.avatar,
                tag: "new-message",
                url: `https://spherify.vercel.app/main/${teamId}`,
              }
            );
            notifResult &&
              console.log("Notification sent successfully to:", recipient._id);
          } catch (error) {
            console.error("Error sending notification to recipient:", error);
          }
        });
      }

      // ...existing code for handling images...
      let uploadedImages = [];

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
        seenBy: [{ user: senderDetails._id, seenAt: new Date() }],
      };

      messageGroup.messages.push(newMessage);
      await messageGroup.save();

      const savedMessage =
        messageGroup.messages[messageGroup.messages.length - 1];

      socket.emit("messageSentConfirmation");

      io.to(groupId).emit("receiveMessage", {
        ...savedMessage.toObject(),
        _id: savedMessage._id,
        sender: {
          _id: senderDetails._id,
          firstName: senderDetails.firstName,
          lastName: senderDetails.lastName,
          email: senderDetails.email,
          avatar: senderDetails.avatar,
        },
        seenBy: [
          {
            user: {
              _id: senderDetails._id,
              firstName: senderDetails.firstName,
              lastName: senderDetails.lastName,
              email: senderDetails.email,
              avatar: senderDetails.avatar,
            },
            seenAt: new Date(),
          },
        ],
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  });

  socket.on("messageSeen", async ({ messageId, groupId, userId }) => {
    try {
      if (
        !mongoose.Types.ObjectId.isValid(groupId) ||
        !mongoose.Types.ObjectId.isValid(userId)
      ) {
        console.error("Invalid groupId or userId in messageSeen event");
        return;
      }

      const messageGroup = await MessageGroup.findById(groupId);
      if (!messageGroup) return;

      const message = messageGroup.messages.id(messageId);
      if (!message) return;

      const alreadySeen = message.seenBy.some(
        (seen) => seen.user.toString() === userId
      );

      if (!alreadySeen) {
        message.seenBy.push({ user: userId, seenAt: new Date() });
        await messageGroup.save();

        const updatedGroup = await MessageGroup.findById(groupId)
          .populate(
            "messages.sender",
            "firstName lastName email avatar status statusUpdatedAt"
          )
          .populate("messages.seenBy.user", "firstName lastName email avatar");

        const updatedMessage = updatedGroup.messages.id(messageId);

        io.to(groupId).emit("messageSeenUpdate", updatedMessage);
      }
    } catch (err) {
      console.error("Error handling message seen:", err);
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
      if (usersEditing[documentId]) {
        for (const userId in usersEditing[documentId]) {
          if (usersEditing[documentId][userId].socketId === socket.id) {
            delete usersEditing[documentId][userId];
            console.log(`Removed user ${userId} from document ${documentId}`);
          }
        }

        io.to(documentId).emit("user-editing", {
          documentId,
          users: Object.values(usersEditing[documentId]),
        });

        if (Object.keys(usersEditing[documentId]).length === 0) {
          delete usersEditing[documentId];
        }
      }
    });
  });

  socket.on("logStatusChange", (logData) => {
    statusLogs.unshift(logData);

    if (statusLogs.length > MAX_STATUS_LOGS) {
      statusLogs.pop();
    }
  });

  // Handle conference start event
  socket.on("startConference", async ({ groupId, teamId, initiator }) => {
    try {
      console.log("Starting conference")
      if (!mongoose.Types.ObjectId.isValid(groupId)) {
        console.error("Invalid group ID for conference:", groupId);
        return;
      }

      // Find the message group
      const messageGroup = await MessageGroup.findById(groupId);
      if (!messageGroup) {
        console.error("Message group not found:", groupId);
        return;
      }

      // Get the team details
      const team = await Team.findById(teamId).populate({
        path: 'members.user',
        select: 'permissionToken firstName lastName'
      });
      
      if (!team) {
        console.error("Team not found:", teamId);
        return;
      }
      
      console.log(`Conference initiated in ${messageGroup.name} by ${initiator.firstName} ${initiator.lastName}`);
      
      // Find members with permission tokens (excluding the initiator)
      const membersWithTokens = team.members.filter(member => 
        member.user && 
        member.user._id.toString() !== initiator._id.toString() &&
        member.user.permissionToken
      );
      
      // Send notifications to all members with tokens
      membersWithTokens.forEach(async (member) => {
        try {
          await sendNotification(member.user.permissionToken, {
            title: `${team.name}: Video Call Started`,
            body: `${initiator.firstName} ${initiator.lastName} started a video call in ${messageGroup.name}`,
            tag: 'video-call',
            url: `https://spherify.vercel.app/main/${teamId}`,
            image: initiator.avatar?.url || initiator.avatar
          });
          console.log(`Video call notification sent to ${member.user.firstName} ${member.user.lastName}`);
        } catch (error) {
          console.error("Error sending video call notification:", error);
        }
      });
      
      // Join the socket to the conference room
      socket.join(`conference:${groupId}`);
      
    } catch (error) {
      console.error("Error processing conference start event:", error);
    }
  });

});

app.get("/api/v1/admin/status-logs", async (req, res) => {
  try {
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
