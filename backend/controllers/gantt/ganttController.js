const GanttTask = require('../../models/gantt/gantt');
const Team = require('../../models/Team').Team;
const { body, validationResult } = require('express-validator');

// Get all tasks for a team
exports.getTasks = async (req, res) => {
  try {
    const { teamId } = req.params;

    // Verify team membership
    const team = await Team.findOne({
      _id: teamId,
      'members.user': req.user._id
    });

    if (!team) {
      return res.status(403).json({ message: "Not authorized to access this team's tasks" });
    }

    const tasks = await GanttTask.find({ team: teamId });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching tasks",
      error: error.message
    });
  }
};

// Create new task
exports.createTask = [
  // Validation
  body('title').trim().isLength({ min: 1 }).withMessage('Title is required'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required'),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { teamId, title, startDate, endDate } = req.body;

      // Verify team membership
      const team = await Team.findOne({
        _id: teamId,
        'members.user': req.user._id
      });

      if (!team) {
        return res.status(403).json({ message: "Not authorized to create tasks for this team" });
      }

      // Validate dates
      if (new Date(endDate) <= new Date(startDate)) {
        return res.status(400).json({
          message: "End date must be after start date"
        });
      }

      const task = new GanttTask({
        team: teamId,
        title,
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      });

      await task.save();
      res.status(201).json(task);
    } catch (error) {
      res.status(500).json({
        message: "Error creating task",
        error: error.message
      });
    }
  }
];

// Update task
exports.updateTask = [
  // Validation
  body('title').optional().trim().isLength({ min: 1 }),
  body('startDate').optional().isISO8601(),
  body('endDate').optional().isISO8601(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { taskId } = req.params;
      const task = await GanttTask.findById(taskId);

      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Verify team membership
      const team = await Team.findOne({
        _id: task.team,
        'members.user': req.user._id
      });

      if (!team) {
        return res.status(403).json({ message: "Not authorized to update this task" });
      }

      // Validate dates if both are provided
      if (req.body.startDate && req.body.endDate) {
        if (new Date(req.body.endDate) <= new Date(req.body.startDate)) {
          return res.status(400).json({
            message: "End date must be after start date"
          });
        }
      }

      const updatedTask = await GanttTask.findByIdAndUpdate(
        taskId,
        { ...req.body },
        { new: true }
      );

      res.json(updatedTask);
    } catch (error) {
      res.status(500).json({
        message: "Error updating task",
        error: error.message
      });
    }
  }
];

// Delete task
exports.deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await GanttTask.findById(taskId);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Verify team membership
    const team = await Team.findOne({
      _id: task.team,
      'members.user': req.user._id
    });

    if (!team) {
      return res.status(403).json({ message: "Not authorized to delete this task" });
    }

    await GanttTask.findByIdAndDelete(taskId);
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting task",
      error: error.message
    });
  }
};
