const SubTask = require('../../models/kanban/SubTask');
const Team = require('../../models/Team').Team;
const { body, validationResult } = require('express-validator');
const isTooClose = require('../../utils/isTooClose');
const recalcItemsPos = require('../../utils/recalcItemsPos');

// Get subtask by ID
exports.getSubtaskById = async (req, res) => {
  try {
    const subtask = await SubTask.findById(req.params.id)
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email');

    if (!subtask) {
      return res.status(404).json({ message: "Subtask not found" });
    }

    // Verify team membership
    const team = await Team.findOne({
      _id: subtask.teamId,
      'members.user': req.user._id
    });
    
    if (!team) {
      return res.status(403).json({ message: "Not authorized to access this subtask" });
    }

    res.json(subtask);
  } catch (error) {
    res.status(500).json({ message: "Error fetching subtask", error: error.message });
  }
};

// Create subtask
exports.createSubtask = [
  body('taskName').trim().isLength({ min: 1, max: 64 }).withMessage('Task name must be between 1 and 64 characters'),
  body('position').isNumeric().withMessage('Position must be a number'),
  body('cardId').notEmpty().withMessage('Card ID is required'),
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
        return res.status(403).json({ message: "Not authorized to create subtasks in this team" });
      }

      const newSubTask = await SubTask.create({
        ...req.body,
        createdBy: req.user._id
      });

      const populatedSubTask = await SubTask.findById(newSubTask._id)
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email');

      res.status(201).json(populatedSubTask);
    } catch (error) {
      res.status(500).json({ message: "Error creating subtask", error: error.message });
    }
  }
];

// Update subtask
exports.updateSubtaskById = [
  body('taskName').optional().trim().isLength({ min: 1, max: 64 }),
  body('position').optional().isNumeric(),
  body('isDone').optional().isBoolean(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const subtask = await SubTask.findById(req.params.id);
      if (!subtask) {
        return res.status(404).json({ message: "Subtask not found" });
      }

      // Verify team membership
      const team = await Team.findOne({
        _id: subtask.teamId,
        'members.user': req.user._id
      });
      
      if (!team) {
        return res.status(403).json({ message: "Not authorized to update this subtask" });
      }

      const newPos = req.body.position;
      if (newPos && isTooClose(newPos)) {
        const subtasks = await recalcItemsPos({ cardId: subtask.cardId }, SubTask);
        return res.json(subtasks);
      }

      const updatedSubTask = await SubTask.findByIdAndUpdate(
        req.params.id,
        { 
          ...req.body,
          updatedAt: new Date()
        },
        { new: true }
      )
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email');

      res.json(updatedSubTask);
    } catch (error) {
      res.status(500).json({ message: "Error updating subtask", error: error.message });
    }
  }
];

// Delete subtask
exports.deleteSubtaskById = async (req, res) => {
  try {
    const subtask = await SubTask.findById(req.params.id);
    if (!subtask) {
      return res.status(404).json({ message: "Subtask not found" });
    }

    // Verify team membership
    const team = await Team.findOne({
      _id: subtask.teamId,
      'members.user': req.user._id
    });
    
    if (!team) {
      return res.status(403).json({ message: "Not authorized to delete this subtask" });
    }

    await SubTask.findByIdAndDelete(req.params.id);
    res.json({ message: "Subtask deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting subtask", error: error.message });
  }
};