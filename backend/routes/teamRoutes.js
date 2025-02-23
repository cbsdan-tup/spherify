const express = require('express');
const router = express.Router();
const upload = require("../utils/multer");
const {isAuthenticatedUser} = require("../middleware/auth") 

const { 
    addTeam,
    getTeamByUser,
    getTeamById,
    getTeamMembers,
    deleteTeamById,
    leaveTeam,
    inviteMembers
} = require('../controllers/TeamController');

router.post('/addTeam', upload.single('logo'), addTeam);
router.get('/getTeamByUser/:userId', getTeamByUser);
router.get('/getTeamById/:teamId', getTeamById);
router.get('/getTeamMembers/:teamId', isAuthenticatedUser, getTeamMembers);
router.delete('/deleteTeam/:teamId', isAuthenticatedUser, deleteTeamById);
router.post('/leaveTeam/:teamId/:userId', isAuthenticatedUser, leaveTeam);
router.post('/inviteMembers/:teamId', isAuthenticatedUser, inviteMembers);

module.exports = router