const express = require('express');
const router = express.Router();
const { isAuthenticatedUser } = require('../../middleware/auth');
const {
    getCard,
    getAllCardsByList,
    createCard,
    updateCard,
    deleteCard,
    updateCardPositions
} = require('../../controllers/kanban/cardController');

router.get('/getCards/:teamId/:listId', isAuthenticatedUser, getAllCardsByList);
router.post('/createCard', isAuthenticatedUser, createCard);
router.put('/updateCard/:cardId', isAuthenticatedUser, updateCard);
router.delete('/deleteCard/:cardId', isAuthenticatedUser, deleteCard);
router.put('/updateCardPositions/:teamId', isAuthenticatedUser, updateCardPositions);

module.exports = router;
