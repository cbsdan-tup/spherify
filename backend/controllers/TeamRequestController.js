const TeamRequest = require("../models/TeamRequest");
const { Team } = require("../models/Team");

// Create a new team request
const newTeamRequest = async (req, res) => {
  try {
    const { team, inviter, invitee } = req.body;

    // Check if a request already exists
    const existingRequest = await TeamRequest.findOne({
      team,
      inviter,
      invitee,
    });
    if (existingRequest) {
      return res.status(400).json({ message: "A request already exists." });
    }

    const teamRequest = new TeamRequest({ team, inviter, invitee });
    await teamRequest.save();

    res
      .status(201)
      .json({ message: "Team request created successfully", teamRequest });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update request status
const updateStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body;

    const teamRequest = await TeamRequest.findById(requestId);
    if (!teamRequest) {
      return res.status(404).json({ message: "Request not found." });
    }

    teamRequest.status = status;
    await teamRequest.save();

    // If the request is accepted, add the invitee to the team members
    if (status === "accepted") {
      const team = await Team.findById(teamRequest.team);
      if (!team) {
        return res.status(404).json({ message: "Team not found." });
      }

      team.members.push({
        user: teamRequest.invitee,
        nickname: "",
        role: "member",
        isAdmin: false,
        joinedAt: new Date(),
      });
      await team.save();
    }

    res
      .status(200)
      .json({ message: "Request status updated successfully", teamRequest });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getPendingRequests = async (req, res) => {
  try {
    const { userId } = req.params;
    const pendingRequests = await TeamRequest.find({
      invitee: userId,
      status: "pending",
    }).populate("team inviter");

    res
      .status(200)
      .json({
        message: "Pending requests retrieved successfully",
        pendingRequests,
      });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { newTeamRequest, updateStatus, getPendingRequests };
