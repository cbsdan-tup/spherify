import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";

const CreateNewMeeting = ({ show, onHide, onCreateMeeting }) => {
  const [roomName, setRoomName] = useState("");

  const user = useSelector((state) => state.auth.user);
  const currentTeamId = useSelector((state) => state.team.currentTeamId);

  useEffect(() => {
    const modalElement = document.getElementById("createMeetingModal");
    if (modalElement) {
      if (show) {
        modalElement.classList.add("show");
        modalElement.style.display = "block";
      } else {
        modalElement.classList.remove("show");
        modalElement.style.display = "none";
      }
    }
  }, [show]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!roomName.trim()) return; 

    onCreateMeeting(roomName, user, currentTeamId);
    setRoomName("");
    onHide(); 
  };

  return (
    <div
      className="modal fade"
      id="createMeetingModal"
      tabIndex="-1"
      aria-hidden="true"
    >
      <div className="modal-dialog modal-dialog-centered create-modal">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Create New Meeting</h5>
            <button type="button" className="btn-close" onClick={onHide}><i className="fa-solid fa-xmark"></i></button>
          </div>
          <div className="modal-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Room Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter room name"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  required
                />
              </div>
              <div className="d-flex justify-content-end button-container">
                <button type="button" className="btn btn-secondary me-2 cancel" onClick={onHide}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary save">
                  Create Meeting
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateNewMeeting;
