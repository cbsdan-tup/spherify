const express = require('express');
const router = express.Router();
const { isAuthenticatedUser } = require('../../middleware/auth');
const { 
    get_user_boards,
    get_team_boards,
    board_get,
    create_board_post,
    update_board_patch,
    board_delete
} = require('../../controllers/kanban/boardController');

// Get boards
router.get('/userBoards', isAuthenticatedUser, get_user_boards);
router.get('/teamBoards/:teamId', isAuthenticatedUser, get_team_boards);
router.get('/:id', isAuthenticatedUser, board_get);

// Create board
router.post('/create', isAuthenticatedUser, create_board_post);

// Update board
router.patch('/:id', isAuthenticatedUser, update_board_patch);

// Delete board
router.delete('/:id', isAuthenticatedUser, board_delete);

module.exports = router;