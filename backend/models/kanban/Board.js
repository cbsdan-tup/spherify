const mongoose = require('mongoose');
const boardSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true
    },
    team: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        required: true
    },
    order: {
        type: Number,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});
boardSchema.index({ type: 1, team: 1 }, { unique: true });
const Board = mongoose.model('Board', boardSchema);
module.exports = { Board };