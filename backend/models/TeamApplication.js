const mongoose = require("mongoose");

const TeamApplicationSchema = new mongoose.Schema({
  team: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
  applicant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  actionTakenBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  appliedAt: { type: Date, default: Date.now },
  actionTakenAt: { type: Date },
  status: { 
    type: String, 
    enum: ["accepted", "denied", "pending", "cancelled"], 
    default: "pending",
    validate: {
      validator: function(v) {
        return ["accepted", "denied", "pending", "cancelled"].includes(v);
      },
      message: props => `${props.value} is not a valid status.`
    }
  }
});

module.exports = mongoose.model("TeamApplication", TeamApplicationSchema);
