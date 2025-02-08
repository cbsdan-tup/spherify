const { Board } = require('../../models/kanban/Board');
const { BoardConfig, DEFAULT_BOARD_TYPES } = require('../../models/kanban/BoardConfig');
const { Team } = require('../../models/Team');

exports.getBoardsByTeam = async (req, res) => {
    try {
        const { teamId } = req.params;
        
        // Get or create board config
        let boardConfig = await BoardConfig.findOne({ team: teamId });
        if (!boardConfig) {
            const team = await Team.findById(teamId);
            if (!team) {
                return res.status(404).json({ message: 'Team not found' });
            }
            boardConfig = await BoardConfig.create({
                team: teamId,
                teamName: team.name,
                boardTypes: DEFAULT_BOARD_TYPES
            });
        }

        // Get or initialize boards
        const boards = await Board.find({ team: teamId }).sort({ order: 1 });
        if (!boards || boards.length === 0) {
            return await exports.initializeBoards(req, res);
        }
        
        res.json(boards);
    } catch (error) {
        console.error('Error fetching boards:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.initializeBoards = async (req, res) => {
    try {
        const { teamId } = req.params;
        
        // Get board config
        const boardConfig = await BoardConfig.findOne({ team: teamId });
        if (!boardConfig) {
            return res.status(404).json({ message: 'Board configuration not found' });
        }

        // Create boards based on config
        const boardPromises = boardConfig.boardTypes.map((type, index) => {
            return Board.findOneAndUpdate(
                { team: teamId, type },
                { team: teamId, type, order: index },
                { upsert: true, new: true }
            );
        });

        await Promise.all(boardPromises);
        const boards = await Board.find({ team: teamId }).sort({ order: 1 });
        res.json(boards);
    } catch (error) {
        console.error('Error initializing boards:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Helper function to ensure boards are created when a team is created
exports.ensureBoardConfig = async (teamId, teamName) => {
    try {
        const boardConfig = await BoardConfig.findOneAndUpdate(
            { team: teamId },
            { 
                team: teamId,
                teamName,
                boardTypes: DEFAULT_BOARD_TYPES 
            },
            { upsert: true, new: true }
        );

        await exports.initializeBoards({ params: { teamId } }, { json: () => {} });
        return boardConfig;
    } catch (error) {
        console.error('Error ensuring board configuration:', error);
        throw error;
    }
};
