const Card = require('../../models/kanban/Card');
const Team = require('../../models/Team').Team;
const { body, validationResult } = require('express-validator');
const isTooClose = require('../../utils/isTooClose');
const recalcItemsPos = require('../../utils/recalcItemsPos');

// Get card
exports.getCard = async (req, res) => {
  try {
    const card = await Card.findById(req.params.id);
    if (!card) {
      return res.status(404).json({ message: "Card not found" });
    }
    res.json(card);
  } catch (error) {
    res.status(500).json({ message: "Error fetching card" });
  }
};

// Create card
exports.createCard = [
  body('cardTitle').trim().isLength({ min: 1 }).withMessage('Title is required'),
  body('listId').notEmpty().withMessage('List ID is required'),
  body('teamId').notEmpty().withMessage('Team ID is required'),
  body('position').optional().isNumeric(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const position = req.body.position || 
        (await Card.countDocuments({ listId: req.body.listId })) * 16384;

      if (isTooClose(position)) {
        await recalcItemsPos({ listId: req.body.listId }, Card);
      }

      const card = await Card.create({
        cardTitle: req.body.cardTitle,
        listId: req.body.listId,
        teamId: req.body.teamId,
        position,
        createdBy: req.user._id
      });

      res.status(201).json(card);
    } catch (error) {
      res.status(500).json({ message: "Error creating card" });
    }
  }
];

// Update card position
exports.updateCard = [
  body('cardTitle').optional().trim(),
  body('listId').optional(),
  body('position').optional().isNumeric(),

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

      // Handle position recalculation for both same list and different list moves
      if (req.body.position && isTooClose(req.body.position)) {
        const listId = req.body.listId || card.listId;
        await recalcItemsPos({ listId }, Card);
        return res.json(await Card.find({ listId }).sort({ position: 1 }));
      }

      const updatedCard = await Card.findByIdAndUpdate(
        req.params.id,
        { 
          $set: {
            ...req.body,
            updatedAt: new Date()
          }
        },
        { new: true }
      );

      res.json(updatedCard);
    } catch (error) {
      res.status(500).json({ message: "Error updating card" });
    }
  }
];

// Delete card
exports.deleteCard = async (req, res) => {
  try {
    const card = await Card.findByIdAndDelete(req.params.id);
    if (!card) {
      return res.status(404).json({ message: "Card not found" });
    }
    res.json({ message: "Card deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting card" });
  }
};
