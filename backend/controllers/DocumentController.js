const Document = require("../models/Document");
const User = require("../models/User");

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

module.exports = { createDocument, getDocumentsByTeamId };
