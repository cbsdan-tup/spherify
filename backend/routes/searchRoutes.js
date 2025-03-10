const express = require('express');
const router = express.Router();
const { isAuthenticatedUser } = require('../middleware/auth');
const { searchUsers, searchAllTeams } = require('../controllers/SearchController');

// Apply authentication middleware
router.use(isAuthenticatedUser);

// Search routes
router.get('/search/users', searchUsers);
router.get('/search/teams', searchAllTeams);

module.exports = router;
