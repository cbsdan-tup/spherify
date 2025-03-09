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
        role: "leader",
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
    }).populate("members.user", "firstName lastName email").populate("createdBy", "firstName lastName email avatar");

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

    // Check if the user leaving is an leader
    if (team.members[memberIndex].role === "leader") {
      // Find active members (excluding the leaving member)
      const activeMembers = team.members.filter(
        (m) => m.user.toString() !== userId && m.leaveAt === null
      );
      
      if (activeMembers.length > 0) {
        // Sort active members by joinedAt (earliest first) to get the most senior member
        activeMembers.sort((a, b) => a.joinedAt - b.joinedAt);
        
        // Make the most senior member the new leader
        const newLeaderIndex = team.members.findIndex(
          (m) => m.user.toString() === activeMembers[0].user.toString()
        );
        
        team.members[newLeaderIndex].role = "leader";
        team.members[newLeaderIndex].isAdmin = true;
        
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
    
    // Check if requesting user has permission (must be admin or leader)
    if (!requestingUser.isAdmin && requestingUser.role !== "leader") {
      return res.status(403).json({ message: "You don't have permission to update members" });
    }
    
    // Find the member to update
    const memberIndex = team.members.findIndex(
      member => member.user.toString() === userId
    );
    
    if (memberIndex === -1) {
      return res.status(404).json({ message: "Member not found in this team" });
    }
    
    // Special restriction: Only leader can update another leader's role
    if (
      team.members[memberIndex].role === "leader" && 
      requestingUser.role !== "leader"
    ) {
      return res.status(403).json({ message: "Only team leader can modify another leader's role" });
    }
    
    // Update member info
    if (nickname !== undefined) team.members[memberIndex].nickname = nickname;
    
    // Only update role and admin status if allowed (leader can change anything)
    if (requestingUser.role === "leader" || team.members[memberIndex].role !== "leader") {
      if (role !== undefined) {
        // If setting this member as leader
        if (role === "leader" && team.members[memberIndex].role !== "leader") {
          // Find current leader and demote them
          const currentLeaderIndex = team.members.findIndex(
            member => member.role === "leader" && member.leaveAt === null && member.user.toString() !== userId
          );
          
          if (currentLeaderIndex !== -1) {
            // Demote current leader to moderator but keep them as admin
            team.members[currentLeaderIndex].role = "moderator";
            team.members[currentLeaderIndex].isAdmin = true;
          }
          
          // Set new leader
          team.members[memberIndex].role = "leader";
          team.members[memberIndex].isAdmin = true;
        } else {
          team.members[memberIndex].role = role;
          // If role is being set to "leader", ensure isAdmin is true
          if (role === "leader") {
            team.members[memberIndex].isAdmin = true;
          } else if (isAdmin !== undefined) {
            team.members[memberIndex].isAdmin = isAdmin;
          }
        }
      } else if (isAdmin !== undefined) {
        team.members[memberIndex].isAdmin = isAdmin;
      }
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
    
    // Check if requesting user has permission (must be admin or leader)
    if (!requestingUser.isAdmin && requestingUser.role !== "leader") {
      return res.status(403).json({ message: "You don't have permission to remove members" });
    }
    
    // Find the member to remove
    const memberIndex = team.members.findIndex(
      member => member.user.toString() === userId
    );
    
    if (memberIndex === -1) {
      return res.status(404).json({ message: "Member not found in this team" });
    }
    
    // Cannot remove an leader unless you are also an leader
    if (team.members[memberIndex].role === "leader" && requestingUser.role !== "leader") {
      return res.status(403).json({ message: "Only team leader can remove another leader" });
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
      .select("logo name members isActive createdAt createdBy").populate("createdBy");

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
    
    // Check if user has permission (leader, admin or moderator)
    if (!requestingUser) {
      return res.status(403).json({ 
        success: false, 
        message: "You are not a member of this team" 
      });
    }
    
    if (!requestingUser.isAdmin && 
        requestingUser.role !== "leader" && 
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

exports.getTeamChatAnalytics = async (req, res) => {
  try {
    const { teamId } = req.params;
    const days = parseInt(req.query.days) || 30;
    const startDate = moment().subtract(days, 'days').startOf('day').toDate();
    
    const team = await Team.findById(teamId)
      .populate('messageGroups');
    
    if (!team) {
      return res.status(404).json({ 
        success: false, 
        message: 'Team not found' 
      });
    }
    
    // Get all message groups for the team
    const messageGroupIds = team.messageGroups.map(group => group._id);
    const messageGroups = await MessageGroup.find({
      _id: { $in: messageGroupIds }
    });
    
    // Prepare daily message counts
    const dailyMessages = [];
    const messagesByMember = {};
    const messagesByHour = Array(24).fill(0);
    
    // Generate all dates in the range for consistent chart data
    for (let i = 0; i <= days; i++) {
      const date = moment(startDate).add(i, 'days').format('YYYY-MM-DD');
      dailyMessages.push({
        date: date,
        count: 0
      });
    }
    
    // Process all messages from all groups
    messageGroups.forEach(group => {
      group.messages.forEach(message => {
        if (message.createdAt >= startDate) {
          // Increment daily count
          const messageDate = moment(message.createdAt).format('YYYY-MM-DD');
          const dayIndex = dailyMessages.findIndex(day => day.date === messageDate);
          if (dayIndex !== -1) {
            dailyMessages[dayIndex].count++;
          }
          
          // Track messages by member
          const senderId = message.sender.toString();
          if (!messagesByMember[senderId]) {
            messagesByMember[senderId] = 0;
          }
          messagesByMember[senderId]++;
          
          // Track messages by hour
          const hour = moment(message.createdAt).hour();
          messagesByHour[hour]++;
        }
      });
    });
    
    // Get top members by message count
    const topMemberIds = Object.keys(messagesByMember)
      .sort((a, b) => messagesByMember[b] - messagesByMember[a])
      .slice(0, 5);
    
    const totalMessages = Object.values(messagesByMember).reduce((sum, count) => sum + count, 0);
    
    // Get user details for top members
    const users = await User.find({
      _id: { $in: topMemberIds }
    }).select('firstName lastName email');
    
    const topMembers = topMemberIds.map(userId => {
      const user = users.find(u => u._id.toString() === userId);
      return {
        userId,
        name: user ? `${user.firstName} ${user.lastName}` : 'Unknown User',
        messageCount: messagesByMember[userId],
        engagementPercentage: Math.round((messagesByMember[userId] / totalMessages) * 100)
      };
    });
    
    // Format hours data
    const activeHours = messagesByHour
      .map((count, hour) => ({
        hour,
        hourFormatted: moment().hour(hour).format('h A'),
        count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    res.status(200).json({
      success: true,
      dailyMessages,
      topMembers,
      activeHours,
      totalMessages
    });
    
  } catch (error) {
    console.error('Error fetching team chat analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

exports.getTeamMemberActivity = async (req, res) => {
  try {
    const { teamId } = req.params;
    const days = parseInt(req.query.days) || 30;
    const startDate = moment().subtract(days, 'days').startOf('day').toDate();
    
    const team = await Team.findById(teamId)
      .populate('members.user', 'firstName lastName email avatar');
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    
    // Filter only active members (leaveAt is null)
    const activeMembers = team.members.filter(member => member.leaveAt === null);
    
    // Process member activity data
    const members = activeMembers.map(member => {
      const activeDays = member.activeDays.filter(day => day >= startDate);
      
      return {
        id: member.user._id,
        name: `${member.user.firstName} ${member.user.lastName}`,
        avatar: member.user.avatar,
        role: member.role,
        isAdmin: member.isAdmin,
        joinedAt: member.joinedAt,
        nickname: member.nickname || '',
        activeDaysCount: activeDays.length,
        lastActivity: activeDays.length > 0 ? 
          new Date(Math.max(...activeDays.map(d => d.getTime()))) : 
          member.joinedAt
      };
    });
    
    res.status(200).json({
      success: true,
      members
    });
    
  } catch (error) {
    console.error('Error fetching team member activity:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

exports.getTeamRequestHistory = async (req, res) => {
  try {
    const { teamId } = req.params;
    
    // Verify the team exists
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    
    // Get all team requests for this team
    const teamRequests = await TeamRequest.find({ team: teamId })
      .populate('inviter', 'firstName lastName email')
      .populate('invitee', 'firstName lastName email')
      .sort({ createdAt: -1 });
    
    // Count by status
    const accepted = teamRequests.filter(req => req.status === 'accepted').length;
    const pending = teamRequests.filter(req => req.status === 'pending').length;
    const declined = teamRequests.filter(req => req.status === 'declined').length;
    
    // Format request data
    const requests = teamRequests.map(request => ({
      id: request._id,
      inviterName: `${request.inviter.firstName} ${request.inviter.lastName}`,
      inviteeName: `${request.invitee.firstName} ${request.invitee.lastName}`,
      status: request.status,
      invitedAt: request.invitedAt,
    }));
    
    res.status(200).json({
      success: true,
      accepted,
      pending,
      declined,
      requests
    });
    
  } catch (error) {
    console.error('Error fetching team request history:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

exports.getTeamConfiguration = async (req, res) => {
  try {
    const { teamId } = req.params;
    
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ 
        success: false, 
        message: "Team not found" 
      });
    }
    
    res.status(200).json({
      success: true,
      configuration: team.teamConfiguration
    });
  } catch (error) {
    console.error("Error getting team configuration:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

exports.updateTeamConfiguration = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { configuration } = req.body;
    
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
    
    // Check if user has permission (must be leader or admin)
    if (!requestingUser) {
      return res.status(403).json({ 
        success: false, 
        message: "You are not a member of this team" 
      });
    }
    
    if (!requestingUser.isAdmin && requestingUser.role !== "leader") {
      return res.status(403).json({ 
        success: false, 
        message: "You don't have permission to update team configuration" 
      });
    }
    
    // Update specific configuration properties if they exist
    if (configuration) {
      if (configuration.AllowedRoleToModifyFiles) {
        team.teamConfiguration.AllowedRoleToModifyFiles = configuration.AllowedRoleToModifyFiles;
      }
      if (configuration.AllowedRoleToModifyKanban) {
        team.teamConfiguration.AllowedRoleToModifyKanban = configuration.AllowedRoleToModifyKanban;
      }
      if (configuration.AllowedRoleToModifyGantt) {
        team.teamConfiguration.AllowedRoleToModifyGantt = configuration.AllowedRoleToModifyGantt;
      }
      if (configuration.AllowedRoleToCreateGroupMessage) {
        team.teamConfiguration.AllowedRoleToCreateGroupMessage = configuration.AllowedRoleToCreateGroupMessage;
      }
      if (configuration.AllowedRoleToModifyCalendar) {
        team.teamConfiguration.AllowedRoleToModifyCalendar = configuration.AllowedRoleToModifyCalendar;
      }
      if (configuration.AllowedRoleToModiyLiveEdit) {
        team.teamConfiguration.AllowedRoleToModiyLiveEdit = configuration.AllowedRoleToModiyLiveEdit;
      }
    }
    
    await team.save();
    
    res.status(200).json({
      success: true,
      message: "Team configuration updated successfully",
      configuration: team.teamConfiguration
    });
  } catch (error) {
    console.error("Error updating team configuration:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

