import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CreateNewFile from "./CreateNewFile";
import { useSelector } from "react-redux";
import axios from "axios";
import { getToken, succesMsg, errMsg } from "../../../utils/helper";
import { setCurrentFileId } from "../../../redux/teamSlice";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import Swal from 'sweetalert2'; 
import "../../../index.css"; // Import the CSS file


const LiveEditingTool = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [files, setFiles] = useState([]);
  const [deletedFiles, setDeletedFiles] = useState([]);
  const [isLinkEnabled, setIsLinkEnabled] = useState(false);
  const [editingFileId, setEditingFileId] = useState(null);
  const [showTrash, setShowTrash] = useState(false);

  const dispatch = useDispatch();

  const handleToolClick = () => {
    setIsExpanded(!isExpanded);
  };

  const handleAddNewFileClick = () => {
    setIsFormVisible(true);
  };

  const handleCloseForm = () => {
    setIsFormVisible(false);
  };

  const authState = useSelector((state) => state.auth);
  const token = getToken(authState);
  const currentTeamId = useSelector((state) => state.team.currentTeamId);
  const currentFileId = useSelector((state) => state.team.currentFileId);

  const validateFileName = (fileName) => {
    // Check if file name is empty
    if (!fileName || fileName.trim() === '') {
      return { valid: false, message: 'File name cannot be empty' };
    }
    
    // Check if file name is too long (e.g., max 50 characters)
    if (fileName.length > 50) {
      return { valid: false, message: 'File name is too long (maximum 50 characters)' };
    }
    
    // Check for invalid characters (adjust regex as needed)
    const validFileNameRegex = /^[a-zA-Z0-9_\-. ]+$/;
    if (!validFileNameRegex.test(fileName)) {
      return { valid: false, message: 'File name contains invalid characters' };
    }
    
    // Check if file name already exists
    const fileNameExists = files.some(file => 
      file.fileName.toLowerCase() === fileName.toLowerCase()
    );
    if (fileNameExists) {
      return { valid: false, message: 'A file with this name already exists' };
    }
    
    return { valid: true, message: '' };
  };

  const validateFileNameForRename = (fileName, currentFileId) => {
    // Check if file name is empty
    if (!fileName || fileName.trim() === '') {
      return { valid: false, message: 'File name cannot be empty' };
    }
    
    // Check if file name is too long
    if (fileName.length > 50) {
      return { valid: false, message: 'File name is too long (maximum 50 characters)' };
    }
    
    // Check for invalid characters
    const validFileNameRegex = /^[a-zA-Z0-9_\-. ]+$/;
    if (!validFileNameRegex.test(fileName)) {
      return { valid: false, message: 'File name contains invalid characters' };
    }
    
    // Check if file name already exists (excluding the current file)
    const fileNameExists = files.some(file => 
      file.fileName.toLowerCase() === fileName.toLowerCase() && 
      file._id !== currentFileId
    );
    if (fileNameExists) {
      return { valid: false, message: 'A file with this name already exists' };
    }
    
    return { valid: true, message: '' };
  };

  // Add this function to your LiveEditingTool component
