import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CreateNewFile from "./CreateNewFile";
import { useSelector } from "react-redux";
import axios from "axios";
import { getToken, succesMsg, errMsg } from "../../../utils/helper";
import { setCurrentFileId } from "../../../redux/teamSlice";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import Swal from 'sweetalert2'; // Import Swal

const LiveEditingTool = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [files, setFiles] = useState([]);

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

  const addNewFile = async (fileName, user, currentTeamId) => {
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

      setFiles([...files, res.data]);
      succesMsg("File created successfully");
    } catch (error) {
      console.error("Error creating file:", error);
      errMsg("Error creating file", error);
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
      // Filter out deleted files
      setFiles(res.data.filter(file => !file.deleted));
    } catch (error) {
      console.error("Error fetching files:", error);
      errMsg("Error fetching files", error);
    }
  };

  const handleFileClick = (fileId) => {
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
  
        // Optionally, remove the deleted document from the UI or refetch documents
        setFiles(files.filter((file) => file._id !== documentId));
  
        Swal.fire('Deleted!', 'Your document has been soft deleted.', 'success');
      } catch (error) {
        console.error("Error deleting document:", error);
        Swal.fire('Error!', 'There was an issue deleting the document.', 'error');
      }
    } else {
      Swal.fire('Cancelled', 'The document was not deleted.', 'info');
    }
  };

  const currentFileId = useSelector((state) => state.team.currentFileId);

  useEffect(() => {
    fetchFiles();
  }, [isFormVisible, currentTeamId]);

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
          <div className="add" onClick={handleAddNewFileClick}>
            <i className="fa-solid fa-plus icon"></i>
            <span className="label">Add New File</span>
          </div>
          {isFormVisible && (
            <CreateNewFile
              show={isFormVisible}
              onHide={handleCloseForm}
              onCreateFile={addNewFile}
            />
          )}
          {files &&
            files.map((file) => (
              <div key={file._id} className="file">
                <Link
                  className={
                    currentFileId === file._id ? "btn btn-primary" : ""
                  }
                  to={`/main/${currentTeamId}/live-editing/${file._id}`}
                  onClick={() => handleFileClick(file._id)}
                >
                  <i className="fa-solid fa-file icon"></i>
                  <span className="label">{file.fileName}</span>
                </Link>
                {/* Soft Delete Button */}
                <button
                  className="btn btn-danger"
                  onClick={() => handleSoftDelete(file._id)}
                >
                  <i className="fa-solid fa-trash"></i>
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default LiveEditingTool;
