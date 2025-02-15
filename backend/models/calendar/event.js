const { Schema, model } = require("mongoose");

const EventSchema = Schema({
  title: {
    type: String,
    required: [true, "Title is required"],
  },
  team: {
    type: Schema.Types.ObjectId,
    ref: "Team",
    required: [true, "Team is required"],
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: [true, "User is required"],
  },
  start: {
    type: Date,
    required: [true, "Start date is required"],
  },
  end: {
    type: Date,
    required: [true, "End date is required"],
  },
  description: {
    type: String,
  },
  location: {
    type: String,
  }
});

EventSchema.methods.toJSON = function () {
  const { __v, ...event } = this.toObject();
  return event;
};

module.exports = model("Event", EventSchema);