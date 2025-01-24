const express = require('express');
const router = express.Router();
const upload = require("../utils/multer");
const {isAuthenticatedUser} = require("../middleware/auth") 

const { 
    registerUser,
    getUser
} = require('../controllers/UserController');

router.post('/register', upload.single('avatar'), registerUser);
router.post('/getUserInfo', getUser);

module.exports = router