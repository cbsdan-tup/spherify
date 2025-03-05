const express = require('express');
const router = express.Router();
const { isAdmin } = require('../middleware/auth');
const { 
  getTeamDetails, 
  getTeamStorageUsage, 
  getTeamMemberActivity, 
  getTeamChatEngagement 
} = require('../controllers/teamReportController');

// Team report routes - secure with admin middleware
router.get('/getTeamDetails/:teamId', isAdmin, getTeamDetails);
router.get('/getTeamStorageUsage/:teamId', isAdmin, getTeamStorageUsage);
router.get('/getTeamMemberActivity/:teamId', isAdmin, getTeamMemberActivity);
router.get('/getTeamChatEngagement/:teamId', isAdmin, getTeamChatEngagement);

module.exports = router;
