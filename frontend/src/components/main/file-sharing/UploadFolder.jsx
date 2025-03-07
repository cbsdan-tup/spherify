import React, { useRef, useState, useEffect } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { errMsg, succesMsg } from "../../../utils/helper";
import Swal from "sweetalert2";
import UploadStatusModal from "./UploadStatusModal";

const UploadFolder = ({ 
  currentPath, 
  setRefresh, 
  parentFolder, 
  setProgress, 
  availableUploadSize,
  setLastUploadStatus,
  setLastUploadSummary,
  setActiveUpload
}) => {
  const folderInputRef = useRef(null);
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
  
  const handleFolderChange = async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;
  
    // Calculate total folder size
    const totalUploadSize = files.reduce((acc, file) => acc + file.size, 0);
  
    // If total upload size exceeds available storage, show alert
    if (totalUploadSize > availableUploadSize) {
      const availableSizeGB = (availableUploadSize / (1024 ** 3)).toFixed(2);
      const uploadingSizeGB = (totalUploadSize / (1024 ** 3)).toFixed(2);
  
      Swal.fire({
        icon: "error",
        title: "Upload Error",
        html: `<div class="swal-storage-alert"><span class="message">Insufficient storage space.</span><div class="active-color">Available Storage: ${availableSizeGB} GB</div><div class="danger-color">Uploading Size: ${uploadingSizeGB} GB</div></div>`,
      });
  
      return;
    }
    
    setUploadStatus({});
    setUploadSummary(null);
    setIsUploading(true);
    setShowStatusModal(true);
    
    // Initialize status for all files with more details
    const initialStatus = {};
    const paths = [];
    
    files.forEach(file => {
      initialStatus[file.webkitRelativePath] = {
        file: file.webkitRelativePath,
        size: file.size,
        progress: '0',
        status: 'uploading',
        startTime: new Date().toLocaleTimeString()
      };
      paths.push(file.webkitRelativePath);
    });
    
    setUploadStatus(initialStatus);
    
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }
    
    formData.append("teamId", currentTeamId);
    formData.append("createdBy", user._id);
    formData.append("owner", user._id);
    formData.append("parentFolder", parentFolder);
    formData.append("paths", JSON.stringify(paths));
    
    try {
      // Set up XMLHttpRequest for the upload with progress tracking
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${import.meta.env.VITE_API}/uploadFolders?path=${encodeURIComponent(currentPath)}`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('X-Folder-Name', paths[0].split("/")[0]); // Send root folder name
      xhr.setRequestHeader('Accept', 'application/json');
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentCompleted = Math.round((event.loaded / event.total) * 100);
          setProgress(percentCompleted);
          
          // Important: Use functional update to ensure we're updating from the latest state
          setUploadStatus(prevStatus => {
            const newStatus = {...prevStatus};
            
            // Update progress for all files
            Object.keys(newStatus).forEach(filepath => {
              newStatus[filepath] = {
                ...newStatus[filepath],
                progress: percentCompleted.toString(),
              };
            });
            
            // Also update parent's last upload status
            setLastUploadStatus?.(newStatus);
            return newStatus;
          });
          
          // Log progress to verify it's being updated
          console.log(`Upload progress: ${percentCompleted}%`);
        }
      });
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText);
          
          // Mark files as complete one by one with timestamps
          // This simulates individual file completion since the backend
          // doesn't provide per-file status updates
          const completeFiles = async () => {
            const updatedStatus = {...uploadStatus};
            let count = 0;
            const totalFiles = Object.keys(updatedStatus).length;
            
            // Process files in batches to improve visual feedback
            const batchSize = Math.max(1, Math.floor(totalFiles / 10)); // Process ~10 batches
            const batchDelay = 100; // ms between batches
            
            // Group files by their parent directory
            const filesByDir = {};
            Object.keys(updatedStatus).forEach(filepath => {
              const parts = filepath.split('/');
              const dirPath = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
              if (!filesByDir[dirPath]) filesByDir[dirPath] = [];
              filesByDir[dirPath].push(filepath);
            });
            
            // Process files by directory to simulate realistic upload order
            for (const dirPath of Object.keys(filesByDir)) {
              for (const filepath of filesByDir[dirPath]) {
                const completionTime = new Date().toLocaleTimeString();
                
                updatedStatus[filepath] = {
                  ...updatedStatus[filepath],
                  progress: '100',
                  status: 'complete',
                  completedAt: completionTime
                };
                
                count++;
                // Update status every few files
                if (count % batchSize === 0 || count === totalFiles) {
                  setUploadStatus({...updatedStatus});
                  setLastUploadStatus?.({...updatedStatus});
                  await new Promise(resolve => setTimeout(resolve, batchDelay));
                }
              }
            }
            
            // Create upload summary after all files are marked complete
            const summary = {
              status: 'complete',
              successCount: files.length,
              errorCount: 0,
              totalFiles: files.length
            };
            setUploadSummary(summary);
            setLastUploadSummary?.(summary);
            
            succesMsg("Folder uploaded successfully!");
            setTimeout(() => setRefresh(prev => !prev), 500);
          };
          
          completeFiles();
        } else {
          handleUploadError(xhr.statusText || "Upload failed");
        }
        setIsUploading(false);
      };
      
      xhr.onerror = () => {
        handleUploadError("Network error occurred during upload");
        setIsUploading(false);
      };
      
      xhr.send(formData);
    } catch (error) {
      handleUploadError(error.message || "Upload failed");
      setIsUploading(false);
    }
  };
  
  const handleUploadError = (errorMessage) => {
    errMsg("Upload failed: " + errorMessage);
    
    // Mark all files as failed
    const failedStatus = {};
    Object.keys(uploadStatus).forEach(filepath => {
      failedStatus[filepath] = {
        ...uploadStatus[filepath],
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
      <button onClick={() => folderInputRef.current.click()}>
        <i className="fa-solid fa-upload"></i>
        <span>Upload Folder</span>
      </button>
      <input
        type="file"
        webkitdirectory=""
        directory=""
        multiple
        ref={folderInputRef}
        onChange={handleFolderChange}
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

export default UploadFolder;
