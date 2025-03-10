const express = require("express");
const router = express.Router();
const { isAuthenticatedUser } = require("../middleware/auth");
const {
    createApplication,
    getTeamApplications,
    getUserApplications,
    getApplication,
    updateApplicationStatus,
    cancelApplication,
    deleteApplication
} = require("../controllers/TeamApplicationController");

// Create and manage applications
router.post("/createApplication", isAuthenticatedUser, createApplication);
router.get("/getTeamApplications/:teamId", isAuthenticatedUser, getTeamApplications);
router.get("/getUserApplications", isAuthenticatedUser, getUserApplications);
router.get("/getApplication/:applicationId", isAuthenticatedUser, getApplication);
router.patch("/updateApplicationStatus/:applicationId", isAuthenticatedUser, updateApplicationStatus);
router.delete("/cancelApplication/:applicationId/cancel", isAuthenticatedUser, cancelApplication);
router.delete("/deleteApplication/:applicationId", isAuthenticatedUser, deleteApplication);

module.exports = router;
