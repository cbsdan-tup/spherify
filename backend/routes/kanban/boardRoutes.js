const express = require('express');
const router = express.Router();
const boardController = require('../../controllers/kanban/boardController');
const auth = require('../../middleware/auth');

// Get all boards for a team (will initialize if they don't exist)
router.get('/team/:teamId', auth, boardController.getBoardsByTeam);

// Force re-initialization of boards
router.post('/initialize/:teamId', auth, boardController.initializeBoards);

module.exports = router;
