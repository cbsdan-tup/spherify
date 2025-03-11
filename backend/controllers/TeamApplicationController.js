const TeamApplication = require("../models/TeamApplication");
const { Team } = require("../models/Team");
const mongoose = require("mongoose");

// Helper function to check if user is admin or leader in the team
const isAdminOrLeader = async (userId, teamId) => {
  try {
    const team = await Team.findById(teamId);
    if (!team) return false;

    const member = team.members.find(
      m => m.user.toString() === userId.toString() && m.leaveAt === null
    );
    
    return member && (member.isAdmin || member.role === "leader");
  } catch (error) {
    return false;
  }
};

// Create a new team application
exports.createApplication = async (req, res) => {
  try {
    const { teamId } = req.body;
    const userId = req.user._id;

    // Check if application already exists
    const existingApplication = await TeamApplication.findOne({
      team: teamId,
      applicant: userId,
      status: "pending"
    });

    if (existingApplication) {
      return res.status(400).json({ 
        success: false, 
        message: "You already have a pending application to this team" 
      });
    }

    // Check if user is already a member of the team
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: "Team not found" });
    }

    const isMember = team.members.some(
      member => member.user.toString() === userId.toString() && member.leaveAt === null
    );

    if (isMember) {
      return res.status(400).json({ 
        success: false, 
        message: "You are already a member of this team" 
      });
    }

    const application = new TeamApplication({
      team: teamId,
      applicant: userId,
      appliedAt: new Date(),
      status: "pending"
    });

    await application.save();
    res.status(201).json({ success: true, data: application });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all applications for a team
exports.getTeamApplications = async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.user._id;

    const applications = await TeamApplication.find({ team: teamId })
      .populate("applicant", "firstName lastName email avatar")
      .populate("actionTakenBy", "firstName lastName email avatar")
      .sort({ appliedAt: -1 });

    res.status(200).json({ success: true, data: applications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all applications by a user
exports.getUserApplications = async (req, res) => {
  try {
    const userId = req.user._id;

    const applications = await TeamApplication.find({ applicant: userId })
      .populate("team", "name logo description")
      .populate("actionTakenBy", "firstName lastName email avatar")
      .populate("applicant", "firstName lastName email avatar")
      .sort({ appliedAt: -1 });

    res.status(200).json({ success: true, data: applications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get a specific application
exports.getApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user._id;

    const application = await TeamApplication.findById(applicationId)
      .populate("applicant", "firstName lastName email avatar")
      .populate("team", "name logo description")
      .populate("actionTakenBy", "firstName lastName email avatar");

    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    // Check if the requester is the applicant, team admin, or team leader
    const isApplicant = application.applicant._id.toString() === userId.toString();
    const hasTeamAccess = await isAdminOrLeader(userId, application.team._id);

    if (!isApplicant && !hasTeamAccess) {
      return res.status(403).json({ 
        success: false, 
        message: "You don't have permission to view this application" 
      });
    }

    res.status(200).json({ success: true, data: application });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update application status (accept or deny)
exports.updateApplicationStatus = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status } = req.body;
    const userId = req.user._id;

    if (!["accepted", "denied", "cancelled"].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: "Status must be either 'accepted' or 'denied', or 'cancelled'" 
      });
    }

    const application = await TeamApplication.findById(applicationId);
    
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    // If already processed, don't allow changes
    if (application.status !== "pending") {
      return res.status(400).json({ 
        success: false, 
        message: "This application has already been processed" 
      });
    }

    // Update application status
    application.status = status;
    application.actionTakenBy = userId;
    application.actionTakenAt = new Date();

    await application.save();

    // If accepted, add user to the team
    if (status === "accepted") {
      const team = await Team.findById(application.team);
      
      // Check if user is already a member
      const existingMember = team.members.find(
        m => m.user.toString() === application.applicant.toString() && m.leaveAt === null
      );

      if (!existingMember) {
        team.members.push({
          user: application.applicant,
          role: "member",
          isAdmin: false,
          joinedAt: new Date(),
          joinThrough: "application"
        });
        await team.save();
      }
    }

    const updatedApplication = await TeamApplication.findById(applicationId)
      .populate("applicant", "firstName lastName email avatar")
      .populate("actionTakenBy", "firstName lastName email avatar")
      .populate("team", "name logo description");

    res.status(200).json({ success: true, data: updatedApplication });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Cancel/withdraw application (only by the applicant and only if pending)
exports.cancelApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user._id;

    const application = await TeamApplication.findById(applicationId);
    
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    // Verify it's the applicant who's cancelling
    if (application.applicant.toString() !== userId.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: "You can only cancel your own applications" 
      });
    }

    // Can only cancel pending applications
    if (application.status !== "pending") {
      return res.status(400).json({ 
        success: false, 
        message: "Only pending applications can be cancelled" 
      });
    }

    await TeamApplication.findByIdAndDelete(applicationId);

    res.status(200).json({ 
      success: true, 
      message: "Application cancelled successfully" 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete an application (admins/leaders for any application, users for their own pending applications)
exports.deleteApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user._id;

    const application = await TeamApplication.findById(applicationId);
    
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    const isAdmin = await isAdminOrLeader(userId, application.team);
    const isApplicant = application.applicant.toString() === userId.toString();
    const isPending = application.status === "pending";

    // Only allow delete if admin/leader or if it's the applicant's pending application
    if (!isAdmin && !(isApplicant && isPending)) {
      return res.status(403).json({ 
        success: false, 
        message: "You don't have permission to delete this application" 
      });
    }

    await TeamApplication.findByIdAndDelete(applicationId);

    res.status(200).json({ 
      success: true, 
      message: "Application deleted successfully" 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