const addNewFile = async (fileName, user, currentTeamId) => {
  // Check if file name already exists (case-insensitive)
  const fileNameExists = files.some(file => 
    file.fileName.toLowerCase() === fileName.toLowerCase()
  );
  
  if (fileNameExists) {
    errMsg("A file with this name already exists");
    return false;
  }
  
  try {
    const newFile = { fileName, createdBy: user._id, teamId: currentTeamId };
    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    };
    const res = await axios.post(
      `${import.meta.env.VITE_API}/createDocument/${currentTeamId}`,
      newFile,
      config
    );

    setFiles((prevFiles) => [...prevFiles, res.data]);
    succesMsg("File created successfully");
    return true;
  } catch (error) {
    console.error("Error creating file:", error);
    errMsg("Error creating file", error);
    return false;
  } finally {
    setIsFormVisible(false);
  }
};

  const fetchFiles = async () => {
    try {
      const config = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      };
      const res = await axios.get(
        `${import.meta.env.VITE_API}/getDocuments/${currentTeamId}`,
        config
      );
      console.log("files", res.data);
      
      // Separate active and deleted files
      const activeFiles = res.data.filter(file => !file.deleted);
      const trashFiles = res.data.filter(file => file.deleted);
      
      setFiles(activeFiles);
      setDeletedFiles(trashFiles);
    } catch (error) {
      console.error("Error fetching files:", error);
      errMsg("Error fetching files", error);
    }
  };

  const handleFileClick = (fileId) => {
    setIsLinkEnabled(false);
    dispatch(setCurrentFileId(fileId));
  };

  const handleSoftDelete = async (documentId) => {
    // Show confirmation dialog with SweetAlert
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to undo this action!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
    });
  
    if (result.isConfirmed) {
      try {
        // Proceed with the delete operation if confirmed
        await axios.delete(`${import.meta.env.VITE_API}/softDeleteDocument/${documentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
  
        // Find the deleted file before removing it from active files
        const deletedFile = files.find(file => file._id === documentId);
        
        // Remove the deleted document from the active files
        setFiles(files.filter((file) => file._id !== documentId));
        
        // Add to deleted files with deleted flag
        if (deletedFile) {
          setDeletedFiles([...deletedFiles, {...deletedFile, deleted: true}]);
        }
  
        Swal.fire('Deleted!', 'Your document has been deleted.', 'success');
      } catch (error) {
        console.error("Error deleting document:", error);
        Swal.fire('Error!', 'There was an issue deleting the document.', 'error');
      }
    } else {
      Swal.fire('Cancelled', 'The document was not deleted.', 'info');
    }
  };

  const handleRestoreFile = async (documentId) => {
    try {
      const config = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      };
      
      // Make API call to restore the document
      await axios.put(
        `${import.meta.env.VITE_API}/restoreDocument/${documentId}`,
        {},  // Empty body, we're just changing the deleted status
        config
      );
      
      // Find the restored file
      const restoredFile = deletedFiles.find(file => file._id === documentId);
      
      // Update UI state
      if (restoredFile) {
        // Remove from deleted files
        setDeletedFiles(deletedFiles.filter(file => file._id !== documentId));
        
        // Add to active files with deleted flag set to false
        setFiles([...files, {...restoredFile, deleted: false}]);
        
        succesMsg("File restored successfully");
      }
    } catch (error) {
      console.error("Error restoring file:", error);
      errMsg("Error restoring file", error);
    }
  };

  // Toggle trash view
  const toggleTrashView = () => {
    setShowTrash(!showTrash);
  };

  useEffect(() => {
    setIsLinkEnabled(false);
    const timer = setTimeout(() => {
      setIsLinkEnabled(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [currentFileId]);

  // Consolidated useEffect for fetching files
  useEffect(() => {
    if (currentTeamId) {
      fetchFiles();
    }
  }, [currentTeamId, isFormVisible, token]);

  const handleRename = async (fileId) => {
    // Get the current file name
    const file = files.find(f => f._id === fileId);
    if (!file) return;
    
    const originalFileName = file.fileName;
    
    // Show a dialog to get the new name with custom validation
    const { value: newFileName, dismiss } = await Swal.fire({
      title: 'Rename File',
      input: 'text',
      inputLabel: 'New file name',
      inputValue: originalFileName,
      showCancelButton: true,
      inputValidator: (value) => {
        const validation = validateFileNameForRename(value, fileId);
        if (!validation.valid) {
          return validation.message;
        }
      }
    });
    
    if (newFileName && newFileName !== originalFileName) {
      try {
        const config = {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        };
        
        // Check for duplicate file names specifically
        const isDuplicate = files.some(file => 
          file.fileName.toLowerCase() === newFileName.toLowerCase() && 
          file._id !== fileId
        );
        
        if (isDuplicate) {
          // If duplicate, revert to original name and show message
          Swal.fire({
            icon: 'error',
            title: 'Duplicate file name',
            text: 'A file with this name already exists. Reverting to original name.',
          });
          return;
        }
        
        // Proceed with the rename operation
        const res = await axios.put(
          `${import.meta.env.VITE_API}/renameDocument/${fileId}`,
          { newFileName },
          config
        );
        
        // Update the files list
        setFiles(files.map(f => 
          f._id === fileId ? { ...f, fileName: newFileName } : f
        ));
        
        succesMsg("File renamed successfully");
      } catch (error) {
        console.error("Error renaming file:", error);
        errMsg("Error renaming file", error);
        
        // If there's a server error, revert to original name in the UI
        setFiles(files.map(f => 
          f._id === fileId ? { ...f, fileName: originalFileName } : f
        ));
      }
    }
  };

  return (
    <div className="tool-container custom-text-white">
      <div className="header" onClick={handleToolClick}>
        <i
          className={
            isExpanded
              ? "fa-solid arrow fa-arrow-down"
              : "fa-solid arrow fa-arrow-right"
          }
        ></i>
        <span className="tool-title">Live Editing</span>
      </div>
      {isExpanded && (
        <div className="tool-content">
          <div className="tool-actions">
            <div className="add" onClick={handleAddNewFileClick}>
              <i className="fa-solid fa-plus icon"></i>
              <span className="label">Add New File</span>
            </div>
            <div className="trash-toggle" onClick={toggleTrashView}>
              <i className={`fa-solid ${showTrash ? "fa-file" : "fa-trash"} icon`}></i>
              <span className="label">{showTrash ? "View Files" : "View Trash"}</span>
            </div>
          </div>
          
          {isFormVisible && (
            <CreateNewFile
              show={isFormVisible}
              onHide={handleCloseForm}
              onCreateFile={addNewFile}
              validateFileName={validateFileName}
            />
          )}
          
          {!showTrash ? (
            // Regular files view
            files.map((file) => (
              <div key={file._id} className="tool-file-container">
                <Link
                  className={
                    currentFileId === file._id
                      ? "file btn btn-primary p-0"
                      : "file p-0"
                  }
                  to={`/main/${currentTeamId}/live-editing/${file._id}`}
                  onClick={() => handleFileClick(file._id)}
                  style={{
                    pointerEvents: isLinkEnabled ? "auto" : "none",
                    opacity: isLinkEnabled ? 1 : 0.5,
                  }}
                >
                  <div className="file">
                    <i className="fa-solid fa-file icon"></i>
                    <span className="label">{file.fileName}</span>
                  </div>
                </Link>

                {/* Rename Button */}
                <button
                  className="tool-rename-btn"
                  onClick={(e) => {
                    e.preventDefault(); 
                    handleRename(file._id); 
                  }}
                >
                  <i className="fa-solid fa-pen-to-square"></i>
                </button>

                {/* Delete Button */}
                <button
                  className="tool-delete-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    handleSoftDelete(file._id); 
                  }}
                >
                  <i className="fa-solid fa-trash"></i>
                </button>
              </div>
            ))
          ) : (
            // Trash view
            <div className="trash-view">
              <h4>Deleted Files</h4>
              {deletedFiles.length === 0 ? (
                <p className="empty-trash-message">No deleted files</p>
              ) : (
                deletedFiles.map((file) => (
                  <div key={file._id} className="deleted-file-container">
                    <div className="tool-deleted-file">
                      <i className="fa-solid fa-file-circle-xmark icon"></i>
                      <span className="label">{file.fileName}</span>
                    </div>
                    
                    {/* Restore Button */}
                    <button
                      className="tool-restore-btn"
                      onClick={() => handleRestoreFile(file._id)}
                      title="Restore file"
                    >
                      <i className="fa-solid fa-trash-arrow-up"></i>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LiveEditingTool;