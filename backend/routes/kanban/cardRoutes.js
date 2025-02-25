const express = require('express');
const router = express.Router();
const { isAuthenticatedUser } = require('../../middleware/auth');
const { 
    getCard,
    createCard,
    updateCard,
    deleteCard
} = require('../../controllers/kanban/cardController');

router.get('/getCard/:id', isAuthenticatedUser, getCard);
router.post('/createCard', isAuthenticatedUser, createCard);
router.put('/updateCard/:id', isAuthenticatedUser, updateCard);
router.delete('/deleteCard/:id', isAuthenticatedUser, deleteCard);

module.exports = router;
