import React, { useRef, useState, useEffect } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { errMsg, succesMsg, formatFileSize } from "../../../utils/helper";
import Swal from "sweetalert2";
import UploadStatusModal from "./UploadStatusModal";

const UploadFiles = ({
  currentPath,
  setRefresh,
  parentFolder,
  setProgress,
  availableUploadSize,
  setLastUploadStatus,
  setLastUploadSummary,
  setActiveUpload
}) => {
  const fileInputRef = useRef(null);
  const [uploadStatus, setUploadStatus] = useState({});
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [uploadSummary, setUploadSummary] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const currentTeamId = useSelector((state) => state.team.currentTeamId);
  const user = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);
  
  // Sync upload status with parent component (add fallbacks with optional chaining)
  useEffect(() => {
    if (Object.keys(uploadStatus).length > 0) {
      setLastUploadStatus?.(uploadStatus);
    }
  }, [uploadStatus, setLastUploadStatus]);
  
  // Sync upload summary with parent component
  useEffect(() => {
    if (uploadSummary) {
      setLastUploadSummary?.(uploadSummary);
    }
  }, [uploadSummary, setLastUploadSummary]);
  
  // Sync uploading state with parent
  useEffect(() => {
    setActiveUpload?.(isUploading);
  }, [isUploading, setActiveUpload]);
  
  const handleFileChange = async (event) => {
    const uploadingFiles = Array.from(event.target.files);
    if (!uploadingFiles.length) return;
  
    // Calculate total file size
    const totalUploadSize = uploadingFiles.reduce((acc, file) => acc + file.size, 0);
  
    // If total upload size exceeds available space, show alert
    if (totalUploadSize > availableUploadSize) {
      const availableSizeGB = (availableUploadSize / (1024 ** 3)).toFixed(2);
      const uploadingSizeGB = (totalUploadSize / (1024 ** 3)).toFixed(2);
      
      Swal.fire({
        icon: "error",
        title: "Upload Error",
        html: `Insufficient storage space.<br /><div class="active-color">Available Storage: ${availableSizeGB} GB</div><div class="danger-color">Uploading Size: ${uploadingSizeGB} GB</div>`,
      });
  
      return;
    }
  
    const formData = new FormData();
    for (let i = 0; i < uploadingFiles.length; i++) {
      formData.append("files", uploadingFiles[i]);
    }
  
    formData.append("type", uploadingFiles.length > 1 ? "folder" : "file");
    formData.append(
      "name",
      uploadingFiles.length > 1 ? "New Folder" : uploadingFiles[0].name
    );
    formData.append("teamId", currentTeamId);
    formData.append("createdBy", user._id);
    formData.append("owner", user._id);
    formData.append("parentFolder", parentFolder);
    
    setUploadStatus({});
    setUploadSummary(null);
    setIsUploading(true);
    setShowStatusModal(true);
    
    // Initialize status for all files with more details
    const initialStatus = {};
    uploadingFiles.forEach(file => {
      initialStatus[file.name] = {
        file: file.name,
        size: file.size,
        progress: '0',
        status: 'uploading',
        startTime: new Date().toLocaleTimeString()
      };
    });
    setUploadStatus(initialStatus);
  
    try {
      console.log("Uploading to path:", currentPath);
      
      // Create FormData object
      const formData = new FormData();
      for (let i = 0; i < uploadingFiles.length; i++) {
        formData.append("files", uploadingFiles[i]);
      }
      formData.append("teamId", currentTeamId);
      formData.append("createdBy", user._id);
      formData.append("owner", user._id);
      formData.append("parentFolder", parentFolder);
      
      // Option 1: Using Fetch API with a reader to get line-by-line responses
      const response = await fetch(`${import.meta.env.VITE_API}/uploadFiles?path=${encodeURIComponent(currentPath)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Failed to upload: ${response.statusText}`);
      }
      
      const reader = response.body.getReader();
      let decoder = new TextDecoder();
      let overallProgress = 0;
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        // Split by newline and process each message
        const messages = chunk.split('\n').filter(Boolean);
        
        messages.forEach(message => {
          try {
            const data = JSON.parse(message);
            
            // Handle different event types
            if (data.type === 'progress') {
              // Update progress for specific file
              setUploadStatus(prevStatus => {
                if (!prevStatus[data.file]) return prevStatus;
                
                const newStatus = {...prevStatus};
                newStatus[data.file] = {
                  ...newStatus[data.file],
                  progress: data.progress,
                  status: data.progress === '100' ? 'complete' : 'uploading'  // Auto-complete at 100%
                };
                
                // Also update parent's last upload status
                setLastUploadStatus?.(newStatus);
                return newStatus;
              });
              
              // Update overall progress - calculate average of all files
              setProgress(prevStatus => {
                const files = Object.values(uploadStatus);
                if (files.length === 0) return 0;
                
                const totalProgress = files.reduce((sum, file) => {
                  return sum + parseFloat(file.progress || '0');
                }, 0);
                
                return Math.round(totalProgress / files.length);
              });
            }
            
            // ...existing code...
            if (data.type === 'fileComplete') {
              // Mark specific file as complete
              setUploadStatus(prevStatus => {
                const newStatus = {...prevStatus};
                if (newStatus[data.file]) {
                  newStatus[data.file] = {
                    ...newStatus[data.file],
                    status: 'complete',
                    progress: '100',
                    completedAt: new Date().toLocaleTimeString()
                  };
                }
                return newStatus;
              });
              
            } else if (data.type === 'fileError') {
              // Mark specific file as error
              setUploadStatus(prevStatus => {
                const newStatus = {...prevStatus};
                if (newStatus[data.file]) {
                  newStatus[data.file] = {
                    ...newStatus[data.file],
                    status: 'error',
                    error: data.error || 'Upload failed'
                  };
                }
                return newStatus;
              });
              
            } else if (data.type === 'summary') {
              // Final summary
              const summary = {
                status: 'complete',
                successCount: data.completedFiles,
                errorCount: data.failedFiles,
                totalFiles: data.totalFiles
              };
              setUploadSummary(summary);
              succesMsg("Files uploaded successfully!");
              setRefresh(prev => !prev);
            }
          } catch (err) {
            console.error("Error parsing upload status message:", err);
          }
        });
      }
      
      setIsUploading(false);
      
    } catch (error) {
      handleUploadError(error.message || "Upload failed");
      setIsUploading(false);
    }
  };
  
  const handleUploadError = (errorMessage) => {
    errMsg("Upload failed: " + errorMessage);
    
    // Mark all files as failed
    const failedStatus = {};
    Object.keys(uploadStatus).forEach(filename => {
      failedStatus[filename] = {
        ...uploadStatus[filename],
        status: 'error',
        error: errorMessage
      };
    });
    setUploadStatus(failedStatus);
    
    // Create error summary
    const summary = {
      status: 'complete',
      successCount: 0,
      errorCount: Object.keys(uploadStatus).length,
      totalFiles: Object.keys(uploadStatus).length,
      error: errorMessage
    };
    setUploadSummary(summary);
  };

  return (
    <>
      <button onClick={() => fileInputRef.current.click()}>
        <i className="fa-solid fa-upload"></i>
        <span>Upload Files</span>
      </button>
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
      <UploadStatusModal
        show={showStatusModal}
        onHide={() => setShowStatusModal(false)}
        uploadStatus={uploadStatus}
        summary={uploadSummary}
      />
    </>
  );
};

export default UploadFiles;
