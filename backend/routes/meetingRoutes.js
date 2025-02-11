const express = require("express");
const Meeting = require("../models/Meeting");
const router = express.Router();

router.post("/meetings/create", async (req, res) => {
    try {
      const { roomName, createdBy, teamId } = req.body; 
  
      if (!teamId) {
        return res.status(400).json({ error: "teamId is required" });
      }
  
      const meeting = new Meeting({ roomName, createdBy, teamId });
      await meeting.save();
  
      res.status(201).json(meeting);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  

router.get("/meetings/:teamId", async (req, res) => {
    try {
      const { teamId } = req.params;
  
      const meetings = await Meeting.find({ teamId }).populate("createdBy", "firstName lastName");
  
      res.json(meetings);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  

module.exports = router;
