const express = require('express');
const router = express.Router();
const upload = require("../utils/multer");
const {isAuthenticatedUser, isAdmin} = require("../middleware/auth") 

const { 
    addTeam,
    getTeamByUser,
    getTeamById,
    getTeamMembers,
    deleteTeamById,
    leaveTeam,
    inviteMembers,
    getMessageGroupInfo,
    getTeamStatistics
} = require('../controllers/TeamController');

router.post('/addTeam', upload.single('logo'), addTeam);
router.get('/getTeamByUser/:userId', getTeamByUser);
router.get('/getTeamById/:teamId', getTeamById);
router.get('/getTeamStatistics', isAdmin, getTeamStatistics);
router.get('/getMessageGroupInfo/:messageGroupId', isAuthenticatedUser, getMessageGroupInfo);
router.get('/getTeamMembers/:teamId', isAuthenticatedUser, getTeamMembers);
router.delete('/deleteTeam/:teamId', isAuthenticatedUser, deleteTeamById);
router.post('/leaveTeam/:teamId/:userId', isAuthenticatedUser, leaveTeam);
router.post('/inviteMembers/:teamId', isAuthenticatedUser, inviteMembers);

module.exports = router