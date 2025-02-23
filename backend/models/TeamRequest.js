const mongoose = require("mongoose");

const TeamRequestSchema = new mongoose.Schema({
  team: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
  inviter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  invitee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  invitedAt: { type: Date, default: Date.now },
  status: { 
    type: String, 
    enum: ["accepted", "denied", "pending"], 
    default: "pending",
    validate: {
      validator: function(v) {
        return ["accepted", "denied", "pending"].includes(v);
      },
      message: props => `${props.value} is not a valid status.`
    }
  }
});

module.exports = mongoose.model("TeamRequest", TeamRequestSchema);

