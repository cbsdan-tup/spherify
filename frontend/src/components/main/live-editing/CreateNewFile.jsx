import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";

const CreateNewFile = ({ show, onHide, onCreateFile }) => {
  const [fileName, setFileName] = useState("");

  const user = useSelector((state) => state.auth.user);
  const currentTeamId = useSelector((state) => state.team.currentTeamId);

  useEffect(() => {
    const modalElement = document.getElementById("createFileModal");
    if (modalElement) {
      if (show) {
        modalElement.classList.add("show");
        modalElement.style.display = "block";
      } else {
        modalElement.classList.remove("show");
        modalElement.style.display = "none";
      }
    }
  }, [show, onCreateFile]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!fileName.trim()) return; 

    onCreateFile(fileName, user, currentTeamId);
    setFileName("");
    onHide(); 
  };

  return (
    <div
      className="modal fade"
      id="createFileModal"
      tabIndex="-1"
      aria-hidden="true"
    >
      <div className="modal-dialog modal-dialog-centered create-modal">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Create New File</h5>
            <button type="button" className="btn-close" onClick={onHide}></button>
          </div>
          <div className="modal-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">File Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter File name"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  required
                />
              </div>
              <div className="d-flex justify-content-end button-container">
                <button type="button" className="btn btn-secondary me-2 cancel" onClick={onHide}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary save">
                  Create Document
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateNewFile;
