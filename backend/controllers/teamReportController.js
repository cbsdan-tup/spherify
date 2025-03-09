const { Team, MessageGroup } = require('../models/Team');
const User = require('../models/User');
const File  = require('../models/File');
const AdminConfig = require('../models/AdminConfiguration');
const mongoose = require('mongoose');
const moment = require('moment');

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
      
      // New members joined each day
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

// Get team activity metrics
exports.getTeamActivityReport = async (req, res) => {
  try {
    const { teamId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid team ID format' 
      });
    }

    // Find team and populate member data
    const team = await Team.findById(teamId)
      .populate({
        path: 'members.user',
        select: 'firstName lastName email avatar status statusUpdatedAt'
      });
    
    if (!team) {
      return res.status(404).json({ 
        success: false, 
        message: 'Team not found' 
      });
    }
    
    // Process activity data for each member
    const activityStats = team.members.map(member => {
      // Calculate days active in the last 30 days
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      
      // Get recent active days
      const recentActiveDays = member.activeDays.filter(date => 
        new Date(date) >= thirtyDaysAgo
      );
      
      // Group active days by week
      const weeklyActivity = {};
      recentActiveDays.forEach(date => {
        const dateObj = new Date(date);
        // Get week number (0-4 for the last 4 weeks)
        const weekNumber = Math.floor((now - dateObj) / (7 * 24 * 60 * 60 * 1000));
        if (weekNumber >= 0 && weekNumber < 5) {
          weeklyActivity[weekNumber] = (weeklyActivity[weekNumber] || 0) + 1;
        }
      });

      // Format weekly activity for chart display (last 4 weeks)
      const activityByWeek = [];
      for (let i = 4; i >= 0; i--) {
        activityByWeek.push(weeklyActivity[i] || 0);
      }

      return {
        userId: member.user._id,
        name: `${member.user.firstName} ${member.user.lastName}`,
        nickname: member.nickname || null,
        email: member.user.email,
        role: member.role,
        isAdmin: member.isAdmin,
        avatar: member.user.avatar?.url || null,
        status: member.user.status,
        statusUpdatedAt: member.user.statusUpdatedAt,
        joinedAt: member.joinedAt,
        activeDaysTotal: member.activeDays.length,
        activeDaysLast30: recentActiveDays.length,
        activityByWeek: activityByWeek,
        lastActive: member.activeDays.length > 0 
          ? new Date(Math.max(...member.activeDays.map(d => new Date(d)))) 
          : member.joinedAt
      };
    });
    
    // Get team overall statistics
    const teamStats = {
      totalMembers: team.members.length,
      activeMembers: team.members.filter(m => m.user.status === 'active').length,
      averageActiveDays: activityStats.reduce((sum, m) => sum + m.activeDaysLast30, 0) / team.members.length || 0,
      createdAt: team.createdAt,
      ageInDays: Math.floor((new Date() - new Date(team.createdAt)) / (24 * 60 * 60 * 1000)),
    };
    
    res.status(200).json({
      success: true,
      teamStats,
      memberStats: activityStats.sort((a, b) => b.activeDaysLast30 - a.activeDaysLast30) // Sort by most active first
    });
    
  } catch (error) {
    console.error('Error generating team activity report:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating team activity report',
      error: error.message
    });
  }
};

// Get user-specific report within team
exports.getTeamUserReport = async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.query.userId || req.user.id; // Get from query or use current user
    
    // Find team and check if user is a member
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }
    
    const isMember = team.members.some(member => member.user.toString() === userId);
    if (!isMember) {
      return res.status(403).json({ 
        success: false, 
        message: 'User is not a member of this team' 
      });
    }
    
    // Get the user's activity data
    const memberData = team.members.find(member => member.user.toString() === userId);
    const user = await User.findById(userId).select('firstName lastName email avatar status statusUpdatedAt');
    
    // Calculate activity statistics
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const recentActiveDays = memberData.activeDays.filter(date => new Date(date) >= thirtyDaysAgo);
    
    // Format weekly activity
    const weeklyActivity = [0, 0, 0, 0];
    recentActiveDays.forEach(date => {
      const dateObj = new Date(date);
      const weekNumber = Math.floor((now - dateObj) / (7 * 24 * 60 * 60 * 1000));
      if (weekNumber >= 0 && weekNumber < 4) {
        weeklyActivity[weekNumber] += 1;
      }
    });
    
    // Reverse to get chronological order (oldest to newest)
    weeklyActivity.reverse();
    
    return res.status(200).json({
      success: true,
      userData: {
        user: {
          _id: user._id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          avatar: user.avatar?.url || null,
          status: user.status,
          statusUpdatedAt: user.statusUpdatedAt
        },
        teamRole: memberData.role,
        isAdmin: memberData.isAdmin,
        joinedTeamAt: memberData.joinedAt,
        activityStats: {
          activeDaysTotal: memberData.activeDays.length,
          activeDaysLast30: recentActiveDays.length,
          weeklyActivity: weeklyActivity,
          lastActive: memberData.activeDays.length > 0 ? 
            new Date(Math.max(...memberData.activeDays.map(d => new Date(d)))) : 
            memberData.joinedAt
        }
      }
    });
  } catch (error) {
    console.error('Error generating user team report:', error);
    return res.status(500).json({
      success: false,
      message: 'Error generating user team report',
      error: error.message
    });
  }
};

