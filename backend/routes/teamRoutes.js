const express = require('express');
const router = express.Router();
const upload = require("../utils/multer");
const {isAuthenticatedUser} = require("../middleware/auth") 

const { 
    addTeam,
    getTeamByUser,
    deleteTeamById
} = require('../controllers/TeamController');

router.post('/addTeam', upload.single('logo'), addTeam);
router.get('/getTeamByUser/:userId', getTeamByUser);
router.delete('/deleteTeam/:teamId', isAuthenticatedUser, deleteTeamById);

module.exports = router