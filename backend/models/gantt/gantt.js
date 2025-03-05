const mongoose = require('mongoose');

const GanttTaskSchema = new mongoose.Schema({
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  color: {
    type: String,
    default: '#007bff', // Default blue color
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please use a valid hex color']
  },
  colorLabel: {
    type: String,
    trim: true,
    default: 'Default'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('GanttTask', GanttTaskSchema);
