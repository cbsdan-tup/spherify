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
    }).populate("members.user", "fname lname email").populate("createdBy", "firstName lastName email avatar");

    res.status(200).json(teams);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.getTeamMembers = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { search } = req.query;
    
    const team = await Team.findById(teamId).populate("members.user", "firstName lastName email avatar status statusUpdatedAt");

    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    // Filter for active members (leaveAt is null)
    let activeMembers = team.members.filter(member => member.leaveAt === null);
    
    // Apply search filter if provided
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search, 'i');
      activeMembers = activeMembers.filter(member => {
        const user = member.user;
        return (
          searchRegex.test(user.firstName) || 
          searchRegex.test(user.lastName) || 
          searchRegex.test(user.email) || 
          searchRegex.test(member.nickname) || 
          searchRegex.test(member.role)
        );
      });
    }

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
    ).populate("createdBy", "firstName lastName email avatar");

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

    const memberIndex = team.members.findIndex((m) => m.user.toString() === userId);
    if (memberIndex === -1) {
      return res
        .status(404)
        .json({ message: "User is not a member of the team." });
    }

    // Check if the user leaving is an owner
    if (team.members[memberIndex].role === "owner") {
      // Find active members (excluding the leaving member)
      const activeMembers = team.members.filter(
        (m) => m.user.toString() !== userId && m.leaveAt === null
      );
      
      if (activeMembers.length > 0) {
        // Sort active members by joinedAt (earliest first) to get the most senior member
        activeMembers.sort((a, b) => a.joinedAt - b.joinedAt);
        
        // Make the most senior member the new owner
        const newOwnerIndex = team.members.findIndex(
          (m) => m.user.toString() === activeMembers[0].user.toString()
        );
        
        team.members[newOwnerIndex].role = "owner";
        team.members[newOwnerIndex].isAdmin = true;
        
        // Make all other active members admins
        team.members.forEach((m, idx) => {
          if (m.leaveAt === null && m.user.toString() !== userId) {
            team.members[idx].isAdmin = true;
          }
        });
      }
    }

    team.members[memberIndex].leaveAt = new Date();
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

