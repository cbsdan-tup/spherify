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
    getTeamStatistics,
    getPastTeamsChartData,
    getRecentTeamAndUsers,
    getAllTeams,
    updateTeamStatus,
    fetchTeamsByName,
    updateTeamMember,
    removeTeamMember,
    getUserChatStatistics,
    updateTeam,
    getTeamConfiguration,
    updateTeamConfiguration,
    getUserTeams,
    checkTeamMembership
} = require('../controllers/TeamController');

router.post('/addTeam', upload.single('logo'), addTeam);
router.get('/getTeamByUser/:userId', getTeamByUser);
router.get('/getTeamById/:teamId', getTeamById);
router.get('/getMessageGroupInfo/:messageGroupId', isAuthenticatedUser, getMessageGroupInfo);
router.get('/getTeamMembers/:teamId', isAuthenticatedUser, getTeamMembers);
router.delete('/deleteTeam/:teamId', isAuthenticatedUser, deleteTeamById);
router.post('/leaveTeam/:teamId/:userId', isAuthenticatedUser, leaveTeam);
router.post('/inviteMembers/:teamId', isAuthenticatedUser, inviteMembers);
router.get('/getTeamStatistics', isAdmin, getTeamStatistics);
router.get('/getPastTeamsChartData', isAdmin, getPastTeamsChartData);
router.get('/getRecentTeamAndUsers', isAdmin, getRecentTeamAndUsers);
router.get('/getAllTeams', isAdmin, getAllTeams);
router.put('/updateTeamStatus/:teamId', isAdmin, updateTeamStatus);
router.get('/fetchTeamsByName', isAuthenticatedUser, fetchTeamsByName)

// Add new routes for team member management
router.put('/updateTeamMember/:teamId/:userId', isAuthenticatedUser, updateTeamMember);
router.delete('/removeTeamMember/:teamId/:userId', isAuthenticatedUser, removeTeamMember);

// Add new route for user chat statistics
router.get('/getUserChatStatistics/:userId', isAuthenticatedUser, getUserChatStatistics);

// Add new route for updating team information (logo or name)
router.put('/updateTeam/:teamId', isAuthenticatedUser, upload.single('logo'), updateTeam);

// Team configuration routes
router.get('/getTeamConfiguration/:teamId', isAuthenticatedUser, getTeamConfiguration);
router.put('/updateTeamConfiguration/:teamId', isAuthenticatedUser, updateTeamConfiguration);

// Get all teams a user is member of
router.get('/getUserTeams/:userId', isAuthenticatedUser, getUserTeams);

// Add new route to check team membership
router.get('/checkTeamMembership/:teamId', isAuthenticatedUser, checkTeamMembership);

module.exports = router