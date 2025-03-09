import React, { useState, useEffect, useContext } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Modal, Button, Form, Toast } from "react-bootstrap";
import {
  fetchEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} from "../../../redux/calendarSlice";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { fetchTeamMembers } from "../../../functions/TeamFunctions";
import { TeamConfigContext } from "../Team"; // Import the context

function Calendar({setRefresh = ()=>{}}) {
  const dispatch = useDispatch();
  const { currentTeamId } = useSelector((state) => state.team);
  const { events, error } = useSelector((state) => state.calendar);
  const { user } = useSelector((state) => state.auth);
  const authState = useSelector((state) => state.auth);
  
  // Add state for permission checking
  const [hasCalendarPermission, setHasCalendarPermission] = useState(false);
  const [userRole, setUserRole] = useState(null);
  
  // Get team context
  const teamContext = useContext(TeamConfigContext);
  
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventAction, setEventAction] = useState("create");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventForm, setEventForm] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    location: "",
    assignedMembers: []
  });
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [teamMembers, setTeamMembers] = useState([]);

  useEffect(() => {
    if (currentTeamId) {
      dispatch(fetchEvents(currentTeamId));
    }
  }, [currentTeamId, dispatch]);

  useEffect(() => {
    const loadMembers = async () => {
      if (currentTeamId) {
        const members = await fetchTeamMembers(currentTeamId, authState);
        setTeamMembers(members || []);
      }
    };
    loadMembers();
  }, [currentTeamId, authState]);

  // Check if user has permission to modify calendar
  useEffect(() => {
    if (teamContext?.teamInfo && teamContext?.teamConfiguration && user) {
      const currentMember = teamContext.teamInfo.members.find(
        member => member.user && member.user._id === user._id && member.leaveAt === null
      );
      
      if (currentMember) {
        setUserRole(currentMember.role);
        
        // Check permissions: leader, admin, or role in AllowedRoleToModifyCalendar
        const hasPermission = 
          currentMember.role === "leader" || 
          currentMember.isAdmin ||
          (teamContext.teamConfiguration?.AllowedRoleToModifyCalendar || []).includes(currentMember.role);
        
        setHasCalendarPermission(hasPermission);
      }
    }
  }, [teamContext, user]);

  const formatDateForInput = (date) => {
    if (!date) return '';
    // Ensure we're working with a Date object
    const d = new Date(date);
    // Create ISO string and adjust for timezone
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  const handleDateSelect = (selectInfo) => {
    // Check permission before allowing event creation
    if (!hasCalendarPermission) {
      toast.error("You don't have permission to create calendar events");
      return;
    }

    setEventAction("create");
    setEventForm({
      name: "",
      description: "",
      startDate: formatDateForInput(selectInfo.start),
      endDate: formatDateForInput(selectInfo.end),
      location: "",
      assignedMembers: []
    });
    setShowEventModal(true);
  };

  const handleEventClick = (clickInfo) => {
    const event = clickInfo.event;
    
    // Set selected event regardless of permission (for viewing)
    setSelectedEvent({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      description: event.extendedProps.description || "",
      location: event.extendedProps.location || "",
      assignedMembers: event.extendedProps.assignedMembers || []
    });
    
    // Only set event action to "edit" if user has permission
    if (hasCalendarPermission) {
      setEventAction("edit");
    } else {
      setEventAction("view"); // Just view mode for non-permitted users
    }
    
    setEventForm({
      name: event.title,
      description: event.extendedProps.description || "",
      location: event.extendedProps.location || "",
      startDate: formatDateForInput(event.start),
      endDate: formatDateForInput(event.end || event.start),
      assignedMembers: event.extendedProps.assignedMembers || []
    });
    
    setShowEventModal(true);
  };

  const handleModalClose = () => {
    setShowEventModal(false);
    setSelectedEvent(null);
    setEventForm({
      name: "",
      description: "",
      startDate: "",
      endDate: "",
      location: "",
      assignedMembers: []
    });
  };

  // Add this helper function after the existing helper functions
  const checkForOverlappingEvents = (newStart, newEnd, assignedMembers, currentEventId = null) => {
    const newStartDate = new Date(newStart);
    const newEndDate = new Date(newEnd);

    return events.some(event => {
      // Skip checking against the current event when editing
      if (currentEventId && event._id === currentEventId) {
        return false;
      }

      const eventStart = new Date(event.start || event.startDate);
      const eventEnd = new Date(event.end || event.endDate);
      
      // Check if dates overlap
      const datesOverlap = (
        (newStartDate >= eventStart && newStartDate < eventEnd) ||
        (newEndDate > eventStart && newEndDate <= eventEnd) ||
        (newStartDate <= eventStart && newEndDate >= eventEnd)
      );

      // Check if any assigned members overlap
      const membersOverlap = assignedMembers.some(memberId => 
        event.assignedMembers?.includes(memberId)
      );

      return datesOverlap && membersOverlap;
    });
  };

  // Replace the existing handleFormSubmit with this updated version
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    // Check permission before allowing event modification
    if (!hasCalendarPermission) {
      toast.error("You don't have permission to modify calendar events");
      return;
    }
      
    const now = new Date();
    const startDate = new Date(eventForm.startDate);
    const endDate = new Date(eventForm.endDate);

    // Check if dates are in the past
    if (startDate < now || endDate < now) {
      setToastMessage("Cannot create or edit events in the past!");
      setShowToast(true);
      return;
    }

    // Check if end date is before start date
    if (endDate < startDate) {
      setToastMessage("End date cannot be before start date!");
      setShowToast(true);
      return;
    }

    // Check for overlapping events
    const hasOverlap = checkForOverlappingEvents(
      startDate,
      endDate,
      eventForm.assignedMembers,
      selectedEvent?.id
    );

    if (hasOverlap) {
      setToastMessage("One or more assigned members already have an event during this time slot!");
      setShowToast(true);
      return;
    }

    const eventData = {
      teamId: currentTeamId,
      name: eventForm.name,
      description: eventForm.description,
      startDate: eventForm.startDate,
      endDate: eventForm.endDate,
      location: eventForm.location,
      assignedMembers: eventForm.assignedMembers
    };

    try {
      if (eventAction === "create") {
        await dispatch(createEvent(eventData)).unwrap();
        setRefresh(prev => !prev);
        setToastMessage("Event created successfully!");
      } else {
        await dispatch(updateEvent({
          eventId: selectedEvent.id,
          eventData: {
            ...eventData,
            title: eventForm.name,
            start: eventForm.startDate,
            end: eventForm.endDate
          }
        })).unwrap();
        setRefresh(prev => !prev);
        setToastMessage("Event updated successfully!");
      }
      dispatch(fetchEvents(currentTeamId));
      setShowToast(true);
      handleModalClose();
    } catch (err) {
      setToastMessage(err.message || "An error occurred");
      setShowToast(true);
    }
  };

  // Add this helper function to get minimum date-time for inputs
  const getMinDateTime = () => {
    const now = new Date();
    return formatDateForInput(now);
  };

  const handleDeleteEvent = async () => {
    // Check permission before allowing event deletion
    if (!hasCalendarPermission) {
      toast.error("You don't have permission to delete calendar events");
      return;
    }

    try {
      await dispatch(deleteEvent(selectedEvent.id)).unwrap();
      // Add this line to refresh events after delete
      dispatch(fetchEvents(currentTeamId));
      setRefresh(prev => !prev);
      setToastMessage("Event deleted successfully!");
      setShowToast(true);
      handleModalClose();
    } catch (err) {
      setToastMessage("An error occurred");
      setShowToast(true);
    }
  };

  const calendarEvents = Array.isArray(events) ? events.map(event => ({
    id: event._id,
    title: event.title || event.name, // Handle both title and name
    start: new Date(event.start || event.startDate), // Handle both start and startDate
    end: new Date(event.end || event.endDate), // Handle both end and endDate
    extendedProps: {
      description: event.description,
      location: event.location,
      createdBy: event.createdBy,
      assignedMembers: event.assignedMembers || []
    }
  })) : [];

  const renderMemberSelection = () => (
    <Form.Group className="mb-3">
      <Form.Label>Assign Members</Form.Label>
      <div className="member-list">
        {teamMembers && teamMembers.map((member) => (
          <Form.Check
            key={member.user._id}
            type="checkbox"
            id={`member-${member.user._id}`}
            label={
              <div className="d-flex align-items-center gap-2">
                <img 
                  src={member.user.avatar?.url || "/images/account.png"} 
                  alt={member.user.firstName}
                  style={{ width: '24px', height: '24px', borderRadius: '50%' }}
                />
                <span>{member.user.firstName} {member.user.lastName}</span>
              </div>
            }
            checked={eventForm.assignedMembers.includes(member.user._id)}
            onChange={(e) => {
              const memberId = member.user._id;
              setEventForm(prev => ({
                ...prev,
                assignedMembers: e.target.checked
                  ? [...prev.assignedMembers, memberId]
                  : prev.assignedMembers.filter(id => id !== memberId)
              }));
            }}
          />
        ))}
      </div>
    </Form.Group>
  );

  return (
    <div className="calendar-container">
      <div className="d-flex justify-content-between mb-3">
        <h2>Team Calendar</h2>
      </div>

      <div className="calendar-wrapper" style={{ height: 'calc(100vh - 160px)' }}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay"
          }}
          initialView="dayGridMonth"
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={false} // Changed to false to allow stacking
          weekends={true}
          select={handleDateSelect}
          eventClick={handleEventClick}
          height="100%"
          events={calendarEvents}
          eventDisplay="block" // Changed to block display
          eventOverlap={true} // Allow events to overlap
          slotEventOverlap={true}
          eventClassNames="calendar-event" // Add custom class
          slotMinTime="00:00:00"
          slotMaxTime="24:00:00"
          // Add custom styling for events
          eventContent={(eventInfo) => {
            return (
              <div className="event-content">
                <div className="event-title" style={{overflowX: "hidden", textOverflow: "ellipsis"}}>{eventInfo.event.title}</div>
                {eventInfo.event.extendedProps.location && (
                  <div className="event-location">📍 {eventInfo.event.extendedProps.location}</div>
                )}
              </div>
            );
          }}
        />
      </div>

      <Toast
        show={showToast}
        onClose={() => setShowToast(false)}
        style={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 9999
        }}
        delay={3000}
        autohide
      >
        <Toast.Header>
          <strong className="me-auto">Notification</strong>
        </Toast.Header>
        <Toast.Body>{toastMessage}</Toast.Body>
      </Toast>

      <Modal show={showEventModal} onHide={handleModalClose} className="calendar-modal">
        <Modal.Header closeButton>
          <Modal.Title>
            {eventAction === "create" ? "Add New Event" : 
             eventAction === "edit" ? "Edit Event" : "View Event"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleFormSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Event Name*</Form.Label>
              <Form.Control
                type="text"
                value={eventForm.name}
                onChange={(e) => setEventForm({...eventForm, name: e.target.value})}
                required
                disabled={eventAction === "view"}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={eventForm.description}
                onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                disabled={eventAction === "view"}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Start Date*</Form.Label>
              <Form.Control
                type="datetime-local"
                value={eventForm.startDate}
                onChange={(e) => setEventForm({...eventForm, startDate: e.target.value})}
                required
                step="60"
                min={getMinDateTime()} // Add minimum date-time
                disabled={eventAction === "view"}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>End Date*</Form.Label>
              <Form.Control
                type="datetime-local"
                value={eventForm.endDate}
                onChange={(e) => setEventForm({...eventForm, endDate: e.target.value})}
                required
                step="60"
                min={eventForm.startDate || getMinDateTime()} // Add minimum date-time
                disabled={eventAction === "view"}
              />
            </Form.Group>

            {renderMemberSelection()}

            <div className="d-flex justify-content-end gap-2 buttons">
              {eventAction === "edit" && hasCalendarPermission && (
                <Button className="delete" type="button" onClick={handleDeleteEvent}>
                  Delete
                </Button>
              )}
              <Button className="cancel"  type="button" onClick={handleModalClose}>
                Cancel
              </Button>
              {hasCalendarPermission && eventAction !== "view" && (
                <Button className="create" type="submit">
                  {eventAction === "create" ? "Add Event" : "Save Changes"}
                </Button>
              )}
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Add a notification for users without permission */}
      {!hasCalendarPermission && (
        <div className="alert alert-info mt-3">
          <i className="fa-solid fa-info-circle me-2"></i>
          You can view the calendar, but you don't have permission to add, edit, or delete events.
        </div>
      )}
    </div>
  );
}

export default Calendar;
