const express = require('express');
const router = express.Router();
const { isAuthenticatedUser } = require("../../middleware/auth");
const { 
    getTasks,
    createTask,
    updateTask,
    deleteTask
} = require('../../controllers/gantt/ganttController');

router.get('/getTasks/:teamId', isAuthenticatedUser, getTasks);
router.post('/createTask', isAuthenticatedUser, createTask);
router.put('/updateTask/:taskId', isAuthenticatedUser, updateTask);
router.delete('/deleteTask/:taskId', isAuthenticatedUser, deleteTask);

module.exports = router;
