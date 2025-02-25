const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CardSchema = new Schema(
  {
    cardTitle: { type: String, required: true },
    description: { type: String },
    dueDate: { type: Date },
    position: { type: Number, required: true },
    priority: { 
      type: String, 
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'low' 
    },
    labels: [{
      name: { type: String },
      color: { type: String }
    }],
    attachments: [{
      name: { type: String },
      url: { type: String },
      addedAt: { type: Date, default: Date.now }
    }],
    assignedTo: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    listId: { type: Schema.Types.ObjectId, ref: 'List', required: true },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isArchived: { type: Boolean, default: false }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Card', CardSchema);