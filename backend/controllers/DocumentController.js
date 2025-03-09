const Document = require("../models/Document");
const User = require("../models/User");
const { io } = require("socket.io"); // Add this line to use socket.io
const mongoose = require("mongoose");

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

    if (!teamId || !mongoose.Types.ObjectId.isValid(teamId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or missing teamId." });
    }

    const documents = await Document.find({ teamId }).populate("createdBy");
    res.status(200).json(documents);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


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

// Rename a document
const renameDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { newFileName } = req.body;
    
    if (!newFileName || newFileName.trim() === '') {
      return res.status(400).json({ message: "New file name is required" });
    }

    const document = await Document.findById(documentId);

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Update the file name
    document.fileName = newFileName;
    await document.save();

    res.status(200).json({ 
      message: "Document renamed successfully", 
      document 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Restore a soft-deleted document
const restoreDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const document = await Document.findById(documentId);

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Check if the document is marked as deleted
    if (!document.deleted) {
      return res.status(400).json({ message: "Document is not deleted" });
    }

    // Mark as not deleted
    document.deleted = false;
    document.deletedAt = null; // Clear the deleted timestamp
    await document.save();

    res
      .status(200)
      .json({ message: "Document restored successfully", document });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// 🔹 Integrating socket.io with Express
const socketHandler = (server) => {
  const io = socketIo(server); // Initialize socket.io
  io.on("connection", (socket) => {
    console.log("A user connected");
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
  renameDocument,
  restoreDocument
};