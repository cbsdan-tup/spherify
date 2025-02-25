const express = require('express');
const router = express.Router();
const { isAuthenticatedUser } = require('../../middleware/auth');
const { 
    getBoards,
    getBoardsByTeam,
    getBoard,
    createBoard,
    updateBoard,
    deleteBoard
} = require('../../controllers/kanban/boardController');

router.get('/getBoards', isAuthenticatedUser, getBoards);
router.get('/getBoardsByTeam/:teamId', isAuthenticatedUser, getBoardsByTeam);
router.get('/getBoard/:boardId', isAuthenticatedUser, getBoard);
router.post('/createBoard', isAuthenticatedUser, createBoard);
router.put('/updateBoard/:boardId', isAuthenticatedUser, updateBoard);
router.delete('/deleteBoard/:boardId', isAuthenticatedUser, deleteBoard);

module.exports = router;