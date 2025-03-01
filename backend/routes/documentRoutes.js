const express = require('express');
const router = express.Router();
const { isAuthenticatedUser } = require("../middleware/auth");

const {
  createDocument,
  getDocumentsByTeamId,
  softDeleteDocument, // Import softDeleteDocument from your controller
} = require('../controllers/DocumentController');

// Get all documents for a specific team
router.get('/getDocuments/:teamId', isAuthenticatedUser, getDocumentsByTeamId);

// Create a new document
router.post('/createDocument/:teamId', isAuthenticatedUser, createDocument);

// Soft delete a document
router.delete('/softDeleteDocument/:documentId', isAuthenticatedUser, softDeleteDocument);

module.exports = router;
