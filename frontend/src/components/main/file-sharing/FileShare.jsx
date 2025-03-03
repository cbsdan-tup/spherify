import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { errMsg, succesMsg } from "../../../utils/helper";
import moment from "moment";
import CreateNewFolder from "./CreateNewFolder";
import UploadFiles from "./UploadFiles";
import UploadFolder from "./UploadFolder";
import Swal from "sweetalert2";
import ArchiveModal from "./ArchiveModal";

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
  const [isFileFetching, setIsFileFetching] = useState(true);
  const [folderConsume, setFolderConsume] = useState(0);
  const [showStorage, setShowStorage] = useState(false);
  const [availableUploadSize, setAvailableUploadSize] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [fileSelected, setFileSelected] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);

  //Archive modal
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

  const currentTeamId = useSelector((state) => state.team.currentTeamId);
  const user = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);
  const nextcloudConfig = useSelector(
    (state) => state.configurations.nextcloud
  );

  const toggleShowMenu = () => {
    setShowMenu((prev) => !prev);
  };

  const handleArchiveModalClose = () => {
    console.log("Archive modal close");
    setIsArchiveModalOpen(false);
  };
  const handleArchiveModalOpen = () => {
    console.log("Archive modal open");
    setIsArchiveModalOpen(true);
  };

  useEffect(() => {
    setProgress(0);
  }, [refresh]);

  useEffect(() => {
    if (currentTeamId && currentPath === "") {
      setCurrentPath(currentTeamId);
      fetchFilesAndFolders(currentTeamId);
    }
    if (currentPath) {
      fetchFilesAndFolders(currentPath);
    }
  }, [currentTeamId, currentPath, refresh]);

  const getFolderSize = useCallback(async () => {
    if (currentTeamId) {
      const size = await fetchFolderConsume(currentTeamId);
      setFolderConsume(size);
    }
  }, [currentTeamId, refresh]);

  useEffect(() => {
    getFolderSize();
  }, [getFolderSize]);

  const fetchFolderConsume = useCallback(
    async (path) => {
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
        return response.data?.size;
      } catch (error) {
        errMsg("Error fetching folder size", error);
      } finally {
        setIsFileFetching(false);
      }
    },
    [token]
  );

  const fetchFilesAndFolders = useCallback(async (path = "") => {
    try {
      setSelectedItems([]);
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
  }, []);

  const toggleShowStorage = () => {
    setShowStorage((prev) => !prev);
  };

  const handleFileChange = useCallback((event) => {
    setUploadingFiles(Array.from(event.target.files));
  }, []);

  const handleUpload = useCallback(async () => {
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
      errMsg("Upload failed", error);
    }
  }, [
    uploadingFiles,
    folderName,
    currentTeamId,
    user._id,
    currentPath,
    fetchFilesAndFolders,
  ]);

  const navigateToFolder = useCallback(
    (folderName, folderId) => {
      setCurrentFolderId(folderId);
      setPathHistory((prev) => [...prev, currentPath]);
      setCurrentPath(currentPath ? `${currentPath}/${folderName}` : folderName);
    },
    [currentPath]
  );

  const navigateBack = useCallback(() => {
    if (pathHistory.length === 0) return;
    const previousPath = pathHistory.pop();
    setCurrentPath(previousPath || currentTeamId);
  }, [pathHistory, currentTeamId]);

  const handleFileClick = useCallback(
    async (url) => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API}/getPublicLink?filePath=${url}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        window.open(response.data.publicUrl, "_blank");
      } catch (error) {
        errMsg("Error fetching files", error);
      }
    },
    [token]
  );

  const getTimeFeedback = useCallback(
    (createdAt) => moment(createdAt).fromNow(),
    []
  );

  const handleDelete = useCallback(async (fileId, fileName, type) => {
    Swal.fire({
      title: `Move this ${type === "folder" ? "Folder" : "File"} to Trash?`,
      text: `Are you sure you want to move "${fileName} to trash"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, move it!",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.delete(
            `${import.meta.env.VITE_API}/soft-delete/${fileId}`
          );
          succesMsg(
            `${
              type === "folder" ? "Folder" : "File"
            } move to trash successfully!`
          );
          setRefresh((prev) => !prev);
        } catch (error) {
          console.error("Delete error:", error);
          errMsg(
            `Failed to move ${type === "folder" ? "folder" : "file"} to trash!`
          );
        }
      }
    });
  }, []);

  const toggleSelection = useCallback((id) => {
    setSelectedItems((prevSelectedItems) =>
      prevSelectedItems.includes(id)
        ? prevSelectedItems.filter((itemId) => itemId !== id)
        : [...prevSelectedItems, id]
    );
  }, []);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedItems.length === 0) {
      errMsg("Please select at least one item to delete.");
      return;
    }

    Swal.fire({
      title: `Move selected items to Trash?`,
      text: `Are you sure you want to move the selected items to trash?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, move them!",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          // Use forEach to delete each selected item
          selectedItems.forEach(async (itemId) => {
            await axios.delete(
              `${import.meta.env.VITE_API}/soft-delete/${itemId}`
            );
          });
          succesMsg("Selected items moved to trash successfully!");
          setRefresh((prev) => !prev); // Refresh the list
          setSelectedItems([]); // Clear selected items
        } catch (error) {
          console.error("Delete error:", error);
          errMsg("Failed to move selected items to trash!");
        }
      }
    });
  }, [selectedItems]);

  const sortedFolders = useMemo(
    () => [...folders].sort((a, b) => a.name.localeCompare(b.name)),
    [folders]
  );
  const sortedFiles = useMemo(
    () => [...files].sort((a, b) => a.name.localeCompare(b.name)),
    [files]
  );

  useEffect(() => {
    if (folderConsume !== null && nextcloudConfig) {
      console.log(
        "Available upload size:",
        nextcloudConfig.maxSizePerTeam * 1024 * 1024 * 1024 - folderConsume
      );
      setAvailableUploadSize(
        nextcloudConfig.maxSizePerTeam * 1024 * 1024 * 1024 - folderConsume
      );
    }
  }, [folderConsume, nextcloudConfig]);

  const handleDownload = async (filePath, isFolder) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API}/downloadFileOrFolder`,
        {
          params: { filePath, isFolder },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        window.open(response.data.downloadUrl, "_blank"); // Open download link in new tab
        succesMsg("Download link opened successfully.");
      } else {
        errMsg("Failed to get download link");
      }
    } catch (error) {
      console.error("Download error:", error);
      errMsg("Failed to download file or folder");
    }
  };

  return (
    <div className="file-sharing">
      <div className={`fs-container ${showStorage ? "half-border" : ""}`}>
        <div className={`fs-header ${showStorage ? "half-border" : ""}`}>
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
                <i
                  className="fa-solid fa-box-archive archive-button"
                  onClick={handleArchiveModalOpen}
                ></i>
                <i
                  className="fa-solid fa-bars show-storage"
                  onClick={toggleShowStorage}
                ></i>

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
                      availableUploadSize={availableUploadSize}
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
                    {currentPath.replace(currentTeamId, "")} {" "}/
                  </div>
                  <div className="back" onClick={navigateBack}>
                    <i className="fa-solid fa-arrow-left"></i> Back
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
                  <i
                    className="fa-solid fa-box-archive archive-button"
                    onClick={handleArchiveModalOpen}
                  ></i>
                  <i
                    className="fa-solid fa-bars show-storage"
                    onClick={toggleShowStorage}
                  ></i>
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
                        availableUploadSize={availableUploadSize}
                      />
                      <UploadFolder
                        currentPath={currentPath}
                        setRefresh={setRefresh}
                        parentFolder={currentFolderId}
                        setProgress={setProgress}
                        availableUploadSize={availableUploadSize}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className={`fs-content ${showStorage ? "half-border" : ""}`}>
          <div className="fs-content-header">
            <div className="name">Name</div>
            <div className="filesize">Size</div>
            <div className="modification-delete">Date</div>
            <div className="action">
              <button
                className="bulk-delete-button"
                onClick={handleDeleteSelected}
                disabled={!(selectedItems.length > 0)}
              >
                <i className="fa-solid fa-trash"></i>
                <span>Delete</span>
              </button>
            </div>
          </div>

          {isFileFetching ? (
            <div className="loader text-center p-2"></div>
          ) : (
            <>
              {sortedFolders.map((folder) => (
                <div key={folder._id} className="folder">
                  <div className="name">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(folder._id)}
                      onChange={() => toggleSelection(folder._id)}
                    />
                    <span
                      onClick={() => navigateToFolder(folder.name, folder._id)}
                    >
                      📁 {folder.name}
                    </span>
                  </div>
                  <div className="filesize">
                    {folder.size >= 1024 * 1024 * 1024
                      ? (folder.size / (1024 * 1024 * 1024)).toFixed(2) + " GB"
                      : folder.size >= 1024 * 1024
                      ? (folder.size / (1024 * 1024)).toFixed(2) + " MB"
                      : folder.size > 0
                      ? (folder.size / 1024).toFixed(2) + " KB"
                      : "0 KB"}
                  </div>
                  <div className="modification-menu">
                    <div className="modification">
                      {getTimeFeedback(folder.createdAt)} by{" "}
                      {folder.owner?.firstName} {folder.owner?.lastName}{" "}
                    </div>
                    <div className="menu">
                      <i
                        className="fa-solid fa-ellipsis-v menu-icon"
                        onClick={() => {
                          toggleShowMenu();
                          setFileSelected(folder._id);
                        }}
                      ></i>
                      {showMenu && fileSelected === folder._id && (
                        <div className="menu-options">
                          {folder.name !== currentTeamId && (
                            <>
                              <div className="rename option" onClick={() => {}}>
                                <i className="fa-solid fa-pencil"></i>{" "}
                                <span>Rename</span>
                              </div>
                              <div
                                className="save option"
                                onClick={() => {
                                  handleDownload(folder.url, true);
                                }}
                              >
                                <i className="fa-solid fa-download"></i>
                                <span>Download</span>
                              </div>
                              <div
                                className="delete option"
                                onClick={() =>
                                  handleDelete(
                                    folder._id,
                                    folder.name,
                                    "folder"
                                  )
                                }
                              >
                                <i className="fa-solid fa-trash"></i>
                                <span>Trash</span>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {sortedFiles.map((file) => (
                <div key={file._id} className="file">
                  <div className="name">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(file._id)}
                      onChange={() => toggleSelection(file._id)}
                    />
                    <span onClick={() => handleFileClick(file.url)}>
                      📄 {file.name}
                    </span>
                  </div>
                  <div className="filesize">
                    {file.size >= 1024 * 1024 * 1024
                      ? (file.size / (1024 * 1024 * 1024)).toFixed(2) + " GB"
                      : file.size >= 1024 * 1024
                      ? (file.size / (1024 * 1024)).toFixed(2) + " MB"
                      : file.size > 0
                      ? (file.size / 1024).toFixed(2) + " KB"
                      : "0 KB"}
                  </div>
                  <div className="modification-menu">
                    <div className="modification">
                      {getTimeFeedback(file.createdAt)} by{" "}
                      {file.owner?.firstName} {file.owner?.lastName}{" "}
                    </div>
                    <div className="menu">
                      <i
                        className="fa-solid fa-ellipsis-v menu-icon"
                        onClick={() => {
                          toggleShowMenu();
                          setFileSelected(file._id);
                        }}
                      ></i>
                      {showMenu && fileSelected === file._id && (
                        <div className="menu-options">
                          <div className="view option" onClick={() => {}}>
                            <i className="fa-solid fa-eye"></i>
                            <span>View</span>
                          </div>
                          <div className="rename option" onClick={() => {}}>
                            <i className="fa-solid fa-pencil"></i>
                            <span>Rename</span>
                          </div>
                          <div className="edit option" onClick={() => {}}>
                            <i className="fa-solid fa-pen-to-square"></i>{" "}
                            <span>Edit</span>
                          </div>
                          <div
                            className="save option"
                            onClick={() => {
                              handleDownload(file.url, false);
                            }}
                          >
                            <i className="fa-solid fa-download"></i>
                            <span>Download</span>
                          </div>
                          <div
                            className="delete option"
                            onClick={() =>
                              handleDelete(file._id, file.name, "file")
                            }
                          >
                            <i className="fa-solid fa-trash"></i>
                            <span>Trash</span>
                          </div>
                        </div>
                      )}
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
      <div className={`file-cards ${showStorage ? "show" : "hide"}`}>
        <div className="card">
          <div className="card-header">File Storage</div>
          <div className="card-body">
            <div className="storage-title">Storage</div>
            {folderConsume !== null && nextcloudConfig && (
              <div className="progress-container">
                <div
                  className="progress-bar"
                  style={{
                    width: `${
                      nextcloudConfig.storageTypePerTeam === "infinity"
                        ? 100
                        : (folderConsume /
                            (nextcloudConfig.maxSizePerTeam *
                              1024 *
                              1024 *
                              1024)) *
                          100
                    }%`,
                  }}
                ></div>
                <div className="progress-text">
                  {(folderConsume / (1024 * 1024)).toFixed(2)} MB /{" "}
                  {nextcloudConfig.storageTypePerTeam === "infinity"
                    ? "∞ (Unlimited)"
                    : `${nextcloudConfig.maxSizePerTeam} GB`}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <ArchiveModal
        isOpen={isArchiveModalOpen}
        onClose={handleArchiveModalClose}
        teamId={currentTeamId}
        setRefresh={setRefresh}
      />
    </div>
  );
};

export default FileUpload;
