const { Team, MessageGroup } = require('../models/Team');
const User = require('../models/User');
const { File } = require('../models/File');
const AdminConfig = require('../models/AdminConfiguration');
const mongoose = require('mongoose');
const moment = require('moment');

// Get detailed team information including members and stats
exports.getTeamDetails = async (req, res) => {
  try {
    const { teamId } = req.params;
    
    // Fetch team with populated members
    const team = await Team.findById(teamId)
      .populate({
        path: 'members.user',
        select: 'firstName lastName email avatar statusUpdatedAt'
      })
      .populate('createdBy', 'firstName lastName email');
      
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }
    
    // Get message count per member
    const messageGroups = await MessageGroup.find({ team: teamId });
    
    const memberActivity = {};
    let totalMessages = 0;
    
    // Calculate message counts for each member
    for (const group of messageGroups) {
      for (const message of group.messages) {
        const senderId = message.sender.toString();
        memberActivity[senderId] = (memberActivity[senderId] || 0) + 1;
        totalMessages++;
      }
    }
    
    // Calculate active members, new members this month, left members
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const activeMembers = team.members.filter(m => !m.leaveAt).length;
    const newMembersThisMonth = team.members.filter(m => 
      new Date(m.joinedAt) >= startOfMonth
    ).length;
    const leftMembersThisMonth = team.members.filter(m => 
      m.leaveAt && new Date(m.leaveAt) >= startOfMonth
    ).length;
    
    // Enhance member data with message counts and other stats
    const enhancedMembers = team.members.map(member => {
      const userId = member.user._id.toString();
      return {
        ...member.toObject(),
        messageCount: memberActivity[userId] || 0,
        lastActive: member.user.lastActive
      };
    });
    
    // Sort members by message count (most active first)
    enhancedMembers.sort((a, b) => b.messageCount - a.messageCount);
    
    // Restructure the response to match what the frontend expects
    const response = {
      _id: team._id,
      name: team.name,
      description: team.description,
      logo: team.logo,
      createdAt: team.createdAt,
      createdBy: team.createdBy,
      isDisabled: team.isDisabled,
      members: enhancedMembers,
      memberCount: team.members.length,
      activeMembers,
      newMembersThisMonth,
      leftMembersThisMonth
    };
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error getting team details:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error fetching team details',
      error: error.message 
    });
  }
};

// Get team storage usage
exports.getTeamStorageUsage = async (req, res) => {
  try {
    const { teamId } = req.params;
    
    // Fetch team files and calculate storage usage
    const files = await File.find({ teamId });
    
    let usedStorage = 0;
    
    files.forEach(file => {
      usedStorage += file.size || 0;
    });
    
    // Fetch storage configuration from AdminConfig
    const adminConfig = await AdminConfig.findOne();
    
    console.log("Admin Config:", adminConfig);
    let totalStorage;
    if (!adminConfig || adminConfig.nextcloud.storageTypePerTeam === 'infinity') {
      // For unlimited storage, use a reasonable value for visualization
      // (e.g., 2x the current usage or a large default)
      totalStorage = Math.max(usedStorage * 2, 10 * 1024 * 1024 * 1024); // 10GB minimum for visual representation
    } else {
      // Convert GB to bytes
      totalStorage = adminConfig.nextcloud.maxSizePerTeam * 1024 * 1024 * 1024;
    }
    
    const freeStorage = Math.max(0, totalStorage - usedStorage);
    
    return res.status(200).json({
      totalStorage,
      usedStorage,
      freeStorage,
      fileCount: files.length,
      storageType: adminConfig ? adminConfig.nextcloud.storageTypePerTeam : 'limited'
    });
  } catch (error) {
    console.error('Error getting team storage usage:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error fetching team storage usage',
      error: error.message 
    });
  }
};