exports.getTeamBasicDetails = async (req, res) => {
  try {
    const { teamId } = req.params;
    
    const team = await Team.findById(teamId)
      .select('name description logo createdAt members')
      .populate('createdBy', 'firstName lastName email');
      
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }
    
    return res.status(200).json({
      success: true,
      team: {
        _id: team._id,
        name: team.name,
        description: team.description,
        logo: team.logo,
        createdAt: team.createdAt,
        createdBy: team.createdBy,
        memberCount: team.members.length
      }
    });
  } catch (error) {
    console.error('Error getting team basic details:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error fetching team basic details',
      error: error.message 
    });
  }
};

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
    
    // Restructure the response to match what the frontend expects
    const response = {
      _id: team._id,
      name: team.name,
      description: team.description,
      logo: team.logo,
      createdAt: team.createdAt,
      createdBy: team.createdBy,
      isDisabled: team.isDisabled,
      members: team.members,
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

// Get team collaboration metrics
exports.getTeamCollaboration = async (req, res) => {
  try {
    const { teamId } = req.params;
    
    // Get message groups for collaboration analysis
    const messageGroups = await MessageGroup.find({ team: teamId })
      .populate('messages.sender', 'firstName lastName');
    
    // Get files for collaboration analysis
    const files = await require('../../models/File').File.find({ 
      teamId: teamId,
      isDeleted: false
    }).select('createdBy history');
    
    // Calculate collaboration network
    const collaborationNetwork = {};
    const userInteractions = {};
    
    // Process file collaborations
    files.forEach(file => {
      if (file.history && file.history.length > 1) {
        // Create pairs of users who worked on the same file
        const contributors = [...new Set([
          file.createdBy.toString(),
          ...file.history.map(h => h.performedBy.toString())
        ])];
        
        for (let i = 0; i < contributors.length; i++) {
          for (let j = i + 1; j < contributors.length; j++) {
            const pair = [contributors[i], contributors[j]].sort().join('-');
            collaborationNetwork[pair] = (collaborationNetwork[pair] || 0) + 1;
            
            // Track individual user interaction counts
            userInteractions[contributors[i]] = (userInteractions[contributors[i]] || 0) + 1;
            userInteractions[contributors[j]] = (userInteractions[contributors[j]] || 0) + 1;
          }
        }
      }
    });
    
    // Process message group collaborations
    messageGroups.forEach(group => {
      if (group.messages.length > 1) {
        const participants = [...new Set(
          group.messages.map(m => m.sender._id.toString())
        )];
        
        for (let i = 0; i < participants.length; i++) {
          for (let j = i + 1; j < participants.length; j++) {
            const pair = [participants[i], participants[j]].sort().join('-');
            collaborationNetwork[pair] = (collaborationNetwork[pair] || 0) + 1;
            
            // Track individual user interaction counts
            userInteractions[participants[i]] = (userInteractions[participants[i]] || 0) + 1;
            userInteractions[participants[j]] = (userInteractions[participants[j]] || 0) + 1;
          }
        }
      }
    });
    
    // Get user details for the collaboration network
    const team = await Team.findById(teamId)
      .populate({
        path: 'members.user',
        select: 'firstName lastName avatar'
      });
    
    const userMap = {};
    team.members.forEach(member => {
      userMap[member.user._id.toString()] = {
        id: member.user._id,
        name: `${member.user.firstName} ${member.user.lastName}`,
        avatar: member.user.avatar?.url || null,
        interactionCount: userInteractions[member.user._id.toString()] || 0
      };
    });
    
    // Format collaboration network for visualization
    const nodes = Object.keys(userInteractions).map(userId => userMap[userId]);
    const links = Object.keys(collaborationNetwork).map(pair => {
      const [source, target] = pair.split('-');
      return {
        source,
        target,
        value: collaborationNetwork[pair]
      };
    });
    
    return res.status(200).json({
      success: true,
      network: {
        nodes,
        links
      }
    });
  } catch (error) {
    console.error('Error getting team collaboration data:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error fetching team collaboration data',
      error: error.message 
    });
  }
};

exports.getTeamTasks = async (req, res) => {
  try {
    const { teamId } = req.params;
    
    // Assuming you have a Card model for Kanban cards/tasks
    const Card = mongoose.model('Card') || require('../../models/Card');
    
    const tasks = await Card.find({ teamId })
      .populate('assignedTo', 'firstName lastName avatar');
      
    // Calculate task statistics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => 
      task.checklist && task.checklist.length > 0 && 
      task.checklist.every(item => item.isCompleted)
    ).length;
    
    const inProgressTasks = tasks.filter(task => 
      task.checklist && task.checklist.length > 0 && 
      task.checklist.some(item => item.isCompleted) &&
      !task.checklist.every(item => item.isCompleted)
    ).length;
    
    return res.status(200).json({
      success: true,
      stats: {
        total: totalTasks,
        completed: completedTasks,
        inProgress: inProgressTasks,
        pending: totalTasks - completedTasks - inProgressTasks
      },
      tasks: tasks.map(task => ({
        id: task._id,
        title: task.title,
        description: task.description,
        assignedTo: task.assignedTo,
        status: task.status,
        dueDate: task.dueDate,
        isCompleted: task.checklist && task.checklist.length > 0 && 
                    task.checklist.every(item => item.isCompleted)
      }))
    });
  } catch (error) {
    console.error('Error getting team tasks:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error fetching team tasks',
      error: error.message 
    });
  }
};

