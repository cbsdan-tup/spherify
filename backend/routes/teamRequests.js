const express = require('express');
const router = express.Router();
const {isAuthenticatedUser} = require("../middleware/auth") 

const { 
    newTeamRequest,
    updateStatus,
    getPendingRequests,
    getTeamRequestHistory,
    getPastTeamRequests
} = require('../controllers/TeamRequestController');

router.get('/getTeamRequests/:userId',isAuthenticatedUser, getPendingRequests);
router.post('/newTeamRequest',isAuthenticatedUser, newTeamRequest);
router.put('/updateRequestStatus/:requestId', isAuthenticatedUser, updateStatus);
router.get('/getTeamRequestHistory/:teamId',isAuthenticatedUser, getTeamRequestHistory);

router.get('/getPastTeamRequests/:userId', isAuthenticatedUser, getPastTeamRequests);

module.exports = router