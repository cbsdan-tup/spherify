const Card = require('../../models/kanban/Card');
const List = require('../../models/kanban/List');
const Team = require('../../models/Team').Team;
const User = require('../../models/User');
const sendNotification = require('../../config/sendNotification');
const { body, validationResult } = require('express-validator');

// Get card
exports.getCard = async (req, res) => {
  try {
    const { id, teamId } = req.params;
    
    const team = await Team.findOne({
      _id: teamId,
      'members.user': req.user._id
    });

    if (!team) {
      return res.status(403).json({ message: "Not authorized to access this team's cards" });
    }

    const card = await Card.findById(id).populate('assignedTo', 'firstName lastName avatar');
    if (!card) {
      return res.status(404).json({ message: "Card not found" });
    }

    if (card.teamId.toString() !== teamId) {
      return res.status(403).json({ message: "Card does not belong to specified team" });
    }

    res.json(card);
  } catch (error) {
    res.status(500).json({ message: "Error fetching card", error: error.message });
  }
};

// Get all cards for a list
exports.getAllCardsByList = async (req, res) => {
  try {
    const { teamId, listId } = req.params;
    
    // First verify team membership
    const team = await Team.findOne({
      _id: teamId,
      'members.user': req.user._id
    }).populate('members.user', 'firstName lastName avatar');

    if (!team) {
      return res.status(403).json({ 
        message: "Not authorized to access this team's cards" 
      });
    }

    // Then verify list belongs to team
    const list = await List.findOne({
      _id: listId,
      teamId: teamId
    });

    if (!list) {
      return res.status(404).json({ 
        message: "List not found or does not belong to this team" 
      });
    }

    // Fetch cards with proper sorting
    const cards = await Card.find({ 
      teamId, 
      listId 
    })
    .populate('assignedTo', 'firstName lastName avatar')
    .sort({ position: 1 })
    .lean();

    res.json(cards);

  } catch (error) {
    console.error('Error in getAllCardsByList:', error);
    res.status(500).json({ 
      message: "Error fetching cards", 
      error: error.message 
    });
  }
};

// Create card
exports.createCard = [
  body('cardTitle').trim().isLength({ min: 1 }).withMessage('Card title is required'),
  body('listId').notEmpty().withMessage('List ID is required'),
  body('teamId').notEmpty().withMessage('Team ID is required'),
  body('priority').isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
  body('checklist').optional().isArray(),
  body('assignedTo').optional().isArray(),

  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Verify team access
      const team = await Team.findOne({
        _id: req.body.teamId,
        'members.user': req.user._id
      });

      if (!team) {
        return res.status(403).json({ 
          message: "Not authorized to create cards in this team" 
        });
      }

      // Get highest position in the list
      const highestCard = await Card.findOne({ 
        listId: req.body.listId 
      })
      .sort({ position: -1 });

      const position = highestCard ? highestCard.position + 16384 : 16384;

      // Create card with position
      const card = new Card({
        cardTitle: req.body.cardTitle,
        description: req.body.description || '',
        position,
        checklist: req.body.checklist || [],
        priority: req.body.priority || 'low',
        assignedTo: req.body.assignedTo || [],
        listId: req.body.listId,
        teamId: req.body.teamId
      });

      const savedCard = await card.save();
      
      // Get the creator's details for notification
      const creator = await User.findById(req.user._id)
        .select('firstName lastName')
        .lean();
        
      // Find the list name for better context in notifications
      const list = await List.findById(req.body.listId)
        .select('name')
        .lean();
        
      // Send notifications to assigned users who have permission tokens
      if (savedCard.assignedTo && savedCard.assignedTo.length > 0) {
        try {
          // Find users with permission tokens - EXCLUDING the card creator
          const assignedUsers = await User.find({
            _id: { 
              $in: savedCard.assignedTo,
              $ne: req.user._id  // Exclude the creator
            },
            permissionToken: { $exists: true, $ne: null }
          }).select('firstName lastName permissionToken');
          
          // Get team name from the team object we already fetched
          const teamName = team.name || 'Unnamed Team';
          
          // Send notifications to each assigned user (excluding creator)
          assignedUsers.forEach(async (user) => {
            try {
              await sendNotification(user.permissionToken, {
                title: `${teamName}: New Task Assignment`,
                body: `${creator.firstName} ${creator.lastName} assigned you to "${savedCard.cardTitle}" in ${list?.name || 'a list'}`,
                tag: 'task-assignment',
                url: `https://spherify.vercel.app/main/${req.body.teamId}/kanban`,
              });
              console.log(`Notification sent to ${user.firstName} ${user.lastName} about card assignment in ${teamName}`);
            } catch (notifError) {
              // Log error but don't stop execution
              console.error(`Error sending notification to user ${user._id}:`, notifError);
            }
          });
        } catch (notifError) {
          console.error('Error processing notifications for card assignments:', notifError);
          // Continue with the response - don't fail the card creation if notifications fail
        }
      }

      const populatedCard = await Card.findById(savedCard._id)
        .populate('assignedTo', 'firstName lastName avatar');

      res.status(201).json(populatedCard);
    } catch (error) {
      res.status(500).json({ 
        message: "Error creating card",
        error: error.message 
      });
    }
  }
];

