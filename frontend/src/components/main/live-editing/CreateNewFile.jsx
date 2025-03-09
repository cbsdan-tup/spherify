import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";

const CreateNewFile = ({ show, onHide, onCreateFile }) => {
  const [fileName, setFileName] = useState("");
  const [validationError, setValidationError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const user = useSelector((state) => state.auth.user);
  const currentTeamId = useSelector((state) => state.team.currentTeamId);

  useEffect(() => {
    const modalElement = document.getElementById("createFileModal");
    if (modalElement) {
      if (show) {
        modalElement.classList.add("show");
        modalElement.style.display = "block";
        // Reset form state when modal opens
        setFileName("");
        setValidationError("");
      } else {
        modalElement.classList.remove("show");
        modalElement.style.display = "none";
      }
    }
  }, [show]);

  const handleFileNameChange = (e) => {
    const newFileName = e.target.value;
    setFileName(newFileName);
    
    // Clear validation error when user types
    if (validationError) {
      setValidationError("");
    }
  };

  // File name validation function
  const validateFileName = (name) => {
    // Check if file name is empty
    if (!name || name.trim() === '') {
      return { valid: false, message: 'File name cannot be empty' };
    }
    
    // Check if file name is too long (e.g., max 50 characters)
    if (name.length > 50) {
      return { valid: false, message: 'File name is too long (maximum 50 characters)' };
    }
    
    // Check for invalid characters (adjust regex as needed)
    const validFileNameRegex = /^[a-zA-Z0-9_\-. ]+$/;
    if (!validFileNameRegex.test(name)) {
      return { valid: false, message: 'File name contains invalid characters' };
    }
    
    return { valid: true, message: '' };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate file name
    const validation = validateFileName(fileName);
    if (!validation.valid) {
      setValidationError(validation.message);
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onCreateFile(fileName, user, currentTeamId);
      // Reset form and close on success
      setFileName("");
      setValidationError("");
      onHide();
    } catch (error) {
      console.error("Error creating file:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
    className={`modal fade ${show ? 'show d-block' : 'd-none'}`}
    id="createFileModal"
    tabIndex="-1"
    aria-hidden="true"
  >
      <div className="modal-dialog modal-dialog-centered create-modal">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Create New File</h5>
            <button type="button" className="btn-close" onClick={onHide}>
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div className="modal-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">File Name</label>
                <input
                  type="text"
                  className={`form-control ${validationError ? 'is-invalid' : ''}`}
                  placeholder="Enter File name"
                  value={fileName}
                  onChange={handleFileNameChange}
                  required
                />
                {validationError && (
                  <div className="invalid-feedback">
                    {validationError}
                  </div>
                )}
                <small className="form-text text-muted">
                  Use only letters, numbers, spaces, hyphens, underscores, and periods (50 characters max).
                </small>
              </div>
              <div className="d-flex justify-content-end button-container modal-footer">
                <button 
                  type="button" 
                  className="btn me-2 cancel" 
                  onClick={onHide}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn save"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating..." : "Create Document"}
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