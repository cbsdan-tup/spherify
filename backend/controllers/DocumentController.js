const Document = require("../models/Document");
const User = require("../models/User");
const { io } = require('socket.io'); // Add this line to use socket.io

// let usersEditing = {}; // Store the users editing each document

const createDocument = async (req, res) => {
    try {
        const { teamId } = req.params; 
        const { fileName, createdBy } = req.body;

        if (!fileName) {
            return res.status(400).json({ message: "fileName is required" });
        }

        const user = await User.findById(createdBy);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const newDocument = new Document({
            teamId,
            fileName,
            createdBy: user,
            data: { ops: [] }, 
        });

        await newDocument.save();
        res.status(201).json(newDocument);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

const getDocumentsByTeamId = async (req, res) => {
    try {
        const { teamId } = req.params;
        const documents = await Document.find({ teamId }).populate('createdBy');
        res.status(200).json(documents);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// Store users editing documents as { documentId: { userId: userData } }

// const usersEditing = {};

// const handleUserEditing = (socket, io) => {
//   // Handle user joining a document room
//   socket.on("join-document", (documentId, user) => {
//     try {
//       if (!documentId || !user || !user.id || !user.firstName || !user.lastName) {
//         console.error("Invalid documentId or user data:", documentId, user);
//         return;
//       }

//       socket.join(documentId); // Add the user to the document room
//       console.log(`User ${user.firstName} ${user.lastName} joined document room: ${documentId}`);

//       // Initialize the usersEditing object for the document if it doesn't exist
//       if (!usersEditing[documentId]) {
//         usersEditing[documentId] = {};
//       }

//       // Add or update the user in the editing list
//       usersEditing[documentId][user.id] = { ...user, socketId: socket.id };

//       // Emit the updated list of users editing the document to all clients in the room
//       io.to(documentId).emit("user-editing", {
//         documentId,
//         users: Object.values(usersEditing[documentId]),
//       });
//     } catch (error) {
//       console.error("Error in join-document:", error);
//     }
//   });

//   // Handle user leaving a document room
//   socket.on("leave-document", (documentId, user) => {
//     try {
//       if (!documentId || !user || !user.id) {
//         console.error("Invalid documentId or user data:", documentId, user);
//         return;
//       }

//       socket.leave(documentId); // Remove the user from the document room
//       console.log(`User ${user.firstName} ${user.lastName} left document room: ${documentId}`);

//       // Remove the user from the editing list
//       if (usersEditing[documentId] && usersEditing[documentId][user.id]) {
//         delete usersEditing[documentId][user.id];

//         // If no users are editing the document, delete the entry to free up memory
//         if (Object.keys(usersEditing[documentId]).length === 0) {
//           delete usersEditing[documentId];
//         }
//       }

//       // Emit the updated list of users editing the document to all clients in the room
//       io.to(documentId).emit("user-editing", {
//         documentId,
//         users: usersEditing[documentId] ? Object.values(usersEditing[documentId]) : [],
//       });
//     } catch (error) {
//       console.error("Error in leave-document:", error);
//     }
//   });

//   // Handle user disconnect
//   socket.on("disconnect", () => {
//     try {
//       console.log(`User disconnected: ${socket.id}`);

//       // Clean up usersEditing
//       for (const documentId in usersEditing) {
//         if (usersEditing[documentId]) {
//           const initialLength = Object.keys(usersEditing[documentId]).length;

//           for (const userId in usersEditing[documentId]) {
//             if (usersEditing[documentId][userId].socketId === socket.id) {
//               delete usersEditing[documentId][userId];
//             }
//           }

//           // If the user was removed, broadcast the updated list
//           if (Object.keys(usersEditing[documentId]).length !== initialLength) {
//             // If no users are editing the document, delete the entry to free up memory
//             if (Object.keys(usersEditing[documentId]).length === 0) {
//               delete usersEditing[documentId];
//             }

//             io.to(documentId).emit("user-editing", {
//               documentId,
//               users: usersEditing[documentId] ? Object.values(usersEditing[documentId]) : [],
//             });
//             console.log(`Removed user from document ${documentId}:`, usersEditing[documentId]);
//           }
//         }
//       }
//     } catch (error) {
//       console.error("Error in disconnect handler:", error);
//     }
//   });
// };


// Soft delete a document



const softDeleteDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const document = await Document.findById(documentId);

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Check if the document is already marked as deleted
    if (document.deleted) {
      return res.status(400).json({ message: "Document is already deleted" });
    }

    // Mark as deleted
    document.deleted = true;
    document.deletedAt = new Date(); // Set the deleted timestamp
    await document.save();

    res
      .status(200)
      .json({ message: "Document soft deleted successfully", document });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// 🔹 Integrating socket.io with Express
const socketHandler = (server) => {
    const io = socketIo(server); // Initialize socket.io
    io.on('connection', (socket) => {
        console.log('A user connected');
        handleUserEditingStatus(socket, io); // Pass 'io' to the handler

        // Add any other socket event handlers you need
        socket.on('disconnect', () => {
            console.log('User disconnected');
        });
    });
};

module.exports = {
  createDocument,
  getDocumentsByTeamId,
  socketHandler,
  softDeleteDocument,
};