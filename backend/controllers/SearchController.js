const User = require('../models/User');
const { Team } = require('../models/Team');
const mongoose = require('mongoose');

// Search for users
exports.searchUsers = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide a search query' 
      });
    }

    // Search for users by firstName, lastName, or email
    // Exclude users who are admins or disabled
    const users = await User.find({
      $or: [
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ],
      isAdmin: false, // Exclude admin users
      isDisable: false // Exclude disabled users
    }).select('firstName lastName email avatar');

    return res.status(200).json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Error searching users:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Search for all teams 
exports.searchAllTeams = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide a search query' 
      });
    }

    // First find teams that match the search query and are active and not disabled
    const allMatchingTeams = await Team.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ],
      isActive: true,
      isDisabled: false
    }).select('name description logo members createdAt createdBy')
      .populate('createdBy', 'firstName lastName email avatar');

    // Filter out teams with no active members
    const teams = allMatchingTeams.filter(team => {
      // Count active members (where leaveAt is null)
      const activeMembersCount = team.members.filter(member => member.leaveAt === null).length;
      return activeMembersCount > 0;
    });

    return res.status(200).json({
      success: true,
      teams
    });
  } catch (error) {
    console.error('Error searching teams:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
