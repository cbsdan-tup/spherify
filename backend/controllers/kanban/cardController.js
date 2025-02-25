const Card = require('../../models/kanban/Card');
const Team = require('../../models/Team').Team;
const { body, validationResult } = require('express-validator');
const isTooClose = require('../../utils/isTooClose');
const recalcItemsPos = require('../../utils/recalcItemsPos');

// Get card by ID
exports.getCard = async (req, res) => {
  try {
    const card = await Card.findById(req.params.id)
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email');

    if (!card) {
      return res.status(404).json({ message: "Card not found" });
    }

    // Verify team membership
    const team = await Team.findOne({
      _id: card.teamId,
      'members.user': req.user._id
    });
    
    if (!team) {
      return res.status(403).json({ message: "Not authorized to access this card" });
    }

    res.json(card);
  } catch (error) {
    res.status(500).json({ message: "Error fetching card", error: error.message });
  }
};

// Create new card
exports.createCard = [
  body('cardTitle').trim().isLength({ min: 1 }).withMessage('Title must not be empty'),
  body('position').isNumeric().withMessage('Card position must be a number'),
  body('listId').notEmpty().withMessage('List ID is required'),
  body('boardId').notEmpty().withMessage('Board ID is required'),
  body('teamId').notEmpty().withMessage('Team ID is required'),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Verify team membership
      const team = await Team.findOne({
        _id: req.body.teamId,
        'members.user': req.user._id
      });
      
      if (!team) {
        return res.status(403).json({ message: "Not authorized to create cards in this team" });
      }

      const newCard = await Card.create({
        ...req.body,
        createdBy: req.user._id
      });

      const populatedCard = await Card.findById(newCard._id)
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email');

      res.status(201).json(populatedCard);
    } catch (error) {
      res.status(500).json({ message: "Error creating card", error: error.message });
    }
  }
];

// Update card
exports.updateCard = [
  body('cardTitle').optional().trim().isLength({ min: 1 }),
  body('position').optional().isNumeric(),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),

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

      // Verify team membership
      const team = await Team.findOne({
        _id: card.teamId,
        'members.user': req.user._id
      });
      
      if (!team) {
        return res.status(403).json({ message: "Not authorized to update this card" });
      }

      const newPos = req.body.position;
      if (newPos && isTooClose(newPos)) {
        const cards = await recalcItemsPos({ listId: card.listId }, Card);
        return res.json(cards);
      }

      const updatedCard = await Card.findByIdAndUpdate(
        req.params.id,
        { 
          ...req.body,
          updatedAt: new Date()
        },
        { new: true }
      )
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email');

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

    // Verify team membership
    const team = await Team.findOne({
      _id: card.teamId,
      'members.user': req.user._id
    });
    
    if (!team) {
      return res.status(403).json({ message: "Not authorized to delete this card" });
    }

    await Card.findByIdAndUpdate(req.params.id, { isArchived: true });
    res.json({ message: "Card archived successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting card", error: error.message });
  }
};