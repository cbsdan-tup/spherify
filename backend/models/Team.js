const mongoose = require("mongoose");

const TeamMemberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  nickname: { type: String, default: "" },
  role: { type: String, default: "member" },
  isAdmin: { type: Boolean, default: false },
  joinedAt: { type: Date, default: Date.now }
});

const TeamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  logo: {
    publicId: { type: String, default: "" }, 
    url: { type: String, default: "" }, 
  },
  members: [TeamMemberSchema], 
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Team", TeamSchema);