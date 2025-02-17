const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BoardSchema = new Schema(
  {
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    boardTitle: { type: String, required: true },
    description: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isArchived: { type: Boolean, default: false },
    background: {
      type: { type: String, enum: ['color', 'image'], default: 'color' },
      value: { type: String, default: '#FFFFFF' }
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Board', BoardSchema);