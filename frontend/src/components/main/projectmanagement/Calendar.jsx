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

function Calendar() {
  const dispatch = useDispatch();
  const { currentTeamId } = useSelector((state) => state.team);
  const { events, error } = useSelector((state) => state.calendar);
  const { user } = useSelector((state) => state.auth);
  
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventAction, setEventAction] = useState("create");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventForm, setEventForm] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    location: ""
  });
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    if (currentTeamId) {
      dispatch(fetchEvents(currentTeamId));
    }
  }, [currentTeamId, dispatch]);

  const formatDateForInput = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().slice(0, 16);
  };

  const handleDateSelect = (selectInfo) => {
    setEventAction("create");
    setEventForm({
      name: "",
      description: "",
      startDate: formatDateForInput(selectInfo.start),
      endDate: formatDateForInput(selectInfo.end),
      location: ""
    });
    setShowEventModal(true);
  };

  const handleEventClick = (clickInfo) => {
    setEventAction("edit");
    setSelectedEvent(clickInfo.event);
    setEventForm({
      name: clickInfo.event.title,
      description: clickInfo.event.extendedProps.description || "",
      startDate: formatDateForInput(clickInfo.event.start),
      endDate: formatDateForInput(clickInfo.event.end),
      location: clickInfo.event.extendedProps.location || ""
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
      location: ""
    });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    const eventData = {
      teamId: currentTeamId,
      name: eventForm.name,
      description: eventForm.description,
      startDate: eventForm.startDate,
      endDate: eventForm.endDate,
      location: eventForm.location,
      createdBy: user._id
    };

    try {
      if (eventAction === "create") {
        dispatch(createEvent(eventData));
        setToastMessage("Event created successfully!");
      } else {
        dispatch(updateEvent({
          eventId: selectedEvent.id,
          eventData
        }));
        setToastMessage("Event updated successfully!");
      }
      setShowToast(true);
      handleModalClose();
    } catch (err) {
      setToastMessage("An error occurred");
      setShowToast(true);
    }
  };

  const handleDeleteEvent = () => {
    try {
      dispatch(deleteEvent(selectedEvent.id));
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
    title: event.name,
    start: event.startDate,
    end: event.endDate,
    extendedProps: {
      description: event.description,
      location: event.location,
      createdBy: event.createdBy
    }
  })) : [];

  return (
    <div className="calendar-container p-6" style={{ paddingTop: '80px' }}>
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
          dayMaxEvents={true}
          weekends={true}
          select={handleDateSelect}
          eventClick={handleEventClick}
          height="100%"
          events={calendarEvents}
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

      <Modal show={showEventModal} onHide={handleModalClose}>
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
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Location</Form.Label>
              <Form.Control
                type="text"
                value={eventForm.location}
                onChange={(e) => setEventForm({...eventForm, location: e.target.value})}
              />
            </Form.Group>

            <div className="d-flex justify-content-end gap-2">
              {eventAction === "edit" && (
                <Button variant="danger" type="button" onClick={handleDeleteEvent}>
                  Delete
                </Button>
              )}
              <Button variant="secondary" type="button" onClick={handleModalClose}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
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
