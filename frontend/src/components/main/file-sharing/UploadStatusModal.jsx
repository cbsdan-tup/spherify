import React, { useState, useEffect, useMemo } from "react";
import { Modal, Button, ProgressBar, Alert } from "react-bootstrap";
import { formatFileSize } from "../../../utils/helper";
import "./UploadStatusModal.css";

const UploadStatusModal = ({ show, onHide, uploadStatus, summary }) => {
  const [showCompleted, setShowCompleted] = useState(true);
  const [filter, setFilter] = useState("all"); // 'all', 'completed', 'error'
  const [localStatus, setLocalStatus] = useState({});
  const [recentlyCompleted, setRecentlyCompleted] = useState([]);
  
  // Keep a local copy of status to prevent flickering when parent updates
  useEffect(() => {
    if (Object.keys(uploadStatus || {}).length > 0) {
      setLocalStatus(prevStatus => {
        const newStatus = {...prevStatus};
        
        // Update existing entries or add new ones
        Object.entries(uploadStatus).forEach(([key, value]) => {
          // If this file has just completed, add it to recently completed list
          if (value.status === 'complete' && 
              (!prevStatus[key] || prevStatus[key].status !== 'complete')) {
            setRecentlyCompleted(prev => {
              // Keep only last 5 items
              const updated = [{name: value.file, time: new Date().toLocaleTimeString()}, ...prev];
              return updated.slice(0, 5);
            });
          }
          newStatus[key] = value;
        });
        
        return newStatus;
      });
    }
  }, [uploadStatus]);

  const getStatusVariant = (status) => {
    switch (status) {
      case "complete":
        return "success";
      case "error":
        return "danger";
      case "uploading":
        return "info";
      default:
        return "secondary";
    }
  };

  // Sort files by status (completed first, then in progress, then error)
  const sortedFilteredFiles = () => {
    if (!localStatus) return [];

    const files = Object.values(localStatus).filter((file) => {
      if (filter === "all") return true;
      if (filter === "completed") return file.status === "complete";
      if (filter === "error") return file.status === "error";
      return true;
    }).map(file => {
      // Quick fix for files that have 100% progress but still show "uploading"
      if (file.progress === '100' && file.status === 'uploading') {
        return {...file, status: 'complete'};
      }
      return file;
    });
    
    // Sort by status to group files
    return files.sort((a, b) => {
      if (a.status === "complete" && b.status !== "complete") return -1;
      if (a.status !== "complete" && b.status === "complete") return 1;
      if (a.status === "uploading" && b.status === "error") return -1;
      if (a.status === "error" && b.status === "uploading") return 1;
      return a.file.localeCompare(b.file);
    });
  };

  // Fix status counting calculation to ensure it's always up-to-date
  const statusCounts = () => {
    if (!localStatus || Object.keys(localStatus).length === 0)
      return { total: 0, completed: 0, error: 0, inProgress: 0 };

    const files = Object.values(localStatus);
    
    // Count files with 100% progress as completed even if status is still "uploading"
    return {
      total: files.length,
      completed: files.filter((f) => f.status === "complete" || f.progress === '100').length,
      error: files.filter((f) => f.status === "error").length,
      inProgress: files.filter((f) => f.status === "uploading" && f.progress !== '100').length,
    };
  };

  const counts = statusCounts();
  
  // Calculate progress percentage based on individual file progress
  const progressPercentage = useMemo(() => {
    if (!localStatus || Object.keys(localStatus).length === 0) return 0;
    
    const files = Object.values(localStatus);
    if (files.length === 0) return 0;
    
    // Sum up progress of all files and divide by number of files
    const totalProgress = files.reduce((sum, file) => {
      return sum + parseFloat(file.progress || '0');
    }, 0);
    
    return Math.round(totalProgress / files.length);
  }, [localStatus]);

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      aria-labelledby="upload-status-modal"
      centered
      className="upload-status-modal"
    >
      <Modal.Header closeButton>
        <Modal.Title id="upload-status-modal">
          {counts.inProgress > 0 ? "Uploading Files..." : "Upload Status"}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="upload-status-summary">
          <div className="upload-progress-wrapper">
            <ProgressBar
              now={progressPercentage}
              label={`${progressPercentage}%`}
              variant={counts.inProgress > 0 ? "primary" : "success"}
              className="main-progress-bar"
              animated={counts.inProgress > 0}
            />
          </div>
          <div className="upload-stats">
            <div className="stat-item">
              <span className="stat-label">Total:</span>
              <span className="stat-value">{counts.total} files</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Completed:</span>
              <span className="stat-value completed">{counts.completed}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">In Progress:</span>
              <span className="stat-value in-progress">
                {counts.inProgress}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Failed:</span>
              <span className="stat-value failed">{counts.error}</span>
            </div>
          </div>
          
          
          {summary && summary.status === "complete" && (
            <div className="upload-complete-summary">
              <h5>Upload Summary</h5>
              <p>
                Successfully uploaded: {summary.successCount} of{" "}
                {summary.totalFiles} files
              </p>
              {summary.errorCount > 0 && (
                <p className="text-danger">Failed: {summary.errorCount} files</p>
              )}
            </div>
          )}
        </div>

        <div>
          <div className="filter-buttons">
            <Button
              variant={filter === "all" ? "primary" : "outline-primary"}
              onClick={() => setFilter("all")}
            >
              All
            </Button>
            <Button
              variant={filter === "completed" ? "success" : "outline-success"}
              onClick={() => setFilter("completed")}
            >
              Completed
            </Button>
            <Button
              variant={filter === "error" ? "danger" : "outline-danger"}
              onClick={() => setFilter("error")}
            >
              Failed
            </Button>
          </div>

          <div className="file-status-list">
            {sortedFilteredFiles().map((file, index) => (
              <div key={index} className={`file-status-item ${file.status}`}>
                <div className="file-info">
                  <div className="file-name" title={file.file}>
                    {file.file}
                  </div>
                  <div className="file-details">
                    {file.size && (
                      <span className="file-size">
                        {formatFileSize(file.size)}
                      </span>
                    )}
                    <span className={`file-status-badge ${file.status}`}>
                      {file.status === "complete" || file.progress === '100' 
                        ? "Completed" 
                        : file.status === "uploading" 
                          ? "Uploading..." 
                          : "Failed"}
                    </span>
                    {file.completedAt && (
                      <span className="completed-time">
                        at {file.completedAt}
                      </span>
                    )}
                  </div>
                </div>
                <div className="file-progress">
                  {file.status === "uploading" && (
                    <ProgressBar
                      now={parseFloat(file.progress) || 0}
                      label={`${file.progress || 0}%`}
                      variant={getStatusVariant(file.status)}
                      animated
                      key={`progress-${file.file}-${file.progress}`}
                    />
                  )}
                  {file.status === "complete" && (
                    <div className="complete-indicator">✓</div>
                  )}
                  {file.status === "error" && (
                    <div
                      className="error-indicator"
                      title={file.error || "Upload failed"}
                    >
                      ✕
                    </div>
                  )}
                </div>
              </div>
            ))}

            {sortedFilteredFiles().length === 0 && (
              <div className="no-files-message">
                No files match the selected filter.
              </div>
            )}
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default UploadStatusModal;
