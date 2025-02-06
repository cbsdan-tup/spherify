const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const MessageGroupSchema = new mongoose.Schema({
  team: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
  name: { type: String, required: true }, 
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], 
  messages: [MessageSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now }
});

const TeamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  logo: {
    publicId: { type: String, default: "" }, 
    url: { type: String, default: "" }, 
  },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    nickname: { type: String, default: "" },
    role: { type: String, default: "member" },
    isAdmin: { type: Boolean, default: false },
    joinedAt: { type: Date, default: Date.now }
  }],
  messageGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: "MessageGroup" }], 
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now }
});

const Team = mongoose.model("Team", TeamSchema);
const MessageGroup = mongoose.model("MessageGroup", MessageGroupSchema);

module.exports = {
  Team,
  MessageGroup
};