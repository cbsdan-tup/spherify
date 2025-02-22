const Event = require("../../models/calendar/event");
const Team = require("../../models/Team").Team;

exports.getEventsByTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    
    // Verify team exists and user is a member
    const team = await Team.findOne({
      _id: teamId,
      'members.user': req.user._id
    });
    
    if (!team) {
      return res.status(403).json({ message: "Not authorized to access this team's events" });
    }

    const events = await Event.find({ team: teamId })
      .populate('createdBy', 'firstName lastName email')
      .lean();  // Convert to plain objects

    // Format events to match frontend expectations
    const formattedEvents = events.map(event => ({
      ...event,
      name: event.title,  // Add name field for frontend compatibility
      startDate: event.start,  // Add startDate field for frontend compatibility
      endDate: event.end,  // Add endDate field for frontend compatibility
    }));

    return res.json(formattedEvents);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Error fetching events",
      error: error.message
    });
  }
};

exports.createEvent = async (req, res) => {
  try {
    const { teamId, name, description, startDate, endDate, location, assignedMembers } = req.body;

    // Verify team membership
    const team = await Team.findOne({
      _id: teamId,
      'members.user': req.user._id
    });

    if (!team) {
      return res.status(403).json({ message: "Not authorized to create events for this team" });
    }

    const event = new Event({
      team: teamId,
      title: name,
      start: new Date(startDate),
      end: new Date(endDate),
      description,
      location,
      createdBy: req.user._id,
      assignedMembers: assignedMembers || [] // Add this line
    });

    await event.save();
    
    // Populate the createdBy and assignedMembers fields before sending response
    await event.populate('createdBy assignedMembers', 'firstName lastName email avatar');
    
    return res.status(201).json({ event });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Error creating event",
      error: error.message
    });
  }
};

exports.updateEvent = async (req, res) => {
  const { eventId } = req.params;
  const { name, description, startDate, endDate, location, teamId, assignedMembers } = req.body;

  try {
    // Verify team membership
    const team = await Team.findOne({
      _id: teamId,
      'members.user': req.user._id
    });

    if (!team) {
      return res.status(403).json({ message: "Not authorized to update events for this team" });
    }

    const event = await Event.findByIdAndUpdate(
      eventId,
      {
        title: name,
        start: new Date(startDate),
        end: new Date(endDate),
        description,
        location,
        assignedMembers: assignedMembers || [] // Add this line
      },
      { new: true }
    ).populate('createdBy assignedMembers', 'firstName lastName email avatar');

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    return res.json({ event });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Error updating event",
      error: error.message
    });
  }
};

exports.deleteEvent = async (req, res) => {
  const { eventId } = req.params;

  try {
    const event = await Event.findByIdAndDelete(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    return res.json({ message: "Event deleted successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Error deleting event",
      error: error.message
    });
  }
};