const express = require('express');
const router = express.Router();
const { isAuthenticatedUser } = require("../middleware/auth");

const {
  createDocument,
  getDocumentsByTeamId,
  softDeleteDocument,
  renameDocument, // Add this import
  restoreDocument // Add this import
} = require('../controllers/DocumentController');

// Get all documents for a specific team
router.get('/getDocuments/:teamId', isAuthenticatedUser, getDocumentsByTeamId);

// Create a new document
router.post('/createDocument/:teamId', isAuthenticatedUser, createDocument);

// Soft delete a document
router.delete('/softDeleteDocument/:documentId', isAuthenticatedUser, softDeleteDocument);

// Rename a document - add this new route
router.put('/renameDocument/:documentId', isAuthenticatedUser, renameDocument);

// Add this new route for restoring documents
router.put('/restoreDocument/:documentId', isAuthenticatedUser, restoreDocument);

module.exports = router;