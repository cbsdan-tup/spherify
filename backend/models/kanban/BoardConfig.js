const mongoose = require('mongoose');

const DEFAULT_BOARD_TYPES = ['Backlog', 'Planned', 'In Progress', 'Review', 'Completed'];

const boardConfigSchema = new mongoose.Schema({
    team: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        required: true,
        unique: true
    },
    teamName: {
        type: String,
        required: true
    },
    boardTypes: {
        type: [String],
        default: DEFAULT_BOARD_TYPES
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const BoardConfig = mongoose.model('BoardConfig', boardConfigSchema);

module.exports = { BoardConfig, DEFAULT_BOARD_TYPES };
