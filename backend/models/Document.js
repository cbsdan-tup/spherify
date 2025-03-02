const { Schema, model } = require("mongoose");
const mongoose = require("mongoose");

const DocumentSchema = new Schema({
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
  fileName: { type: String, required: true },
  data: Object,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
  deleted: { type: Boolean, default: false }, // Soft delete flag
  deletedAt: { type: Date, default: null }, // Timestamp of when it was deleted
});

// Create and export the Document model
module.exports = model("Document", DocumentSchema);
