const express = require('express');
const router = express.Router();
const upload = require("../utils/multer");
const {isAuthenticatedUser, isAdmin} = require("../middleware/auth") 

const { 
    registerUser,
    getUser,
    getUserByEmail,
    updateUserAvatar,
    updateUser,
    getUserStatistics,
    getPastUsersChartData
} = require('../controllers/UserController');

router.get('/getUserByEmail/:email', getUserByEmail);
router.post('/register', upload.single('avatar'), registerUser);
router.post('/getUserInfo', getUser);
router.get('/getUserStatistics', isAdmin, getUserStatistics);
router.get('/getPastUsersChartData', isAdmin, getPastUsersChartData);
router.put("/updateAvatar/:id", isAuthenticatedUser, upload.single('avatar'), updateUserAvatar);
router.put("/updateUser/:id", isAuthenticatedUser, updateUser);

module.exports = router