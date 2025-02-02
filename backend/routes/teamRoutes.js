const express = require('express');
const router = express.Router();
const upload = require("../utils/multer");
const {isAuthenticatedUser} = require("../middleware/auth") 

const { 
    addTeam,
    getTeamByUser,
    getTeamById,
    deleteTeamById
} = require('../controllers/TeamController');

router.post('/addTeam', upload.single('logo'), addTeam);
router.get('/getTeamByUser/:userId', getTeamByUser);
router.get('/getTeamById/:teamId', getTeamById);
router.delete('/deleteTeam/:teamId', isAuthenticatedUser, deleteTeamById);

module.exports = router