const List = require('../../models/kanban/List');
const Card = require('../../models/kanban/Card'); // Add this line
const Team = require('../../models/Team').Team;
const { body, validationResult } = require('express-validator');

// Get all lists for a team
exports.getLists = async (req, res) => {
  try {
    const { teamId } = req.params;

    // Verify team membership
    const team = await Team.findOne({
      _id: teamId,
      'members.user': req.user._id
    });

    if (!team) {
      return res.status(403).json({ message: "Not authorized to access this team's lists" });
    }

    // Get lists with their cards
    const lists = await List.find({ teamId }).sort({ position: 1 });
    
    // Fetch cards for each list in a single query
    const cards = await Card.find({ 
      teamId,
      listId: { $in: lists.map(list => list._id) }
    })
    .populate('assignedTo', 'firstName lastName avatar')
    .sort({ position: 1 });

    // Group cards by listId
    const cardsByList = cards.reduce((acc, card) => {
      if (!acc[card.listId]) {
        acc[card.listId] = [];
      }
      acc[card.listId].push(card);
      return acc;
    }, {});

    // Attach cards to their lists
    const listsWithCards = lists.map(list => ({
      ...list.toObject(),
      cards: cardsByList[list._id] || []
    }));

    res.json(listsWithCards);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching lists",
      error: error.message
    });
  }
};

// Create new list
exports.createList = async (req, res) => {
  try {
    const { teamId, title } = req.body;

    if (!title || !teamId) {
      return res.status(400).json({ message: "Title and teamId are required" });
    }

    // Log the request data for debugging
    console.log('Request body:', req.body);
    console.log('User:', req.user);

    // Verify team membership
    const team = await Team.findOne({
      _id: teamId,
      'members.user': req.user._id
    });

    if (!team) {
      return res.status(403).json({ message: "Not authorized to create lists for this team" });
    }

    const position = (await List.countDocuments({ teamId })) * 1000;

    const list = new List({
      title,
      teamId,
      position,
      createdBy: req.user._id
    });

    const savedList = await list.save();
    console.log('Saved list:', savedList);
    
    res.status(201).json(savedList);

  } catch (error) {
    console.error('Error creating list:', error);
    res.status(500).json({
      message: "Error creating list",
      error: error.message
    });
  }
};

// Update list
exports.updateList = [
  // Validation
  body('title').optional().trim().isLength({ min: 1 }),
  body('position').optional().isNumeric(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { listId } = req.params;
      const list = await List.findById(listId);

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

      const updatedList = await List.findByIdAndUpdate(
        listId,
        { 
          ...req.body,
          updatedAt: new Date()
        },
        { new: true }
      );

      res.json(updatedList);
    } catch (error) {
      res.status(500).json({
        message: "Error updating list",
        error: error.message
      });
    }
  }
];

// Add this new controller method
exports.updateListPositions = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { lists } = req.body; // Array of lists in their new order

    // Verify team membership
    const team = await Team.findOne({
      _id: teamId,
      'members.user': req.user._id
    });

    if (!team) {
      return res.status(403).json({ message: "Not authorized to update lists for this team" });
    }

    // Update positions for all lists
    const updatePromises = lists.map((list, index) => {
      const newPosition = index * 1000; // Calculate new position with 1000 increment
      return List.findByIdAndUpdate(
        list._id,
        { 
          position: newPosition,
          updatedAt: new Date()
        },
        { new: true }
      );
    });

    await Promise.all(updatePromises);
    
    // Return updated lists in new order
    const updatedLists = await List.find({ teamId }).sort({ position: 1 });
    res.json(updatedLists);

  } catch (error) {
    console.error('Error updating list positions:', error);
    res.status(500).json({
      message: "Error updating list positions",
      error: error.message
    });
  }
};

// Add this new controller method
exports.getListsWithCards = async (req, res) => {
  try {
    const { teamId } = req.params;

    // Verify team membership
    const team = await Team.findOne({
      _id: teamId,
      'members.user': req.user._id
    });

    if (!team) {
      return res.status(403).json({ message: "Not authorized to access this team's lists" });
    }

    // Get lists with populated cards
    const lists = await List.find({ teamId })
      .sort({ position: 1 })
      .lean(); // Use lean() for better performance

    // Fetch all cards for this team in one query
    const cards = await Card.find({ teamId })
      .populate('assignedTo', 'firstName lastName avatar')
      .sort({ position: 1 })
      .lean();

    // Group cards by listId
    const cardsByList = cards.reduce((acc, card) => {
      if (!acc[card.listId]) {
        acc[card.listId] = [];
      }
      acc[card.listId].push(card);
      return acc;
    }, {});

    // Attach cards to their respective lists
    const listsWithCards = lists.map(list => ({
      ...list,
      cards: cardsByList[list._id] || []
    }));

    res.json(listsWithCards);
  } catch (error) {
    console.error('Error fetching lists with cards:', error);
    res.status(500).json({
      message: "Error fetching lists with cards",
      error: error.message
    });
  }
};

// Delete list
exports.deleteList = async (req, res) => {
  try {
    const { listId } = req.params;
    const list = await List.findById(listId);

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

    await List.findByIdAndDelete(listId);
    res.json({ message: "List deleted successfully", listId });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting list",
      error: error.message
    });
  }
};