const express = require('express');
const router = express.Router();
const { isAuthenticatedUser } = require('../../middleware/auth');
const { 
    getList,
    createList,
    updateList,
    deleteList
} = require('../../controllers/kanban/listController');

router.get('/getList/:id', isAuthenticatedUser, getList);
router.post('/createList', isAuthenticatedUser, createList);
router.put('/updateList/:id', isAuthenticatedUser, updateList);
router.delete('/deleteList/:id', isAuthenticatedUser, deleteList);

module.exports = router;