const express = require('express');
const router = express.Router();
const { isAuthenticatedUser } = require('../../middleware/auth');
const cardController = require('../../controllers/kanban/cardController');
const subtaskController = require('../../controllers/kanban/subtaskController');

// Get card
router.get('/:id', isAuthenticatedUser, cardController.card_get);

// Create card
router.post('/create', isAuthenticatedUser, cardController.create_card_post);

// Update card
router.put('/:id', isAuthenticatedUser, cardController.update_card_put);

// Delete card
router.delete('/:id', isAuthenticatedUser, cardController.card_delete);

// Subtask routes
router.get('/subtask/:id', isAuthenticatedUser, subtaskController.subtask_get);
router.post('/subtask/create', isAuthenticatedUser, subtaskController.create_subtask_post);
router.put('/subtask/:id', isAuthenticatedUser, subtaskController.update_subtask_put);
router.delete('/subtask/:id', isAuthenticatedUser, subtaskController.subtask_delete);

module.exports = router;