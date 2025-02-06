const express = require('express');
const router = express.Router();
const { isAuthenticatedUser } = require("../middleware/auth");

const {
    createMessageGroup,
    getMessageGroupsByTeam,
    editMessageGroup,
    deleteMessageGroup
} = require('../controllers/MessageController');


router.get('/getMessageGroups/:teamId', isAuthenticatedUser, getMessageGroupsByTeam);
router.post('/createMessageGroup', createMessageGroup);
router.put('/editMessageGroup/:messageGroupId', isAuthenticatedUser, editMessageGroup);
router.delete('/deleteMessageGroup/:messageGroupId', isAuthenticatedUser, deleteMessageGroup);

module.exports = router