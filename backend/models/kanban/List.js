const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ListSchema = new Schema(
  {
    listTitle: { type: String, required: true },
    position: { type: Number, required: true },
    boardId: { type: Schema.Types.ObjectId, ref: 'Board', required: true },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isArchived: { type: Boolean, default: false }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('List', ListSchema);