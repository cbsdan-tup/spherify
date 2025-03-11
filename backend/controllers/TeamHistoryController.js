const { Team } = require("../models/Team");
const User = require("../models/User");

exports.getTeamMemberHistory = async (req, res) => {
  try {
    const { teamId } = req.params;
    
    // Find the team
    const team = await Team.findById(teamId)
      .populate('members.user', 'firstName lastName email avatar');
      
    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found"
      });
    }
    
    // Process all members to create a history
    const memberHistory = [];
    const userJoinDates = {}; // Track each user's join/leave history
    
    // Process all members (including those who left)
    team.members.forEach(member => {
      const userId = member.user._id.toString();
      
      // Track the join date
      memberHistory.push({
        user: member.user,
        action: "joined",
        actionDate: member.joinedAt,
        role: member.role,
        isAdmin: member.isAdmin,
        joinThrough: member.joinThrough || "invitation"
      });
      
      if (!userJoinDates[userId]) {
        userJoinDates[userId] = [];
      }
      
      userJoinDates[userId].push({
        joined: member.joinedAt,
        left: member.leaveAt,
      });
      
      // If the member has left, add that to the history
      if (member.leaveAt) {
        memberHistory.push({
          user: member.user,
          action: "left",
          actionDate: member.leaveAt,
          role: member.role,
          isAdmin: member.isAdmin
        });
      }
    });
    
    // Process the userJoinDates to identify rejoin events
    Object.keys(userJoinDates).forEach(userId => {
      const userDates = userJoinDates[userId].sort((a, b) => 
        new Date(a.joined) - new Date(b.joined)
      );
      
      // If a user has multiple join records, mark the later ones as rejoins
      if (userDates.length > 1) {
        for (let i = 1; i < userDates.length; i++) {
          const joinEvent = memberHistory.find(
            event => 
              event.user._id.toString() === userId && 
              event.actionDate.getTime() === userDates[i].joined.getTime() &&
              event.action === "joined"
          );
          
          if (joinEvent) {
            joinEvent.action = "rejoined";
            joinEvent.previousLeave = userDates[i-1].left;
          }
          
          // Also mark the previous "left" event as one where the user rejoined later
          const leftEvent = memberHistory.find(
            event => 
              event.user._id.toString() === userId && 
              event.actionDate.getTime() === userDates[i-1].left.getTime() &&
              event.action === "left"
          );
          
          if (leftEvent) {
            leftEvent.isRejoined = true;
          }
        }
      }
    });
    
    // Sort the history by date (most recent first)
    memberHistory.sort((a, b) => new Date(b.actionDate) - new Date(a.actionDate));
    
    res.status(200).json({
      success: true,
      memberHistory,
      totalJoined: memberHistory.filter(item => item.action === "joined").length,
      totalRejoined: memberHistory.filter(item => item.action === "rejoined").length,
      totalLeft: memberHistory.filter(item => item.action === "left").length
    });
    
  } catch (error) {
    console.error("Error fetching team member history:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};
