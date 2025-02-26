const Card = require('../../models/kanban/Card');
const List = require('../../models/kanban/List');
const Team = require('../../models/Team').Team;
const { body, validationResult } = require('express-validator');

// Get card
exports.getCard = async (req, res) => {
  try {
    const { id, teamId } = req.params;
    
    // Verify team membership
    const team = await Team.findOne({
      _id: teamId,
      'members.user': req.user._id
    });

    if (!team) {
      return res.status(403).json({ message: "Not authorized to access this team's cards" });
    }

    const card = await Card.findById(id);
    if (!card) {
      return res.status(404).json({ message: "Card not found" });
    }

    // Verify card belongs to the team
    if (card.teamId.toString() !== teamId) {
      return res.status(403).json({ message: "This card does not belong to the specified team" });
    }

    res.json(card);
  } catch (error) {
    res.status(500).json({ 
      message: "Error fetching card",
      error: error.message
    });
  }
};

// Create card
exports.createCard = [
  body('cardTitle').trim().isLength({ min: 1 }).withMessage('Title is required'),
  body('listId').notEmpty().withMessage('List ID is required'),
  body('teamId').notEmpty().withMessage('Team ID is required'),
  body('description').optional().trim(),
  body('dueDate').optional().isISO8601().toDate(),
  body('attachments.*.url').optional().trim(),
  body('assignedTo').optional().isArray(),
  body('position').optional().isNumeric(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const list = await List.findById(req.body.listId);
      if (!list) {
        return res.status(404).json({ message: "List not found" });
      }

      // Verify team membership
      const team = await Team.findOne({
        _id: list.teamId,
        'members.user': req.user._id
      });

      if (!team) {
        return res.status(403).json({ message: "Not authorized to create cards in this list" });
      }

      // Calculate position for new card (at the end of the list)
      const lastCard = await Card.findOne({ listId: req.body.listId })
        .sort({ position: -1 });
      const position = lastCard ? lastCard.position + 1000 : 1000;

      const card = await Card.create({
        cardTitle: req.body.cardTitle,
        description: req.body.description,
        dueDate: req.body.dueDate,
        priority: req.body.priority || 'low',
        labels: req.body.labels || [],
        attachments: req.body.attachments || [],
        assignedTo: req.body.assignedTo || [],
        listId: req.body.listId,
        teamId: req.body.teamId,
        position,
        createdBy: req.user._id
      });

      res.status(201).json(card);
    } catch (error) {
      res.status(500).json({ message: "Error creating card", error: error.message });
    }
  }
];

// Update card positions (handles both vertical and horizontal moves)
exports.updateCardPositions = async (req, res) => {
  try {
    const { sourceListId, destinationListId, cards } = req.body;

    // Verify list exists and user has access
    const list = await List.findById(sourceListId);
    if (!list) {
      return res.status(404).json({ message: "Source list not found" });
    }

    // Verify team membership
    const team = await Team.findOne({
      _id: list.teamId,
      'members.user': req.user._id
    });

    if (!team) {
      return res.status(403).json({ message: "Not authorized to update cards" });
    }

    // Handle both same list reordering and cross-list movement
    if (sourceListId === destinationListId) {
      // Same list reordering - update positions vertically
      const updatePromises = cards.map((card, index) => {
        return Card.findByIdAndUpdate(
          card._id,
          { 
            position: (index + 1) * 1000,
            updatedAt: new Date()
          },
          { new: true }
        );
      });

      await Promise.all(updatePromises);
    } else {
      // Cross-list movement - update card's list and position
      const destCards = await Card.find({ listId: destinationListId })
        .sort({ position: 1 });
      
      // Recalculate positions for all affected cards
      const updatePromises = cards.map((card, index) => {
        return Card.findByIdAndUpdate(
          card._id,
          {
            listId: destinationListId,
            position: (index + 1) * 1000,
            updatedAt: new Date()
          },
          { new: true }
        );
      });

      await Promise.all(updatePromises);

      // Reorder remaining cards in source list
      const sourceCards = await Card.find({ listId: sourceListId })
        .sort({ position: 1 });
      
      const sourceUpdatePromises = sourceCards.map((card, index) => {
        return Card.findByIdAndUpdate(
          card._id,
          { position: (index + 1) * 1000 },
          { new: true }
        );
      });

      await Promise.all(sourceUpdatePromises);
    }

    // Return updated cards for both lists
    const updatedSourceCards = await Card.find({ listId: sourceListId })
      .sort({ position: 1 });
    const updatedDestCards = sourceListId === destinationListId ? [] :
      await Card.find({ listId: destinationListId }).sort({ position: 1 });

    res.json({
      sourceListCards: updatedSourceCards,
      destinationListCards: updatedDestCards
    });

  } catch (error) {
    console.error('Error updating card positions:', error);
    res.status(500).json({
      message: "Error updating card positions",
      error: error.message
    });
  }
};

// Update card
exports.updateCard = [
  body('cardTitle').optional().trim(),
  body('description').optional().trim(),
  body('dueDate').optional().isISO8601().toDate(),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('labels').optional().isArray(),
  body('labels.*.name').optional().trim(),
  body('labels.*.color').optional().trim(),
  body('attachments').optional().isArray(),
  body('attachments.*.name').optional().trim(),
  body('attachments.*.url').optional().trim(),
  body('assignedTo').optional().isArray(),
  body('isArchived').optional().isBoolean(),
  
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const card = await Card.findById(req.params.id);
      if (!card) {
        return res.status(404).json({ message: "Card not found" });
      }

      // Verify team membership through list
      const list = await List.findById(card.listId);
      const team = await Team.findOne({
        _id: list.teamId,
        'members.user': req.user._id
      });

      if (!team) {
        return res.status(403).json({ message: "Not authorized to update this card" });
      }

      const updateData = {
        ...(req.body.cardTitle && { cardTitle: req.body.cardTitle }),
        ...(req.body.description !== undefined && { description: req.body.description }),
        ...(req.body.dueDate && { dueDate: req.body.dueDate }),
        ...(req.body.priority && { priority: req.body.priority }),
        ...(req.body.labels && { labels: req.body.labels }),
        ...(req.body.attachments && { attachments: req.body.attachments }),
        ...(req.body.assignedTo && { assignedTo: req.body.assignedTo }),
        ...(req.body.isArchived !== undefined && { isArchived: req.body.isArchived }),
        updatedAt: new Date()
      };

      const updatedCard = await Card.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      );

      res.json(updatedCard);
    } catch (error) {
      res.status(500).json({ message: "Error updating card", error: error.message });
    }
  }
];

// Delete card
exports.deleteCard = async (req, res) => {
  try {
    const card = await Card.findById(req.params.id);
    if (!card) {
      return res.status(404).json({ message: "Card not found" });
    }

    // Verify team membership through list
    const list = await List.findById(card.listId);
    const team = await Team.findOne({
      _id: list.teamId,
      'members.user': req.user._id
    });

    if (!team) {
      return res.status(403).json({ message: "Not authorized to delete this card" });
    }

    await card.remove();

    // Reorder remaining cards in the list
    const remainingCards = await Card.find({ listId: card.listId })
      .sort({ position: 1 });
    
    const updatePromises = remainingCards.map((card, index) => {
      return Card.findByIdAndUpdate(
        card._id,
        { position: (index + 1) * 1000 },
        { new: true }
      );
    });

    await Promise.all(updatePromises);

    res.json({ message: "Card deleted successfully", cardId: req.params.id });
  } catch (error) {
    res.status(500).json({ message: "Error deleting card" });
  }
};
