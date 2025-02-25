const express = require('express');
const router = express.Router();
const { isAuthenticatedUser } = require('../../middleware/auth');
const { 
    getLists,
    createList,
    updateList,
    deleteList,
    updateListPositions
} = require('../../controllers/kanban/listController');

router.get('/getLists/:teamId', isAuthenticatedUser, getLists);
router.post('/createList', isAuthenticatedUser, createList);
router.put('/updateList/:listId', isAuthenticatedUser, updateList);
router.delete('/deleteList/:listId', isAuthenticatedUser, deleteList);
router.put('/updatePositions/:teamId', isAuthenticatedUser, updateListPositions);

module.exports = router;