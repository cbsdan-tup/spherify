const mongoose = require("mongoose");

const MeetingSchema = new mongoose.Schema({
  roomName: { type: String, required: true, unique: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true }, // Link to a specific team
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Meeting", MeetingSchema);
