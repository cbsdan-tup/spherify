import React, { useState, useEffect } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { errMsg } from "../../../utils/helper";
import moment from "moment";
import CreateNewFolder from "./CreateNewFolder";
import UploadFiles from "./UploadFiles";
import LoadingSpinner from "../../layout/LoadingSpinner";
import UploadFolder from "./UploadFolder";
import Swal from "sweetalert2";
import { succesMsg } from "../../../utils/helper";

const FileUpload = () => {
  const [files, setFiles] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [folderName, setFolderName] = useState("");
  const [progress, setProgress] = useState(0);
  const [currentPath, setCurrentPath] = useState("");
  const [pathHistory, setPathHistory] = useState([]);
  const [refresh, setRefresh] = useState(false);
  const [showFileButtons, setShowFileButtons] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState("");

  const currentTeamId = useSelector((state) => state.team.currentTeamId);
  const user = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);

  const [isFileFetching, setIsFileFetching] = useState(true);

  const [folderConsume, setFolderConsume] = useState(0);

  useEffect(() => {
    // Reset path when team changes
    setCurrentPath("");
  }, [currentTeamId]);

  useEffect(() => {
    setRefresh((prev) => !prev);
  }, [currentPath]);

  useEffect(() => {
    setProgress(0);
  }, [refresh]);

  useEffect(() => {
    // Set current path to team id if path is empty
    if (currentTeamId && currentPath === "") {
      setCurrentPath(currentTeamId);
    }
    if (currentTeamId) {
      fetchFilesAndFolders(currentPath);
    }
  }, [currentTeamId, currentPath, refresh, progress]);

  useEffect(() => {
    const getFolderSize = async () => {
      if (currentTeamId) {
        const size = await fetchFolderConsume(currentTeamId);
        setFolderConsume(size);
      }
    };

    getFolderSize();
  }, [currentTeamId]);

  const fetchFolderConsume = async (path) => {
    try {
      setIsFileFetching(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API}/getFolderSize/?path=${encodeURIComponent(
          path
        )}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("Folder size:", response.data);
      return response.data?.size;
    } catch (error) {
      console.error("Error fetching folder size:", error);
      errMsg("Error fetching folder size", error);
    } finally {
      setIsFileFetching(false);
    }
  };

  const fetchFilesAndFolders = async (path = "") => {
    try {
      setIsFileFetching(true);
      const response = await axios.get(
        `${
          import.meta.env.VITE_API
        }/getFilesAndFoldersByPath/${currentTeamId}?path=${encodeURIComponent(
          path
        )}`
      );

      console.log("Files and folders:", response.data);
      const sortedFiles = response.data.files.sort((a, b) => {
        if (a.type === "folder" && b.type === "file") return -1;
        if (a.type === "file" && b.type === "folder") return 1;
        return a.name.localeCompare(b.name);
      });

      setFolders(sortedFiles.filter((file) => file.type === "folder"));
      setFiles(sortedFiles.filter((file) => file.type === "file"));
    } catch (error) {
      console.error("Error fetching files and folders:", error);
    } finally {
      setIsFileFetching(false);
    }
  };

  const handleFileChange = (event) => {
    setUploadingFiles(Array.from(event.target.files));
  };

  const handleUpload = async () => {
    if (!uploadingFiles.length) {
      alert("Please select at least one file.");
      return;
    }

    const formData = new FormData();

    for (let i = 0; i < uploadingFiles.length; i++) {
      formData.append("files", uploadingFiles[i]);
    }

    formData.append("type", uploadingFiles.length > 1 ? "folder" : "file");
    formData.append(
      "name",
      uploadingFiles.length > 1 ? folderName : uploadingFiles[0].name
    );
    formData.append("teamId", currentTeamId);
    formData.append("createdBy", user._id);
    formData.append("owner", user._id);
    formData.append("path", currentPath);

    try {
      console.log("Uploading to path:", currentPath);
      await axios.post(
        `${import.meta.env.VITE_API}/upload?path=${encodeURIComponent(
          currentPath
        )}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setProgress(percentCompleted);
          },
        }
      );

      alert("Upload successful!");
      fetchFilesAndFolders(currentPath);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed");
    }
  };

  const navigateToFolder = (folderName, folderId) => {
    setCurrentFolderId(folderId);
    setPathHistory((prev) => [...prev, currentPath]); // Save current path before navigating
    setCurrentPath(currentPath ? `${currentPath}/${folderName}` : folderName);
  };

  const navigateBack = () => {
    if (pathHistory.length === 0) return;
    const previousPath = pathHistory[pathHistory.length - 1];
    setPathHistory((prev) => prev.slice(0, -1)); // Remove last path from history
    setCurrentPath(previousPath || currentTeamId);
  };

  const handleFileClick = async (url) => {
    try {
      console.log("Passed Url: ", url);
      const response = await axios.get(
        `${import.meta.env.VITE_API}/getPublicLink?filePath=${url}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("Public link:", response.data.publicUrl);
      const fileUrl = response.data.publicUrl;
      window.open(fileUrl, "_blank");
    } catch (error) {
      console.error("Error fetching files:", error);
      errMsg("Error fetching files", error);
    }
  };

  const getTimeFeedback = (createdAt) => {
    return moment(createdAt).fromNow();
  };

  const handleDelete = async (fileId, fileName, type) => {
    console.log("Deleting file:", fileId, fileName, type);

    Swal.fire({
      title: `Delete ${type === "folder" ? "Folder" : "File"}?`,
      text: `Are you sure you want to delete "${fileName}"? This action cannot be undone!`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.delete(`${import.meta.env.VITE_API}/delete/${fileId}`);
          succesMsg(
            `${type === "folder" ? "Folder" : "File"} deleted successfully!`
          );
          setRefresh((prev) => !prev);
        } catch (error) {
          console.error("Delete error:", error);
          errMsg(`Failed to delete ${type === "folder" ? "folder" : "file"}`);
        }
      }
    });
  };

  return (
    <div className="file-sharing">
      <div className="file-cards">
        <div className="card">
          <div className="card-header">File Storage</div>
          <div className="card-body">
            {folderConsume !== null && (
              <div className="progress-container">
                <div
                  className="progress-bar"
                  style={{
                    width: `${
                      (folderConsume / (10 * 1024 * 1024 * 1024)) * 1000
                    }%`, // Max storage = 10GB
                  }}
                ></div>
                <div className="progress-text">
                  {(folderConsume / (1024 * 1024 )).toFixed(2)} MB / 1 GB
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="fs-container">
        <div className="fs-header">
          {currentPath === currentTeamId ? (
            <div className="header-title">
              <div className="left">
                <div>Shared Files</div>{" "}
              </div>
              <div className="right">
                <div className="refresh" onClick={() => setRefresh(!refresh)}>
                  <i className="fa-solid fa-rotate-right"></i>
                </div>
                <button
                  className="main-button"
                  onClick={() => setShowFileButtons(!showFileButtons)}
                >
                  <i className="fa-solid fa-plus"></i>
                  <span>New</span>
                </button>
                {showFileButtons && (
                  <div className="hidden-buttons">
                    <CreateNewFolder
                      parentFolder={currentFolderId}
                      refresh={refresh}
                      setRefresh={setRefresh}
                      relativePath={currentPath}
                    />
                    <UploadFolder
                      currentPath={currentPath}
                      setRefresh={setRefresh}
                      parentFolder={currentFolderId}
                      setProgress={setProgress}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="header-title">
              <div className="left">
                <div className="branch"></div>
                <div className="path">
                  <div className="current-path">
                    {currentPath.replace(currentTeamId, "")}/
                  </div>
                  <div className="back" onClick={navigateBack}>
                    ⬅ Back
                  </div>
                </div>
              </div>
              <div className="right">
                <div className="refresh" onClick={() => setRefresh(!refresh)}>
                  <i className="fa-solid fa-rotate-right"></i>
                </div>
                <div className="button-container">
                  <button
                    className="main-button"
                    onClick={() => setShowFileButtons(!showFileButtons)}
                  >
                    <i className="fa-solid fa-plus"></i>
                    <span>New</span>
                  </button>
                  {showFileButtons && (
                    <div className="hidden-buttons">
                      <CreateNewFolder
                        parentFolder={currentFolderId}
                        refresh={refresh}
                        setRefresh={setRefresh}
                        relativePath={currentPath}
                      />
                      <UploadFiles
                        currentPath={currentPath}
                        setRefresh={setRefresh}
                        parentFolder={currentFolderId}
                        setProgress={setProgress}
                      />
                      <UploadFolder
                        currentPath={currentPath}
                        setRefresh={setRefresh}
                        parentFolder={currentFolderId}
                        setProgress={setProgress}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="fs-content">
          {isFileFetching ? (
            <div className="loader text-center mx-2"></div>
          ) : (
            <>
              {folders.map((folder) => (
                <div key={folder._id} className="folder">
                  <div
                    onClick={() => navigateToFolder(folder.name, folder._id)}
                    className="name"
                  >
                    📁 {folder.name}
                  </div>
                  <div className="modification-delete">
                    <div className="filesize">
                      {folder.size >= 1024 * 1024 * 1024
                        ? (folder.size / (1024 * 1024 * 1024)).toFixed(2) +
                          " GB"
                        : folder.size >= 1024 * 1024
                        ? (folder.size / (1024 * 1024)).toFixed(2) + " MB"
                        : folder.size > 0
                        ? (folder.size / 1024).toFixed(2) + " KB"
                        : "0 KB"}
                    </div>
                    <div className="modification">
                      {getTimeFeedback(folder.createdAt)} by{" "}
                      {folder.owner?.firstName} {folder.owner?.lastName}{" "}
                    </div>
                    {folder.name !== currentTeamId && (
                      <div
                        className="delete"
                        onClick={() =>
                          handleDelete(folder._id, folder.name, "folder")
                        }
                      >
                        <i className="fa-solid fa-trash"></i>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {files.map((file) => (
                <div key={file._id} className="file">
                  <div
                    onClick={() => handleFileClick(file.url)}
                    className="name"
                  >
                    📄 {file.name}
                  </div>
                  <div className="modification-delete">
                    <div className="filesize">
                      {file.size >= 1024 * 1024 * 1024
                        ? (file.size / (1024 * 1024 * 1024)).toFixed(2) + " GB"
                        : file.size >= 1024 * 1024
                        ? (file.size / (1024 * 1024)).toFixed(2) + " MB"
                        : file.size > 0
                        ? (file.size / 1024).toFixed(2) + " KB"
                        : "0 KB"}
                    </div>
                    <div className="modification">
                      {getTimeFeedback(file.createdAt)} by{" "}
                      {file.owner?.firstName} {file.owner?.lastName}{" "}
                    </div>
                    <div
                      className="delete"
                      onClick={() => handleDelete(file._id, file.name, "file")}
                    >
                      <i className="fa-solid fa-trash"></i>
                    </div>
                  </div>
                </div>
              ))}
              {files.length === 0 && folders.length === 0 && (
                <div className="empty">No files or folders</div>
              )}
            </>
          )}
        </div>
        <div className="fs-footer">
          {progress > 0 && progress <= 100 && (
            <>
              <div className="progress">
                <span>Progress</span>
                <progress value={progress} max="100">
                  {progress}%
                </progress>
              </div>
              <div className="status">
                <div className="loader"></div>
                <span className="label">
                  {progress === 100 ? "Finishing" : "Uploading"}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
