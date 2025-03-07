import React, { useEffect, useState } from "react";
import axios from "axios";
import "./ArchiveModal.css";
import Swal from "sweetalert2";
import { useSelector } from "react-redux";

const ArchiveModal = ({ isOpen, onClose, teamId, setRefresh }) => {
  const [deletedFiles, setDeletedFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [selectAll, setSelectAll] = useState(false); // ✅ Track select all state

  const token = useSelector((state) => state.auth.token);

  useEffect(() => {
    if (isOpen) {
      fetchDeletedFiles();
    }
  }, [isOpen]);

  const fetchDeletedFiles = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API}/get-deleted-files/${teamId}`
      );

      if (response.data.deletedFiles) {
        const sortedFiles = response.data.deletedFiles.sort(
          (a, b) => new Date(b.deletedAt) - new Date(a.deletedAt)
        );

        const topLevelFiles = filterTopLevelDeleted(sortedFiles);
        setDeletedFiles(topLevelFiles);
      } else {
        setDeletedFiles([]);
      }
    } catch (error) {
      console.error("Error fetching deleted files:", error);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const filterTopLevelDeleted = (files) => {
    const parentIds = new Set(files.map((file) => file._id));
    return files.filter(
      (file) => !file.parentFolder || !parentIds.has(file.parentFolder)
    );
  };

  const handleSelectFile = (fileId) => {
    const newSelectedFiles = new Set(selectedFiles);
    if (newSelectedFiles.has(fileId)) {
      newSelectedFiles.delete(fileId);
    } else {
      newSelectedFiles.add(fileId);
    }
    setSelectedFiles(newSelectedFiles);
    setSelectAll(newSelectedFiles.size === deletedFiles.length);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedFiles(new Set()); // Unselect all
    } else {
      setSelectedFiles(new Set(deletedFiles.map((file) => file._id))); // Select all
    }
    setSelectAll(!selectAll);
  };

  const handleRestore = async (fileId) => {
    try {
      await axios.put(`${import.meta.env.VITE_API}/restore/${fileId}`, 
        {}, // Empty request body
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      fetchDeletedFiles();
      Swal.fire(
        "Restored!",
        "The file has been successfully restored.",
        "success"
      );
    } catch (error) {
      console.error("Error restoring file:", error);
      Swal.fire("Error", "Failed to restore the file.", "error");
    } finally {
      setRefresh((prev) => !prev);
    }
  };

  const handleDelete = async (fileId) => {
    Swal.fire({
      title: "Are you sure?",
      text: "This action is permanent. The file cannot be recovered!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete permanently",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.delete(`${import.meta.env.VITE_API}/delete/${fileId}`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          fetchDeletedFiles();
          Swal.fire(
            "Deleted!",
            "The file has been permanently deleted.",
            "success"
          );
        } catch (error) {
          console.error("Error deleting file:", error);
          Swal.fire("Error", "Failed to delete the file.", "error");
        } finally {
          setRefresh((prev) => !prev);
        }
      }
    });
  };

  const handleBulkRestore = async () => {
    try {
      for (const fileId of selectedFiles) {
        await axios.put(`${import.meta.env.VITE_API}/restore/${fileId}`, 
          {}, // Empty request body
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
      }
      setSelectedFiles(new Set());
      fetchDeletedFiles();
      Swal.fire("Restored!", "Selected files have been restored.", "success");
    } catch (error) {
      console.error("Error restoring files:", error);
      Swal.fire("Error", "Failed to restore files.", "error");
    } finally {
      setRefresh((prev) => !prev);
    }
  };

  const handleBulkDelete = async () => {
    Swal.fire({
      title: "Are you sure?",
      text: "This action is permanent. Deleted files cannot be recovered!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete permanently",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          for (const fileId of selectedFiles) {
            await axios.delete(`${import.meta.env.VITE_API}/delete/${fileId}`, {
              headers: {
                Authorization: `Bearer ${token}`
              }
            });
          }
          setSelectedFiles(new Set());
          fetchDeletedFiles();
          Swal.fire(
            "Deleted!",
            "Selected files have been permanently deleted.",
            "success"
          );
        } catch (error) {
          console.error("Error deleting files:", error);
          Swal.fire("Error", "Failed to delete files.", "error");
        } finally {
          setRefresh((prev) => !prev);
        }
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay archive-modal">
      <div className="modal-container">
        <div className="modal-header">
          <h2>Archived Files</h2>
          <button className="close-btn" onClick={onClose}>
            ✖
          </button>
        </div>
        <div className="modal-content">
          {loading ? (
            <p>Loading deleted files...</p>
          ) : deletedFiles.length === 0 ? (
            <p>No archived files found.</p>
          ) : (
            <>
              <div className="bulk-actions">
                <div className="select-all action">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                  />
                  <label>Select All</label>
                </div>
                <button
                  className="bulk-restore-btn action"
                  onClick={handleBulkRestore}
                  disabled={selectedFiles.size === 0}
                >
                  <i className="fa-solid fa-rotate-left"></i>
                  <span>Restore</span>
                </button>
                <button
                  className="bulk-delete-btn action"
                  onClick={handleBulkDelete}
                  disabled={selectedFiles.size === 0}
                >
                  <i className="fa-solid fa-trash"></i>
                  <span>Delete</span>
                </button>
              </div>
              <ul className="archive-list">
                {deletedFiles.map((file) => (
                  <li key={file._id} className="archive-item">
                    <div className="file-info">
                      <input
                        type="checkbox"
                        checked={selectedFiles.has(file._id)}
                        onChange={() => handleSelectFile(file._id)}
                      />
                      <span className={`file-type ${file.type}`}>
                        {file.type === "folder" ? "📁" : "📄"}
                      </span>
                      <div className="file-details">
                        <div className="file-name-action">
                          <p className="file-name">{file.name}</p>
                          <div className="button">
                            <button
                              className="restore-btn"
                              onClick={() => handleRestore(file._id)}
                            >
                              <i className="fa-solid fa-rotate-left"></i>
                            </button>
                            <button
                              className="delete-btn"
                              onClick={() => handleDelete(file._id)}
                            >
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          </div>
                        </div>
                        <p className="deleted-at">
                          Deleted At:{" "}
                          {new Date(file.deletedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArchiveModal;
