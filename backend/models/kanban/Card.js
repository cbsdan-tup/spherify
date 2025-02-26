const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CardSchema = new Schema(
  {
    cardTitle: { type: String, required: true },
    description: { type: String, default: '' },
    position: { type: Number, required: true },
    checklist: [{
      item: { type: String },
      isCompleted: { type: Boolean, default: false }
    }],
    priority: { 
      type: String, 
      enum: ['low', 'medium', 'high'],
      default: 'low' 
    },
    assignedTo: [{ 
      type: Schema.Types.ObjectId, 
      ref: 'User' 
    }],
    listId: { type: Schema.Types.ObjectId, ref: 'List', required: true },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true }
  },
  {
    timestamps: true
  }
);

// Add index for faster querying
CardSchema.index({ teamId: 1, listId: 1, position: 1 });

module.exports = mongoose.model('Card', CardSchema);