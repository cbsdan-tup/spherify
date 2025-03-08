const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: false },
  images: [{ publicId: { type: String }, url: { type: String } }],
  createdAt: { type: Date, default: Date.now },
  seenBy: [{ 
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    seenAt: { type: Date, default: Date.now }
  }]
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
        activeDays: [{ type: Date }] // Simplified to just store dates when user was active
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
  const userIndicesMap = new Map(); 
  const filteredMembers = [];
  
  for (const member of this.members) {
    const userId = member.user.toString();
    
    if (userIndicesMap.has(userId)) {
      const userIndices = userIndicesMap.get(userId);
      const allPreviousLeft = userIndices.every(idx => 
        filteredMembers[idx].leaveAt !== null
      );
      
      if (allPreviousLeft) {
        userIndicesMap.get(userId).push(filteredMembers.length);
        filteredMembers.push(member);
      }
    } else {
      // First occurrence of this user, add them
      userIndicesMap.set(userId, [filteredMembers.length]);
      filteredMembers.push(member);
    }
  }
  
  this.members = filteredMembers;
  next();
});

// Static method to update a member's active days
TeamSchema.statics.updateMemberActivity = async function(teamId, userId) {
  // Get current date but remove time component to track by day only
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const team = await this.findById(teamId);
  if (!team) return null;
  
  const memberIndex = team.members.findIndex(
    (member) => member.user.toString() === userId.toString()
  );
  
  if (memberIndex === -1) return null;
  
  // Check if today is already in the activeDays array
  const hasActiveToday = team.members[memberIndex].activeDays.some(date => {
    const existingDate = new Date(date);
    existingDate.setHours(0, 0, 0, 0);
    return existingDate.getTime() === today.getTime();
  });
  
  // Only add the date if not already logged for today
  if (!hasActiveToday) {
    team.members[memberIndex].activeDays.push(today);
    await team.save();
  }
  
  return team;
};

const Team = mongoose.model("Team", TeamSchema);
const MessageGroup = mongoose.model("MessageGroup", MessageGroupSchema);

module.exports = {
  Team,
  MessageGroup,
};
