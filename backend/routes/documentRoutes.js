const express = require('express');
const router = express.Router();
const {isAuthenticatedUser} = require("../middleware/auth") 

const {
    createDocument,
    getDocumentsByTeamId
} = require('../controllers/DocumentController');

router.get('/getDocuments/:teamId', isAuthenticatedUser, getDocumentsByTeamId);
router.post('/createDocument/:teamId', isAuthenticatedUser, createDocument);

module.exports = router