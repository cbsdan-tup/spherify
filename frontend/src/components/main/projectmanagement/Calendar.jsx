import React, { useState, useEffect } from "react";
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

function Calendar({setRefresh = ()=>{}}) {
  const dispatch = useDispatch();
  const { currentTeamId } = useSelector((state) => state.team);
  const { events, error } = useSelector((state) => state.calendar);
  const { user } = useSelector((state) => state.auth);
  const authState = useSelector((state) => state.auth);
  
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

  const formatDateForInput = (date) => {
    if (!date) return '';
    // Ensure we're working with a Date object
    const d = new Date(date);
    // Create ISO string and adjust for timezone
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  const handleDateSelect = (selectInfo) => {
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
    setEventAction("edit");
    setSelectedEvent(clickInfo.event);
    const eventDetails = clickInfo.event;
    
    setEventForm({
      name: eventDetails.title,
      description: eventDetails.extendedProps.description || "",
      startDate: formatDateForInput(eventDetails.start),
      endDate: formatDateForInput(eventDetails.end || eventDetails.start),
      location: eventDetails.extendedProps.location || "",
      assignedMembers: eventDetails.extendedProps.assignedMembers || []
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
                <div className="event-title">{eventInfo.event.title}</div>
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
            {eventAction === "create" ? "Add New Event" : "Edit Event"}
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
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={eventForm.description}
                onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
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
              />
            </Form.Group>

            {renderMemberSelection()}

            <div className="d-flex justify-content-end gap-2 buttons">
              {eventAction === "edit" && (
                <Button className="delete" type="button" onClick={handleDeleteEvent}>
                  Delete
                </Button>
              )}
              <Button className="cancel"  type="button" onClick={handleModalClose}>
                Cancel
              </Button>
              <Button className="create" type="submit">
                {eventAction === "create" ? "Add Event" : "Save Changes"}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default Calendar;