// Get team member activity over time
exports.getTeamMemberActivity = async (req, res) => {
  try {
    const { teamId } = req.params;
    const team = await Team.findById(teamId);
    
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }
    
    // Generate data for the last 30 days
    const labels = [];
    const activeCounts = [];
    const newCounts = [];
    
    // Calculate daily activity using real data from activeDays
    for (let i = 29; i >= 0; i--) {
      const date = moment().subtract(i, 'days');
      const dateStr = date.format('MMM D');
      labels.push(dateStr);
      
      // Get the start and end of the day
      const dayStart = date.startOf('day').toDate();
      const dayEnd = date.endOf('day').toDate();
      
      // Count members who were active on this specific day
      let activeCount = 0;
      team.members.forEach(member => {
        if (member.activeDays && member.activeDays.length > 0) {
          const wasActive = member.activeDays.some(activeDate => {
            const date = new Date(activeDate);
            return date >= dayStart && date <= dayEnd;
          });
          
          if (wasActive && member.leaveAt === null) {
            activeCount++;
          }
        }
      });
      
      activeCounts.push(activeCount);
      
      // New members joined each day (keep existing code)
      const newMembers = team.members.filter(member => {
        const joinDate = new Date(member.joinedAt);
        return joinDate >= dayStart && joinDate <= dayEnd;
      }).length;
      
      newCounts.push(newMembers);
    }
    
    // Make sure we're returning the data in exactly the format expected by the charts
    return res.status(200).json({
      labels,
      activeCounts,
      newCounts
    });
    
  } catch (error) {
    console.error('Error getting team member activity:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error fetching team member activity',
      error: error.message 
    });
  }
};

// Get team chat engagement metrics
exports.getTeamChatEngagement = async (req, res) => {
  try {
    const { teamId } = req.params;
    
    // Get all message groups for the team
    const messageGroups = await MessageGroup.find({ team: teamId })
      .populate({
        path: 'messages.sender',
        select: 'firstName lastName'
      });
    
    if (!messageGroups || messageGroups.length === 0) {
      return res.status(200).json({
        labels: [],
        messageCounts: [],
        totalMessages: 0,
        messageGroupCount: 0,
        mostActiveUser: null,
        avgMessagesPerDay: 0
      });
    }
    
    // Generate data for the last 7 days
    const labels = [];
    const messageCounts = [];
    
    // Calculate daily message counts
    for (let i = 6; i >= 0; i--) {
      const date = moment().subtract(i, 'days');
      const dateStr = date.format('MMM D');
      labels.push(dateStr);
      
      const dayStart = date.startOf('day').toDate();
      const dayEnd = date.endOf('day').toDate();
      
      let dayCount = 0;
      messageGroups.forEach(group => {
        group.messages.forEach(message => {
          const messageDate = new Date(message.createdAt);
          if (messageDate >= dayStart && messageDate <= dayEnd) {
            dayCount++;
          }
        });
      });
      
      messageCounts.push(dayCount);
    }
    
    // Calculate most active user
    const userMessageCount = {};
    messageGroups.forEach(group => {
      group.messages.forEach(message => {
        const senderId = message.sender?._id?.toString();
        if (senderId) {
          if (!userMessageCount[senderId]) {
            userMessageCount[senderId] = {
              name: `${message.sender.firstName} ${message.sender.lastName}`,
              count: 0
            };
          }
          userMessageCount[senderId].count++;
        }
      });
    });
    
    let mostActiveUser = null;
    let maxCount = 0;
    
    Object.keys(userMessageCount).forEach(userId => {
      if (userMessageCount[userId].count > maxCount) {
        maxCount = userMessageCount[userId].count;
        mostActiveUser = {
          id: userId,
          name: userMessageCount[userId].name,
          messageCount: maxCount
        };
      }
    });
    
    // Calculate total messages
    let totalMessages = 0;
    messageGroups.forEach(group => {
      totalMessages += group.messages.length;
    });
    
    // Average messages per day
    const avgMessagesPerDay = totalMessages / 7;
    
    // Make sure we're returning the data in exactly the format expected by the charts
    return res.status(200).json({
      labels,
      messageCounts,
      totalMessages,
      messageGroupCount: messageGroups.length,
      mostActiveUser,
      avgMessagesPerDay
    });
    
  } catch (error) {
    console.error('Error getting team chat engagement:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error fetching team chat engagement',
      error: error.message 
    });
  }
};
