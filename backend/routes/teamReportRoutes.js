const express = require("express");
const router = express.Router();
const { isAuthenticatedUser, isAdmin } = require("../middleware/auth");
const {
  getTeamDetails,
  getTeamStorageUsage,
  getTeamMemberActivity,
  getTeamChatEngagement,
  getTeamBasicDetails,
  getTeamTasks,
  getTeamCollaboration,
  getTeamUserReport,
  getTeamActivityReport,
  getTeamContributionReport
} = require("../controllers/teamReportController");

// Team report routes
router.get("/getTeamDetails/:teamId", isAuthenticatedUser, getTeamDetails);
router.get("/getTeamStorageUsage/:teamId", isAuthenticatedUser, getTeamStorageUsage);
router.get("/getTeamMemberActivity/:teamId", isAuthenticatedUser, getTeamMemberActivity);
router.get("/getTeamChatEngagement/:teamId", isAuthenticatedUser, getTeamChatEngagement);
router.get('/getTeamBasicDetails/:teamId', isAuthenticatedUser, getTeamBasicDetails);
router.get('/getTeamTasks/:teamId', isAuthenticatedUser, getTeamTasks);
router.get('/getTeamCollaboration/:teamId', isAuthenticatedUser, getTeamCollaboration);

router.get('/team/:teamId/user-report', isAuthenticatedUser, getTeamUserReport);
router.get('/activity/:teamId', isAuthenticatedUser, getTeamActivityReport);
router.get('/contributions/:teamId', isAuthenticatedUser, getTeamContributionReport);

module.exports = router;
