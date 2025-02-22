const express = require('express');
const router = express.Router();
const { isAuthenticatedUser } = require('../../middleware/auth');
const {
    list_get,
    create_list_post,
    update_list_put,
    list_delete
} = require('../../controllers/kanban/listController');

// Get list
router.get('/:id', isAuthenticatedUser, list_get);

// Create list
router.post('/create', isAuthenticatedUser, create_list_post);

// Update list
router.put('/:id', isAuthenticatedUser, update_list_put);

// Delete list
router.delete('/:id', isAuthenticatedUser, list_delete);

module.exports = router;