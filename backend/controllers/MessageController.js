const { MessageGroup, Team } = require("../models/Team");
const mongoose = require("mongoose");

// Create a new message group
exports.createMessageGroup = async (req, res) => {
  try {
    const { teamId, name, members = [], createdBy, isGeneral = false } = req.body;

    // Validate required fields
    if (!teamId || !name) {
      return res.status(400).json({ message: "Team ID and name are required." });
    }

    // Check if team exists
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found." });
    }

    // Create message group
    const newMessageGroup = new MessageGroup({
      team: teamId,
      name,
      members,
      isGeneral,
      createdBy
    });

    // Save message group to DB
    await newMessageGroup.save();

    // Add message group to team
    team.messageGroups.push(newMessageGroup._id);
    await team.save();

    res.status(201).json({ message: "Message group created successfully", messageGroup: newMessageGroup });
  } catch (error) {
    console.error("Error creating message group:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// Read message groups by team ID
exports.getMessageGroupsByTeam = async (req, res) => {
  try {
    const { teamId } = req.params;

    // Validate team ID
    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(400).json({ message: "Invalid team ID." });
    }

    // Find message groups
    const messageGroups = await MessageGroup.find({ team: teamId }).populate("members", "fname lname email");

    res.status(200).json(messageGroups);
  } catch (error) {
    console.error("Error fetching message groups:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// Edit a message group
exports.editMessageGroup = async (req, res) => {
  try {
    const { messageGroupId } = req.params;
    const { name, members } = req.body;

    // Validate message group ID
    if (!mongoose.Types.ObjectId.isValid(messageGroupId)) {
      return res.status(400).json({ message: "Invalid message group ID." });
    }

    // Find and update message group
    const updatedMessageGroup = await MessageGroup.findByIdAndUpdate(
      messageGroupId,
      { name, members },
      { new: true }
    );

    if (!updatedMessageGroup) {
      return res.status(404).json({ message: "Message group not found." });
    }

    res.status(200).json({ message: "Message group updated successfully", messageGroup: updatedMessageGroup });
  } catch (error) {
    console.error("Error updating message group:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// Delete a message group
exports.deleteMessageGroup = async (req, res) => {
  try {
    const { messageGroupId } = req.params;

    // Validate message group ID
    if (!mongoose.Types.ObjectId.isValid(messageGroupId)) {
      return res.status(400).json({ message: "Invalid message group ID." });
    }

    // Find and delete message group
    const deletedMessageGroup = await MessageGroup.findByIdAndDelete(messageGroupId);

    if (!deletedMessageGroup) {
      return res.status(404).json({ message: "Message group not found." });
    }

    // Remove message group from team
    await Team.updateOne(
      { _id: deletedMessageGroup.team },
      { $pull: { messageGroups: messageGroupId } }
    );

    res.status(200).json({ message: "Message group deleted successfully" });
  } catch (error) {
    console.error("Error deleting message group:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await MessageGroup.findById(groupId).populate("messages.sender", "firstName lastName email avatar");
    if (!group) return res.status(404).json({ error: "Group not found" });
    res.json(group.messages);
  } catch (error) {
    res.status(500).json({ error: "Error fetching messages" });
  }
};

exports.getMessageGroupById = async (req, res) => {
  try {
    const { messageGroupId } = req.params;

    // Validate the message group ID
    if (!mongoose.Types.ObjectId.isValid(messageGroupId)) {
      return res.status(400).json({ message: "Invalid message group ID." });
    }

    // Find the message group and populate related fields
    const messageGroup = await MessageGroup.findById(messageGroupId);

    if (!messageGroup) {
      return res.status(404).json({ message: "Message group not found." });
    }

    res.status(200).json(messageGroup);
  } catch (error) {
    console.error("Error fetching message group:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};
