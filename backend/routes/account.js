const express = require('express');
const router = express.Router();
const upload = require("../utils/multer");
const {isAuthenticatedUser} = require("../middleware/auth") 

const { 
    registerUser,
    getUser,
    getUserByEmail,
    updateUserAvatar
} = require('../controllers/UserController');

router.get('/getUserByEmail/:email', getUserByEmail);
router.post('/register', upload.single('avatar'), registerUser);
router.post('/getUserInfo', getUser);
router.put("/updateAvatar/:id", isAuthenticatedUser, upload.single('avatar'), updateUserAvatar);

module.exports = router