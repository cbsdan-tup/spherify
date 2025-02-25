const express = require('express');
const router = express.Router();
const { isAuthenticatedUser } = require('../../middleware/auth');
const { 
    getSubtask,
    createSubtask,
    updateSubtask,
    deleteSubtask
} = require('../../controllers/kanban/subtaskController');

router.get('/getSubtask/:id', isAuthenticatedUser, getSubtask);
router.post('/createSubtask', isAuthenticatedUser, createSubtask);
router.put('/updateSubtask/:id', isAuthenticatedUser, updateSubtask);
router.delete('/deleteSubtask/:id', isAuthenticatedUser, deleteSubtask);

module.exports = router;
