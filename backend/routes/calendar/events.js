const express = require('express');
const router = express.Router();
const { isAuthenticatedUser } = require("../../middleware/auth");
const { 
    getEventsByTeam,
    createEvent,
    updateEvent,
    deleteEvent
} = require('../../controllers/calendar/EventController');

// Ensure all exported functions exist and are properly named
router.get('/getEventsByTeam/:teamId', isAuthenticatedUser, getEventsByTeam);
router.post('/createEvent', isAuthenticatedUser, createEvent);
router.put('/updateEvent/:eventId', isAuthenticatedUser, updateEvent);
router.delete('/deleteEvent/:eventId', isAuthenticatedUser, deleteEvent);

module.exports = router;