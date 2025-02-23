const express = require('express');
const router = express.Router();
const {isAuthenticatedUser} = require("../middleware/auth") 

const { 
    newTeamRequest,
    updateStatus,
    getPendingRequests
} = require('../controllers/TeamRequestController');

router.get('/getTeamRequests/:userId',isAuthenticatedUser, getPendingRequests);
router.post('/newTeamRequest',isAuthenticatedUser, newTeamRequest);
router.put('/updateRequestStatus/:requestId', isAuthenticatedUser, updateStatus);


module.exports = router