// Get team contribution metrics
exports.getTeamContributionReport = async (req, res) => {
  try {
    const { teamId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid team ID format' 
      });
    }

    // Find the team to make sure it exists
    const team = await Team.findById(teamId)
      .populate({
        path: 'members.user',
        select: 'firstName lastName email avatar'
      });
    
    if (!team) {
      return res.status(404).json({ 
        success: false, 
        message: 'Team not found' 
      });
    }

    // Get file creation and edits by each member
    const files = await File.find({ 
      teamId: teamId,
      isDeleted: false
    });
    
    // Process file contributions by each user
    const fileContributions = {};
    
    files.forEach(file => {
      // Process file creation
      const creatorId = file.createdBy.toString();
      if (!fileContributions[creatorId]) {
        fileContributions[creatorId] = {
          created: 0,
          edited: 0,
          lastAction: null
        };
      }
      fileContributions[creatorId].created += 1;
      
      // Process file edits from history
      if (file.history && file.history.length) {
        file.history.forEach(entry => {
          const userId = entry.performedBy.toString();
          
          if (!fileContributions[userId]) {
            fileContributions[userId] = {
              created: 0,
              edited: 0,
              lastAction: null
            };
          }
          
          if (entry.action === 'edited') {
            fileContributions[userId].edited += 1;
          }
          
          // Track last action
          const actionDate = new Date(entry.timestamp);
          if (!fileContributions[userId].lastAction || 
              actionDate > new Date(fileContributions[userId].lastAction)) {
            fileContributions[userId].lastAction = entry.timestamp;
          }
        });
      }
    });

    // Get kanban cards created by each user
    const Card = mongoose.model('Card') || require('../../models/Card');
    const cards = await Card.find({ teamId }).lean();
    const cardsByUser = {};
    const cardTasks = {
      completed: 0,
      inProgress: 0,
      notStarted: 0,
      total: cards.length
    };

    cards.forEach(card => {
      // Calculate completion status
      if (card.checklist && card.checklist.length > 0) {
        const completed = card.checklist.every(item => item.isCompleted);
        const hasProgress = card.checklist.some(item => item.isCompleted);
        
        if (completed) {
          cardTasks.completed++;
        } else if (hasProgress) {
          cardTasks.inProgress++;
        } else {
          cardTasks.notStarted++;
        }
      } else {
        cardTasks.notStarted++;
      }

      // Track assignments
      if (card.assignedTo && card.assignedTo.length > 0) {
        card.assignedTo.forEach(userId => {
          const userIdStr = userId.toString();
          if (!cardsByUser[userIdStr]) {
            cardsByUser[userIdStr] = {
              assigned: 0,
              completed: 0
            };
          }
          
          cardsByUser[userIdStr].assigned++;
          
          // Check if task is complete
          if (card.checklist && card.checklist.length > 0 && 
              card.checklist.every(item => item.isCompleted)) {
            cardsByUser[userIdStr].completed++;
          }
        });
      }
    });

    // Get message counts by user from message groups
    const messageGroups = await MessageGroup.find({ team: teamId });
    const messagesByUser = {};
    
    messageGroups.forEach(group => {
      group.messages.forEach(message => {
        const senderId = message.sender.toString();
        if (!messagesByUser[senderId]) {
          messagesByUser[senderId] = 0;
        }
        messagesByUser[senderId]++;
      });
    });

    // Combine all metrics for each user
    const userContributions = team.members.map(member => {
      const userId = member.user._id.toString();
      return {
        userId,
        name: `${member.user.firstName} ${member.user.lastName}`,
        avatar: member.user.avatar?.url || null,
        role: member.role,
        files: fileContributions[userId] || { created: 0, edited: 0, lastAction: null },
        tasks: cardsByUser[userId] || { assigned: 0, completed: 0 },
        messages: messagesByUser[userId] || 0,
        completionRate: cardsByUser[userId] ? 
          (cardsByUser[userId].assigned > 0 ? 
            (cardsByUser[userId].completed / cardsByUser[userId].assigned * 100).toFixed(1) : 0) : 0
      };
    });
    
    res.status(200).json({
      success: true,
      userContributions: userContributions.sort((a, b) => {
        // Sort by activity level (sum of contributions)
        const aTotal = a.files.created + a.files.edited + a.tasks.assigned + a.messages;
        const bTotal = b.files.created + b.files.edited + b.tasks.assigned + b.messages;
        return bTotal - aTotal;
      }),
      taskMetrics: cardTasks
    });
    
  } catch (error) {
    console.error('Error generating team contribution report:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating team contribution report',
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