exports.updateTeamMember = async (req, res) => {
  try {
    const { teamId, userId } = req.params;
    const { nickname, role, isAdmin } = req.body;
    
    // Validate the team exists
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }
    
    // Find the requesting user in the team to check permissions
    const requestingUser = team.members.find(
      member => member.user.toString() === req.user._id.toString()
    );
    
    if (!requestingUser) {
      return res.status(403).json({ message: "You are not a member of this team" });
    }
    
    // Check if requesting user has permission (must be admin or owner)
    if (!requestingUser.isAdmin && requestingUser.role !== "owner") {
      return res.status(403).json({ message: "You don't have permission to update members" });
    }
    
    // Find the member to update
    const memberIndex = team.members.findIndex(
      member => member.user.toString() === userId
    );
    
    if (memberIndex === -1) {
      return res.status(404).json({ message: "Member not found in this team" });
    }
    
    // Special restriction: Only owner can update another owner's role
    if (
      team.members[memberIndex].role === "owner" && 
      requestingUser.role !== "owner"
    ) {
      return res.status(403).json({ message: "Only team owner can modify another owner's role" });
    }
    
    // Update member info
    if (nickname !== undefined) team.members[memberIndex].nickname = nickname;
    
    // Only update role and admin status if allowed (owner can change anything)
    if (requestingUser.role === "owner" || team.members[memberIndex].role !== "owner") {
      if (role !== undefined) team.members[memberIndex].role = role;
      if (isAdmin !== undefined) team.members[memberIndex].isAdmin = isAdmin;
    }
    
    await team.save();
    
    res.status(200).json({ 
      success: true,
      message: "Member updated successfully",
      updatedMember: team.members[memberIndex]
    });
    
  } catch (error) {
    console.error("Error updating team member:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Remove member from team
exports.removeTeamMember = async (req, res) => {
  try {
    const { teamId, userId } = req.params;
    
    // Validate the team exists
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }
    
    // Find requesting user in the team to check permissions
    const requestingUser = team.members.find(
      member => member.user.toString() === req.user._id.toString()
    );
    
    if (!requestingUser) {
      return res.status(403).json({ message: "You are not a member of this team" });
    }
    
    // Check if requesting user has permission (must be admin or owner)
    if (!requestingUser.isAdmin && requestingUser.role !== "owner") {
      return res.status(403).json({ message: "You don't have permission to remove members" });
    }
    
    // Find the member to remove
    const memberIndex = team.members.findIndex(
      member => member.user.toString() === userId
    );
    
    if (memberIndex === -1) {
      return res.status(404).json({ message: "Member not found in this team" });
    }
    
    // Cannot remove an owner unless you are also an owner
    if (team.members[memberIndex].role === "owner" && requestingUser.role !== "owner") {
      return res.status(403).json({ message: "Only team owner can remove another owner" });
    }
    
    // Set leaveAt date rather than removing completely
    team.members[memberIndex].leaveAt = new Date();
    
    await team.save();
    
    res.status(200).json({ 
      success: true,
      message: "Member removed successfully" 
    });
    
  } catch (error) {
    console.error("Error removing team member:", error);
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
    }).populate("members.user", "firstName lastName email avatar").populate("createdBy", "firstName lastName email avatar");

    return res.status(200).json({ success: true, teams });
  } catch (error) {
    console.error("Error fetching teams by name:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getUserChatStatistics = async (req, res) => {
  try {
    const { userId } = req.params;
    const pastMonth = moment().subtract(1, 'month').toDate();
    
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    console.log("Fetching chat stats for user:", userId);
    console.log("From date:", pastMonth);
    
    // Convert userId to MongoDB ObjectId explicitly
    const mongoose = require('mongoose');
    let userObjectId;
    
    try {
      userObjectId = new mongoose.Types.ObjectId(userId);
    } catch (err) {
      console.error("Invalid userId format:", err);
      return res.status(400).json({ 
        success: false, 
        message: "Invalid user ID format" 
      });
    }
    
    const messageGroupCount = await MessageGroup.countDocuments();
    console.log("Total message groups in system:", messageGroupCount);
    
    const result = await MessageGroup.aggregate([
      // Unwind messages array to work with individual messages
      { $unwind: "$messages" },
      // Match messages from target user within timeframe
      { 
        $match: {
          "messages.sender": userObjectId,
          "messages.createdAt": { $gte: pastMonth }
        }
      },
      // Group by date and count
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$messages.createdAt" } },
          count: { $sum: 1 }
        }
      },
      // Sort by date
      { $sort: { _id: 1 } }
    ]);
    
    console.log("Raw aggregation result:", result);
    
    // Convert to chart-friendly format with all days included
    const chartData = [];
    const today = moment().format('YYYY-MM-DD');
    const monthAgo = moment(pastMonth).format('YYYY-MM-DD');
    
    // Create a map of dates with counts
    const dataMap = {};
    result.forEach(item => {
      dataMap[item._id] = item.count;
    });
    
    // Fill in all days in the range
    for (let m = moment(monthAgo); m.isSameOrBefore(today); m.add(1, 'days')) {
      const dateStr = m.format('YYYY-MM-DD');
      chartData.push({
        date: dateStr,
        count: dataMap[dateStr] || 0
      });
    }
    
    // Calculate total messages
    const totalMessages = result.reduce((sum, item) => sum + item.count, 0);
    
    // Also run a simple count query as a sanity check
    const countCheck = await MessageGroup.aggregate([
      { $unwind: "$messages" },
      { 
        $match: {
          "messages.sender": userObjectId,
          "messages.createdAt": { $gte: pastMonth }
        }
      },
      { $count: "total" }
    ]);
    
    const verifiedTotal = countCheck.length > 0 ? countCheck[0].total : 0;
    console.log("Verified total messages:", verifiedTotal);
    console.log("Calculated total messages:", totalMessages);
    
    if (totalMessages !== verifiedTotal) {
      console.warn("Total message count mismatch!");
    }
    
    res.status(200).json({
      success: true,
      totalMessages,
      chartData
    });
  } catch (error) {
    console.error("Error fetching user chat statistics:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

exports.updateTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { name } = req.body;
    
    // Find the team
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ 
        success: false, 
        message: "Team not found" 
      });
    }
    
    // Find the requesting user in team members
    const requestingUser = team.members.find(
      member => 
        member.user.toString() === req.user._id.toString() && 
        member.leaveAt === null
    );
    
    // Check if user has permission (owner, admin or moderator)
    if (!requestingUser) {
      return res.status(403).json({ 
        success: false, 
        message: "You are not a member of this team" 
      });
    }
    
    if (!requestingUser.isAdmin && 
        requestingUser.role !== "owner" && 
        requestingUser.role !== "moderator") {
      return res.status(403).json({ 
        success: false, 
        message: "You don't have permission to update this team" 
      });
    }
    
    const updateData = {};
    
    // Handle team name update if provided
    if (name && name.trim() !== '') {
      updateData.name = name.trim();
    }
    
    // Handle logo upload if file is provided
    if (req.file) {
      try {
        const fileTypes = ["image/jpeg", "image/jpg", "image/png"];
        if (!fileTypes.includes(req.file.mimetype)) {
          return res.status(400).json({ 
            success: false, 
            message: "Unsupported file type! Please use JPEG, JPG, or PNG." 
          });
        }
        
        // Delete old logo if exists
        if (team.logo.publicId) {
          await cloudinary.uploader.destroy(team.logo.publicId);
        }
        
        // Upload new logo
        const uploadResponse = await cloudinary.uploader.upload(req.file.path, {
          folder: "team_logos"
        });
        
        updateData.logo = {
          publicId: uploadResponse.public_id,
          url: uploadResponse.secure_url
        };
      } catch (error) {
        console.error("Error uploading logo:", error);
        return res.status(500).json({ 
          success: false, 
          message: "Error uploading logo",
          error: error.message 
        });
      }
    }
    
    // Update team with new data
    const updatedTeam = await Team.findByIdAndUpdate(
      teamId,
      { $set: updateData },
      { new: true }
    );
    
    res.status(200).json({
      success: true,
      message: "Team updated successfully",
      team: updatedTeam
    });
    
  } catch (error) {
    console.error("Error updating team:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

