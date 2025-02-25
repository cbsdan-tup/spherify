const List = require('../../models/kanban/List');
const Card = require('../../models/kanban/Card');
const Team = require('../../models/Team').Team;
const { body, validationResult } = require('express-validator');
const isTooClose = require('../../utils/isTooClose');
const recalcItemsPos = require('../../utils/recalcItemsPos');

// Get list by ID
exports.getList = async (req, res) => {
  try {
    const list = await List.findById(req.params.id);
    if (!list) {
      return res.status(404).json({ message: "List not found" });
    }

    // Verify team membership
    const team = await Team.findOne({
      _id: list.teamId,
      'members.user': req.user._id
    });
    
    if (!team) {
      return res.status(403).json({ message: "Not authorized to access this list" });
    }

    res.json(list);
  } catch (error) {
    res.status(500).json({ message: "Error fetching list", error: error.message });
  }
};

// Create new list
exports.createList = [
  body('listTitle').trim().isLength({ min: 1, max: 64 }).withMessage('Title must be between 1 and 64 characters'),
  body('position').isNumeric().withMessage('Position must be a number'),
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
        return res.status(403).json({ message: "Not authorized to create lists in this team" });
      }

      const newList = await List.create({
        ...req.body,
        createdBy: req.user._id
      });

      res.status(201).json(newList);
    } catch (error) {
      res.status(500).json({ message: "Error creating list", error: error.message });
    }
  }
];

// Update list
exports.updateList = [
  body('listTitle').optional().trim().isLength({ min: 1, max: 64 }),
  body('position').optional().isNumeric(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const list = await List.findById(req.params.id);
      if (!list) {
        return res.status(404).json({ message: "List not found" });
      }

      // Verify team membership
      const team = await Team.findOne({
        _id: list.teamId,
        'members.user': req.user._id
      });
      
      if (!team) {
        return res.status(403).json({ message: "Not authorized to update this list" });
      }

      const newPos = req.body.position;
      if (newPos && isTooClose(newPos)) {
        const lists = await recalcItemsPos({ boardId: list.boardId }, List);
        return res.json(lists);
      }

      const updatedList = await List.findByIdAndUpdate(
        req.params.id,
        { 
          ...req.body,
          updatedAt: new Date()
        },
        { new: true }
      );

      res.json(updatedList);
    } catch (error) {
      res.status(500).json({ message: "Error updating list", error: error.message });
    }
  }
];

// Delete list
exports.deleteList = async (req, res) => {
  try {
    const list = await List.findById(req.params.id);
    if (!list) {
      return res.status(404).json({ message: "List not found" });
    }

    // Verify team membership
    const team = await Team.findOne({
      _id: list.teamId,
      'members.user': req.user._id
    });
    
    if (!team) {
      return res.status(403).json({ message: "Not authorized to delete this list" });
    }

    // Soft delete list and its cards
    await Promise.all([
      List.findByIdAndUpdate(req.params.id, { isArchived: true }),
      Card.updateMany({ listId: req.params.id }, { isArchived: true })
    ]);

    res.json({ message: "List archived successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting list", error: error.message });
  }
};