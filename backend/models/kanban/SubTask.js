const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SubTaskSchema = new Schema(
  {
    taskName: { type: String, required: true },
    description: { type: String },
    isDone: { type: Boolean, default: false },
    position: { type: Number, required: true },
    dueDate: { type: Date },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    cardId: { type: Schema.Types.ObjectId, ref: 'Card', required: true },
    boardId: { type: Schema.Types.ObjectId, ref: 'Board', required: true },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('SubTask', SubTaskSchema);