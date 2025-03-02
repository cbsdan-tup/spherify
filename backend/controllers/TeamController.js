const { Team, MessageGroup } = require("../models/Team");
const cloudinary = require("cloudinary").v2;
const TeamRequest = require("../models/TeamRequest");
const moment = require("moment");
const User = require("../models/User");

exports.addTeam = async (req, res) => {
  try {
    const { name, description, createdBy, members } = req.body;

    if (!name || !createdBy) {
      return res
        .status(400)
        .json({ message: "Name and CreatedBy are required." });
    }

    let logoData = { publicId: "", url: "" };
    if (req.file) {
      try {
        const fileTypes = ["image/jpeg", "image/jpg", "image/png"];
        if (!fileTypes.includes(req.file.mimetype)) {
          return res.status(400).json({ message: "Unsupported file type!" });
        }
        const uploadResponse = await cloudinary.uploader.upload(req.file.path, {
          folder: "team_logos",
        });
        logoData = {
          publicId: uploadResponse.public_id,
          url: uploadResponse.secure_url,
        };
      } catch (error) {
        return res.status(500).json({ message: "Error uploading logo." });
      }
    }

    let parsedMembers = [];
    if (typeof members === "string") {
      try {
        parsedMembers = JSON.parse(members);
      } catch {
        return res.status(400).json({ message: "Invalid members format." });
      }
    } else if (Array.isArray(members)) {
      parsedMembers = members;
    } else {
      return res.status(400).json({ message: "Members should be an array." });
    }

    if (parsedMembers.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one member is required." });
    }

    const teamMembers = [
      {
        user: parsedMembers[0].user,
        nickname: parsedMembers[0].nickname || "",
        role: "owner",
        isAdmin: true,
        joinedAt: new Date(),
      },
    ];
    const invitedMembers = parsedMembers.slice(1);

    const newTeam = new Team({
      name,
      description,
      logo: logoData,
      members: teamMembers,
      createdBy,
    });
    const savedTeam = await newTeam.save();

    const teamRequests = invitedMembers.map(
      (member) =>
        new TeamRequest({
          team: savedTeam._id,
          inviter: createdBy,
          invitee: member.user,
        })
    );
    await TeamRequest.insertMany(teamRequests);

    res.status(201).json({
      message: "Team created successfully",
      team: savedTeam,
      teamRequests,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.getTeamByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const teams = await Team.find({
      $or: [
        { members: { $elemMatch: { user: userId, leaveAt: null } } }, // Ensures leaveAt is null
      ],
    }).populate("members.user", "fname lname email");

    res.status(200).json(teams);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.getTeamMembers = async (req, res) => {
  try {
    const { teamId } = req.params;
    
    const team = await Team.findById(teamId).populate("members.user", "firstName lastName email avatar status statusUpdatedAt");

    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    const activeMembers = team.members.filter(member => member.leaveAt === null);

    res.status(200).json({ members: activeMembers});
  } catch (error) {
    console.error("Error fetching team members:", error);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getTeamById = async (req, res) => {
  try {
    const { teamId } = req.params;

    const team = await Team.findById(teamId).populate(
      "members.user",
      "fname lname email"
    );

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    res.status(200).json(team);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.deleteTeamById = async (req, res) => {
  try {
    const { teamId } = req.params;

    if (!teamId) {
      return res.status(400).json({ message: "Team ID is required" });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    if (team.logo.logoPublicId) {
      await cloudinary.uploader.destroy(team.logo.logoPublicId);
    }

    await Team.findByIdAndDelete(teamId);
    res.status(200).json({ message: "Team deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting team", error });
  }
};

exports.leaveTeam = async (req, res) => {
  try {
    const { teamId, userId } = req.params;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found." });
    }

    const member = team.members.find((m) => m.user.toString() === userId);
    if (!member) {
      return res
        .status(404)
        .json({ message: "User is not a member of the team." });
    }

    member.leaveAt = new Date();
    await team.save();

    res.status(200).json({ message: "User has left the team successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.inviteMembers = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { members, inviter } = req.body;

    if (!members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ message: "At least one invitee is required." });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found." });
    }

    const teamRequests = members.map((member) => new TeamRequest({
      team: teamId,
      inviter,
      invitee: member.user,
    }));

    await TeamRequest.insertMany(teamRequests);

    res.status(201).json({ message: "Members invited successfully", teamRequests });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


exports.getMessageGroupInfo = async (req, res) => {
  try {
    const { messageGroupId } = req.params;

    if (!messageGroupId) {
      return res.status(400).json({ message: "MessageGroup ID is required." });
    }

    const messageGroup = await MessageGroup.findById(messageGroupId)
      .populate("team") 
      .lean(); 

    if (!messageGroup) {
      return res.status(404).json({ message: "MessageGroup not found." });
    }

    res.status(200).json({ success: true, data: messageGroup });
  } catch (error) {
    console.error("Error fetching MessageGroup info:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

exports.getTeamStatistics = async (req, res) => {
  try {
    const totalTeams = await Team.countDocuments();
    const totalActiveTeams = await Team.countDocuments({ isActive: true, isDisabled: false });
    const totalDisabledTeams = await Team.countDocuments({ isDisabled: true });

    return res.status(200).json({
      success: true,
      totalTeams,
      totalActiveTeams,
      totalDisabledTeams,
    });
  } catch (error) {
    console.error("Error fetching team statistics:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.getPastTeamsChartData = async (req, res) => {
  try {
    const past30Days = moment().subtract(30, "days").startOf("day");
    const past12Weeks = moment().subtract(12, "weeks").startOf("isoWeek");
    const past12Months = moment().subtract(12, "months").startOf("month");

    // Count teams grouped by day for the last 30 days
    const dailyTeams = await Team.aggregate([
      { $match: { createdAt: { $gte: past30Days.toDate() } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Count teams grouped by week for the last 12 weeks
    const weeklyTeams = await Team.aggregate([
      { $match: { createdAt: { $gte: past12Weeks.toDate() } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%U", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Count teams grouped by month for the last 12 months
    const monthlyTeams = await Team.aggregate([
      { $match: { createdAt: { $gte: past12Months.toDate() } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return res.status(200).json({
      success: true,
      dailyTeams,
      weeklyTeams,
      monthlyTeams,
    });
  } catch (error) {
    console.error("Error fetching team stats:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


exports.getRecentTeamAndUsers = async (req, res) => {
  try {
    const recentUsers = await User.find()
      .sort({ createdAt: -1 }) 
      .limit(10)
      .select("firstName lastName avatar email createdAt");


    const recentTeams = await Team.find()
      .sort({ createdAt: -1 }) 
      .limit(10)
      .select("logo name members isActive createdAt");

    return res.status(200).json({
      success: true,
      recentUsers,
      recentTeams,
    });
  } catch (error) {
    console.error("Error fetching recent users and teams:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getAllTeams = async (req, res) => {
  try {
    const teams = await Team.find().populate("createdBy", "avatar firstName lastName email");

    return res.status(200).json({
      success: true,
      teams,
    });
  } catch (error) {
    console.error("Error fetching teams:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.updateTeamStatus = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { isDisabled } = req.body;

    if (isDisabled === undefined) {
      return res.status(400).json({ message: "isDisabled is required." });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found." });
    }

    team.isDisabled = isDisabled;
    await team.save();

    return res.status(200).json({ message: "Team status updated successfully." });
  } catch (error) {
    console.error("Error updating team status:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

exports.fetchTeamsByName = async (req, res) => {
  try {
    const { name, userId } = req.query; 

    if (!name || !userId) {
      return res.status(400).json({ message: "Name and userId are required." });
    }

    const teams = await Team.find({
      name: { $regex: name, $options: "i" },
      members: { $elemMatch: { user: userId, leaveAt: null } },
    }).populate("members.user", "firstName lastName email avatar");

    return res.status(200).json({ success: true, teams });
  } catch (error) {
    console.error("Error fetching teams by name:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

