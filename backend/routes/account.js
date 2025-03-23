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
    getPastUsersChartData,
    isAdminExists,
    disableUser,
    enableUser,
    getAllUsers,
    logUserLogin,
    getUserDetails,
    verifyOTP,
    resendOTP,
    deletePermissionToken
} = require('../controllers/UserController');

router.get('/getUserByEmail/:email', getUserByEmail);
router.post('/register', upload.single('avatar'), registerUser);
router.post('/getUserInfo', getUser);
router.get('/getUserStatistics', isAdmin, getUserStatistics);
router.get('/getPastUsersChartData', isAdmin, getPastUsersChartData);
router.put("/updateAvatar/:id", isAuthenticatedUser, upload.single('avatar'), updateUserAvatar);
router.put("/updateUser/:id", isAuthenticatedUser, updateUser);

router.put('/disableUser/:id', isAdmin, disableUser);
router.put('/enableUser/:id', isAdmin, enableUser);
router.get('/users', isAdmin, getAllUsers);

router.get('/isAdminExists', isAdminExists);
router.post('/logLogin/:userId', logUserLogin);

router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);
// Add this new route for getting user by ID
router.get('/user/:id', isAuthenticatedUser, getUserDetails);
router.put('/remove-permission-token/:userId', deletePermissionToken);


module.exports = router