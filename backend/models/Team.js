const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: false },
  images: [{ publicId: { type: String }, url: { type: String } }],
  createdAt: { type: Date, default: Date.now },
});

const MessageGroupSchema = new mongoose.Schema({
  team: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
  name: { type: String, required: true },
  isGeneral: { type: Boolean, default: false },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  messages: [MessageSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
  conference: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // User in the call
      joinedAt: { type: Date, default: Date.now }, // When the user joined
      leftAt: { type: Date, default: null }, // When the user left (null if still in)
    },
  ],
});

const TeamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    logo: {
      publicId: { type: String, default: "" },
      url: { type: String, default: "" },
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        nickname: { type: String, default: "" },
        role: { type: String, default: "member" },
        isAdmin: { type: Boolean, default: false },
        joinedAt: { type: Date, default: Date.now },
        leaveAt: { type: Date, default: null },
      },
    ],
    messageGroups: [
      { type: mongoose.Schema.Types.ObjectId, ref: "MessageGroup" },
    ],
    isActive: { type: Boolean, default: true },
    isDisabled: { type: Boolean, default: false },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

TeamSchema.pre('save', function(next) {
  const userMap = new Map();
  
  const filteredMembers = [];
  
  for (const member of this.members) {
    const userId = member.user.toString();
    
    if (userMap.has(userId)) {
      const existingIndex = userMap.get(userId);
      const existingMember = filteredMembers[existingIndex];
      
      if (existingMember.leaveAt && !member.leaveAt) {
        filteredMembers[existingIndex] = member;
      }
    } else {
      userMap.set(userId, filteredMembers.length);
      filteredMembers.push(member);
    }
  }
  
  this.members = filteredMembers;
  
  next();
});

const Team = mongoose.model("Team", TeamSchema);
const MessageGroup = mongoose.model("MessageGroup", MessageGroupSchema);

module.exports = {
  Team,
  MessageGroup,
};
