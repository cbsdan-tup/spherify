const Board = require('../../models/kanban/Board');
const List = require('../../models/kanban/List');
const Card = require('../../models/kanban/Card');
const SubTask = require('../../models/kanban/SubTask');
const Team = require('../../models/Team').Team;
const { Types } = require('mongoose');
const { body, validationResult } = require('express-validator');

// Get all user's boards
exports.get_user_boards = async (req, res) => {
  try {
    const userId = Types.ObjectId(req.user.id);
    const boards = await Board.find({ creatorId: userId });

    res.send(boards);
  } catch (error) {
    res.sendStatus(404);
  }
};

// Get boards by team
exports.get_team_boards = async (req, res) => {
  try {
    const { teamId } = req.params;
    
    // Verify team membership
    const team = await Team.findOne({
      _id: teamId,
      'members.user': req.user._id
    });
    
    if (!team) {
      return res.status(403).json({ message: "Not authorized to access this team's boards" });
    }

    const boards = await Board.find({ 
      teamId,
      isArchived: false 
    });

    res.json(boards);
  } catch (error) {
    res.status(500).json({ message: "Error fetching boards", error: error.message });
  }
};

// Get selected board lists, cards and subtasks on GET
exports.board_get = async (req, res) => {
  try {
    const boardId = Types.ObjectId(req.params.id);

    const board = await Board.aggregate([
      {
        $match: { 
          _id: boardId,
          isArchived: false
        },
      },
      {
        $lookup: {
          from: 'lists',
          let: { boardId: '$_id' },
          pipeline: [
            { 
              $match: { 
                $expr: { $eq: ['$boardId', '$$boardId'] },
                isArchived: false
              }
            },
            { $sort: { position: 1 } }
          ],
          as: 'lists',
        },
      },
      {
        $lookup: {
          from: 'cards',
          let: { boardId: '$_id' },
          pipeline: [
            { 
              $match: { 
                $expr: { $eq: ['$boardId', '$$boardId'] },
                isArchived: false
              }
            },
            { $sort: { position: 1 } },
            {
              $lookup: {
                from: 'subtasks',
                let: { cardId: '$_id' },
                pipeline: [
                  {
                    $match: { $expr: { $eq: ['$cardId', '$$cardId'] } },
                  },
                  { $sort: { position: 1 } }
                ],
                as: 'subtasks',
              },
            },
          ],
          as: 'cards',
        },
      },
    ]);

    if (!board.length) {
      return res.status(404).json({ message: "Board not found" });
    }

    // Verify team membership
    const team = await Team.findOne({
      _id: board[0].teamId,
      'members.user': req.user._id
    });
    
    if (!team) {
      return res.status(403).json({ message: "Not authorized to access this board" });
    }

    res.json(board[0]);
  } catch (error) {
    res.status(500).json({ message: "Error fetching board details", error: error.message });
  }
};

// Create board on POST
exports.create_board_post = [
  body('boardTitle').trim().isLength({ min: 1, max: 64 }).withMessage('Title must be between 1 and 64 characters'),
  body('teamId').notEmpty().withMessage('Team ID is required'),
  body('description').optional().trim(),
  body('background').optional(),

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
        return res.status(403).json({ message: "Not authorized to create boards in this team" });
      }

      const board = await Board.create({
        teamId: req.body.teamId,
        boardTitle: req.body.boardTitle,
        description: req.body.description,
        createdBy: req.user._id,
        background: req.body.background || { type: 'color', value: '#FFFFFF' }
      });

      res.status(201).json(board);
    } catch (error) {
      res.status(500).json({ message: "Error creating board", error: error.message });
    }
  }
];

// Handle board delete on DELETE
exports.board_delete = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    // Verify team membership
    const team = await Team.findOne({
      _id: board.teamId,
      'members.user': req.user._id
    });
    
    if (!team) {
      return res.status(403).json({ message: "Not authorized to delete this board" });
    }

    // Soft delete board and related items
    await Promise.all([
      Board.findByIdAndUpdate(req.params.id, { isArchived: true }),
      List.updateMany({ boardId: req.params.id }, { isArchived: true }),
      Card.updateMany({ boardId: req.params.id }, { isArchived: true })
    ]);

    res.json({ message: "Board archived successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting board", error: error.message });
  }
};

// Handle board update on PATCH
exports.update_board_patch = [
  body('boardTitle').optional().trim().isLength({ min: 1, max: 64 }),
  body('description').optional().trim(),
  body('background').optional(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Verify team membership first
      const existingBoard = await Board.findById(req.params.id);
      if (!existingBoard) {
        return res.status(404).json({ message: "Board not found" });
      }

      const team = await Team.findOne({
        _id: existingBoard.teamId,
        'members.user': req.user._id
      });
      
      if (!team) {
        return res.status(403).json({ message: "Not authorized to update this board" });
      }

      const updatedBoard = await Board.findByIdAndUpdate(
        req.params.id,
        {
          $set: {
            ...req.body,
            updatedAt: new Date()
          }
        },
        { new: true }
      );

      res.json(updatedBoard);
    } catch (error) {
      res.status(500).json({ message: "Error updating board", error: error.message });
    }
  }
];