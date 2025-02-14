const { Schema, model } = require("mongoose");
const mongoose = require("mongoose");

const Document = new Schema({
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
  fileName: { type: String, required: true },
  data: Object,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = model("Document", Document);