// Update card
exports.updateCard = [
  body('cardTitle').optional().trim(),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('checklist').optional().isArray(),
  body('assignedTo').optional().isArray(),
  
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const card = await Card.findById(req.params.cardId); // Changed from req.params.id
      if (!card) {
        return res.status(404).json({ message: "Card not found" });
      }

      const team = await Team.findOne({
        _id: card.teamId,
        'members.user': req.user._id
      });

      if (!team) {
        return res.status(403).json({ message: "Not authorized to update this card" });
      }

      const updateData = {
        ...(req.body.cardTitle && { cardTitle: req.body.cardTitle }),
        ...(req.body.priority && { priority: req.body.priority }),
        ...(req.body.checklist && { checklist: req.body.checklist }),
        ...(req.body.assignedTo && { assignedTo: req.body.assignedTo })
      };

      const updatedCard = await Card.findByIdAndUpdate(
        req.params.cardId,
        updateData,
        { new: true }
      ).populate('assignedTo', 'firstName lastName avatar');

      res.json(updatedCard);
    } catch (error) {
      res.status(500).json({ message: "Error updating card", error: error.message });
    }
  }
];

// Delete card
exports.deleteCard = async (req, res) => {
  try {
    const card = await Card.findById(req.params.cardId); 
    if (!card) {
      return res.status(404).json({ message: "Card not found" });
    }

    const team = await Team.findOne({
      _id: card.teamId,
      'members.user': req.user._id
    });

    if (!team) {
      return res.status(403).json({ message: "Not authorized to delete this card" });
    }

    await Card.findByIdAndDelete(req.params.cardId);
    res.json({ message: "Card deleted successfully", cardId: req.params.cardId });
  } catch (error) {
    res.status(500).json({ message: "Error deleting card", error: error.message });
  }
};

// Add this new controller function
exports.updateCardPositions = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { sourceListId, destinationListId, cards } = req.body;

    // Verify team access
    const team = await Team.findOne({
      _id: teamId,
      'members.user': req.user._id
    });

    if (!team) {
      return res.status(403).json({ 
        message: "Not authorized to update cards in this team" 
      });
    }

    // Bulk update all cards
    const bulkOps = cards.map(card => ({
      updateOne: {
        filter: { _id: card._id },
        update: { 
          $set: { 
            position: card.position,
            listId: card.listId
          }
        }
      }
    }));

    await Card.bulkWrite(bulkOps);

    // Fetch and return updated cards
    const updatedCards = await Card.find({
      _id: { $in: cards.map(card => card._id) }
    }).populate('assignedTo', 'firstName lastName avatar');

    res.json(updatedCards);

  } catch (error) {
    console.error('Error updating card positions:', error);
    res.status(500).json({ 
      message: "Error updating card positions",
      error: error.message 
    });
  }
};
