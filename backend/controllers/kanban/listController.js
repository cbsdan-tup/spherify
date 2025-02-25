const List = require('../../models/kanban/List');
const Team = require('../../models/Team').Team;
const { body, validationResult } = require('express-validator');
const isTooClose = require('../../utils/isTooClose');
const recalcItemsPos = require('../../utils/recalcItemsPos');

// Get list
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
      return res.status(403).json({ message: "Not authorized" });
    }

    res.json(list);
  } catch (error) {
    res.status(500).json({ message: "Error fetching list" });
  }
};

// Create list
exports.createList = [
  body('listTitle').trim().isLength({ min: 1 }).withMessage('Title is required'),
  body('teamId').notEmpty().withMessage('Team ID is required'),
  body('position').optional().isNumeric(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const position = req.body.position || (await List.countDocuments()) * 16384;
      
      if (isTooClose(position)) {
        await recalcItemsPos({ teamId: req.body.teamId }, List);
      }

      const list = await List.create({
        listTitle: req.body.listTitle,
        teamId: req.body.teamId,
        position,
        createdBy: req.user._id
      });

      res.status(201).json(list);
    } catch (error) {
      res.status(500).json({ message: "Error creating list" });
    }
  }
];

// Update list
exports.updateList = [
  body('listTitle').optional().trim(),
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

      // Check if position needs recalculation
      if (req.body.position && isTooClose(req.body.position)) {
        await recalcItemsPos({ teamId: list.teamId }, List);
        return res.json(await List.find({ teamId: list.teamId }).sort({ position: 1 }));
      }

      const updatedList = await List.findByIdAndUpdate(
        req.params.id,
        { 
          $set: {
            ...req.body,
            updatedAt: new Date()
          }
        },
        { new: true }
      );

      res.json(updatedList);
    } catch (error) {
      res.status(500).json({ message: "Error updating list" });
    }
  }
];

// Delete list
exports.deleteList = async (req, res) => {
  try {
    const list = await List.findByIdAndDelete(req.params.id);
    if (!list) {
      return res.status(404).json({ message: "List not found" });
    }
    res.json({ message: "List deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting list" });
  }
};