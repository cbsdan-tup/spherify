const Document = require("../models/Document");
const User = require("../models/User");
const { io } = require('socket.io'); // Add this line to use socket.io

let usersEditing = {}; // Store the users editing each document

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

// 🔹 Handle user editing updates (new event handling logic)
const handleUserEditingStatus = (socket, io) => {
    socket.on('update-user-status', (data) => {
        const { documentId, user } = data;

        // Store or update the user's editing status in usersEditing
        usersEditing[documentId] = usersEditing[documentId] || [];
        if (!usersEditing[documentId].includes(user)) {
            usersEditing[documentId].push(user);
        }

        // Emit the updated list of users editing the document
        //io.emit('user-editing', { documentId, users: usersEditing[documentId] });

        // Emit user-editing event only to relevant clients
        // socket.to(documentId).emit('user-editing', { documentId, users: usersEditing[documentId] });

         // Emit to users connected to this document
  io.to(documentId).emit('user-editing', {
    documentId,
    users: usersEditing[documentId],
  });

    });

    // Handle user disconnect (remove them from the editing users list)
    socket.on('disconnect', () => {
        for (let documentId in usersEditing) {
            usersEditing[documentId] = usersEditing[documentId].filter(
                (user) => user !== socket.id
            );
            io.emit('user-editing', { documentId, users: usersEditing[documentId] });
        }
    });
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

module.exports = { createDocument, getDocumentsByTeamId, socketHandler };