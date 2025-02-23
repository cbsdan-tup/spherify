const express = require('express');
const router = express.Router();
const { isAuthenticatedUser } = require('../../middleware/auth');
const cardController = require('../../controllers/kanban/cardController');
// const subtaskController = require('../../controllers/kanban/subtaskController');

// Card routes
router.get('/getCard/:id', isAuthenticatedUser, cardController.getCard);
router.post('/createCard', isAuthenticatedUser, cardController.createCard);
router.put('/updateCard/:id', isAuthenticatedUser, cardController.updateCard);
router.delete('/deleteCard/:id', isAuthenticatedUser, cardController.deleteCard);

// Subtask routes
// router.get('/subtask/:id', isAuthenticatedUser, subtaskController.getSubtask);
// router.post('/subtask/create', isAuthenticatedUser, subtaskController.createSubtask);
// router.put('/subtask/:id', isAuthenticatedUser, subtaskController.updateSubtask);
// router.delete('/subtask/:id', isAuthenticatedUser, subtaskController.deleteSubtask);

module.exports = router;