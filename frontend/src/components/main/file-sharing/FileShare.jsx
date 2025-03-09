import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useContext,
} from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { errMsg, succesMsg } from "../../../utils/helper";
import moment from "moment";
import CreateNewFolder from "./CreateNewFolder";
import UploadFiles from "./UploadFiles";
import UploadFolder from "./UploadFolder";
import Swal from "sweetalert2";
import ArchiveModal from "./ArchiveModal";
import { Modal, Button, Form } from "react-bootstrap";
import FileHistoryModal from "./FileHistoryModal";
import UploadStatusModal from "./UploadStatusModal";
import { TeamConfigContext } from "../../main/Team"; // Import team context

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
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Rename modal state
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [itemToRename, setItemToRename] = useState(null);
  const [newName, setNewName] = useState("");

  //Archive modal
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

  // Add state for history modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedItemForHistory, setSelectedItemForHistory] = useState(null);

  // Add this near the top of your component
  const [lastUploadStatus, setLastUploadStatus] = useState({});
  const [lastUploadSummary, setLastUploadSummary] = useState(null);
  const [showUploadStatusModal, setShowUploadStatusModal] = useState(false);

  const [hasFilePermission, setHasFilePermission] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [teamConfig, setTeamConfig] = useState(null);

  const currentTeamId = useSelector((state) => state.team.currentTeamId);
  const user = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);
  const nextcloudConfig = useSelector(
    (state) => state.configurations.nextcloud
  );

  const toggleShowMenu = () => {
    setShowMenu((prev) => !prev);
  };

  // Handle rename modal
  const handleRenameModalOpen = (item) => {
    setItemToRename(item);
    setNewName(item.name);
    setShowRenameModal(true);
  };

  const handleRenameModalClose = () => {
    setShowRenameModal(false);
    setItemToRename(null);
    setNewName("");
  };

  const handleRename = async () => {
    if (!newName.trim()) {
      errMsg("Name cannot be empty.");
      return;
    }

    try {
      const response = await axios.put(
        `${import.meta.env.VITE_API}/rename/${itemToRename._id}`,
        { newName },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      succesMsg(
        `${
          itemToRename.type === "folder" ? "Folder" : "File"
        } renamed successfully.`
      );
      handleRenameModalClose();
      setRefresh((prev) => !prev); // Refresh the file list
    } catch (error) {
      console.error("Rename error:", error);
      errMsg(
        `Failed to rename ${
          itemToRename.type === "folder" ? "folder" : "file"
        }.`
      );
    }
  };

  const handleArchiveModalClose = () => {
    console.log("Archive modal close");
    setIsArchiveModalOpen(false);
  };
  const handleArchiveModalOpen = () => {
    console.log("Archive modal open");
    setIsArchiveModalOpen(true);
  };

  // Function to handle opening history modal
  const handleHistoryModalOpen = (item) => {
    setSelectedItemForHistory(item);
    setShowHistoryModal(true);
  };

  const handleHistoryModalClose = () => {
    setShowHistoryModal(false);
    setSelectedItemForHistory(null);
  };

  // Add this function to your component
  const viewLatestUploads = () => {
    if (Object.keys(lastUploadStatus).length > 0) {
      setShowUploadStatusModal(true);
    } else {
      Swal.fire({
        icon: "info",
        title: "No Recent Uploads",
        text: "You haven't uploaded any files in this session.",
      });
    }
  };

  useEffect(() => {
    setProgress(0);
  }, [refresh]);

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

  const fetchFilesAndFolders = useCallback(
    async (path = "") => {
      try {
        if (currentTeamId === null) {
          return;
        }
        setSelectedItems([]);
        setIsFileFetching(true);

        // Add a timeout to prevent UI from being permanently stuck
        const timeoutId = setTimeout(() => {
          console.log("Fetch operation timed out");
          setIsFileFetching(false);
        }, 15000); // 15 seconds timeout

        const response = await axios.get(
          `${
            import.meta.env.VITE_API
          }/getFilesAndFoldersByPath/${currentTeamId}?path=${encodeURIComponent(
            path
          )}`
        );

        // Clear timeout since request completed
        clearTimeout(timeoutId);

        console.log("Files and folders:", response.data);
        const sortedFiles = response.data.files.sort((a, b) => {
          if (a.type === "folder" && b.type === "file") return -1;
          if (a.type === "file" && b.type === "folder") return 1;
          return a.name.localeCompare(b.name);
        });

        setFolders(sortedFiles.filter((file) => file.type === "folder"));
        setFiles(sortedFiles.filter((file) => file.type === "file"));
        setIsFileFetching(false);
      } catch (error) {
        console.error("Error fetching files and folders:", error);
        // Important: Make sure we exit loading state even on error
        setIsFileFetching(false);
        errMsg("Failed to load files. Please try again.");
      }
    },
    [currentTeamId]
  ); // Add currentTeamId as a dependency

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

  // Add new function for file editing
  const handleFileEdit = useCallback(
    async (file) => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API}/getPublicLink`,
          {
            params: {
              filePath: file.url,
              permissions: 3, // Request write permissions (3 = read + write)
            },
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.data.publicUrl) {
          // Open the URL in a new tab
          window.open(response.data.publicUrl, "_blank");

          // Record the edit activity in file history
          try {
            await axios.post(
              `${import.meta.env.VITE_API}/recordActivity/${file._id}`,
              {
                action: "edited",
                details: { comment: `File opened for editing` },
              },
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            // Refresh after a short delay to show updated history
            setTimeout(() => setRefresh((prev) => !prev), 1500);
          } catch (historyError) {
            console.error("Failed to record edit activity:", historyError);
            // Don't block the edit flow if history recording fails
          }
        } else {
          errMsg("Failed to generate edit link");
        }
      } catch (error) {
        console.error("Edit error:", error);
        errMsg("Error opening file for editing");
      }
    },
    [token, setRefresh]
  );

  const getTimeFeedback = useCallback(
    (createdAt) => moment(createdAt).fromNow(),
    []
  );

  const handleDelete = useCallback(
    async (fileId, fileName, type) => {
      Swal.fire({
        title: `Move this ${type === "folder" ? "Folder" : "File"} to Trash?`,
        text: `Are you sure you want to move "${fileName}" to trash?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, move it!",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            setIsDeleting(true);
            await axios.delete(
              `${import.meta.env.VITE_API}/soft-delete/${fileId}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );
            succesMsg(
              `${
                type === "folder" ? "Folder" : "File"
              } moved to trash successfully!`
            );

            // Force refresh of data
            setTimeout(() => {
              setRefresh((prev) => !prev);
              fetchFilesAndFolders(currentPath); // Explicitly call fetch again
            }, 300);
          } catch (error) {
            console.error("Delete error:", error);
            errMsg(
              `Failed to move ${
                type === "folder" ? "folder" : "file"
              } to trash!`
            );
          } finally {
            setIsDeleting(false);
          }
        }
      });
    },
    [token, fetchFilesAndFolders, currentPath]
  );

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
          setIsDeleting(true);
          // Use Promise.all to wait for all deletions to complete
          await Promise.all(
            selectedItems.map((itemId) =>
              axios.delete(
                `${import.meta.env.VITE_API}/soft-delete/${itemId}`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              )
            )
          );

          succesMsg("Selected items moved to trash successfully!");
          setRefresh((prev) => !prev); // Now refresh will work after all operations complete
          setSelectedItems([]); // Clear selected items
        } catch (error) {
          console.error("Delete error:", error);
          errMsg("Failed to move selected items to trash!");
        } finally {
          setIsDeleting(false);
        }
      }
    });
  }, [selectedItems, token]);

  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");

  const handleSort = useCallback(
    (field) => {
      if (sortField === field) {
        // Toggle direction if clicking the same field
        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
      } else {
        // Default to ascending when changing sort field
        setSortField(field);
        setSortDirection("asc");
      }
    },
    [sortField, sortDirection]
  );

  // Update the sortedFolders and sortedFiles to use our sorting logic
  const sortedFolders = useMemo(() => {
    const filtered = [...folders].filter((folder) =>
      searchTerm
        ? folder.name.toLowerCase().includes(searchTerm.toLowerCase())
        : true
    );

    const sorted = filtered;
    if (sortField === "name") {
      sorted.sort((a, b) => {
        const comparison = a.name.localeCompare(b.name);
        return sortDirection === "asc" ? comparison : -comparison;
      });
    } else if (sortField === "size") {
      sorted.sort((a, b) => {
        const comparison = a.size - b.size;
        return sortDirection === "asc" ? comparison : -comparison;
      });
    } else if (sortField === "date") {
      sorted.sort((a, b) => {
        const dateA = new Date(
          a.history?.length
            ? a.history[a.history.length - 1].timestamp
            : a.createdAt
        );
        const dateB = new Date(
          b.history?.length
            ? b.history[b.history.length - 1].timestamp
            : b.createdAt
        );
        const comparison = dateA - dateB;
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }
    return sorted;
  }, [folders, sortField, sortDirection, searchTerm]);

  const sortedFiles = useMemo(() => {
    const filtered = [...files].filter((file) =>
      searchTerm
        ? file.name.toLowerCase().includes(searchTerm.toLowerCase())
        : true
    );

    const sorted = filtered;
    if (sortField === "name") {
      sorted.sort((a, b) => {
        const comparison = a.name.localeCompare(b.name);
        return sortDirection === "asc" ? comparison : -comparison;
      });
    } else if (sortField === "size") {
      sorted.sort((a, b) => {
        const comparison = a.size - b.size;
        return sortDirection === "asc" ? comparison : -comparison;
      });
    } else if (sortField === "date") {
      sorted.sort((a, b) => {
        const dateA = new Date(
          a.history?.length
            ? a.history[a.history.length - 1].timestamp
            : a.createdAt
        );
        const dateB = new Date(
          b.history?.length
            ? b.history[b.history.length - 1].timestamp
            : b.createdAt
        );
        const comparison = dateA - dateB;
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }
    return sorted;
  }, [files, sortField, sortDirection, searchTerm]);

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

  // Add this helper function to format history action text
  const formatHistoryAction = useCallback((action) => {
    switch (action) {
      case "created":
        return "Created";
      case "renamed":
        return "Renamed";
      case "moved":
        return "Moved";
      case "deleted":
        return "Moved to trash";
      case "edited":
        return "Edited";
      case "restored":
        return "Restored";
      default:
        return action;
    }
  }, []);

  useEffect(() => {
    // Reset path when team changes
    if (currentTeamId) {
      setPathHistory([]);
      setCurrentPath(currentTeamId);
    }
  }, [currentTeamId]);

  useEffect(() => {
    // Initial data fetch when component mounts or when path/team/refresh changes
    if (currentPath && currentTeamId) {
      fetchFilesAndFolders(currentPath);

      // Also fetch folder size if we're in a folder
      try {
        axios
          .get(
            `${
              import.meta.env.VITE_API
            }/getFolderSize/?path=${encodeURIComponent(currentTeamId)}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          )
          .then((response) => {
            if (response.data && response.data.size !== undefined) {
              setFolderConsume(response.data.size);
            }
          })
          .catch((error) => {
            console.error("Error fetching folder size:", error);
            // Don't block UI on folder size fetch errors
            setIsFileFetching(false);
          });
      } catch (error) {
        console.error("Error setting up folder size fetch:", error);
        setIsFileFetching(false);
      }
    }
  }, [currentPath, currentTeamId, token, fetchFilesAndFolders, refresh]); // Add refresh as dependency

  const [rootFolderHistory, setRootFolderHistory] = useState(null);
  const [rootFolderLoading, setRootFolderLoading] = useState(false);
  const [showRootHistory, setShowRootHistory] = useState(false);

  // New function to fetch root folder history
  const fetchRootFolderHistory = useCallback(async () => {
    if (!currentTeamId) return;

    try {
      setRootFolderLoading(true);

      // Fetch the root folder document which contains history
      const response = await axios.get(
        `${
          import.meta.env.VITE_API
        }/getFilesAndFoldersByPath/${currentTeamId}?path=`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Find the root folder in the response (name matches teamId)
      const rootFolder = response.data.files.find(
        (file) => file.type === "folder" && file.name === currentTeamId
      );

      console.log("Reponse of history", rootFolder);
      if (rootFolder && rootFolder.history) {
        setRootFolderHistory(rootFolder.history);
      }
    } catch (error) {
      console.error("Error fetching root folder history:", error);
    } finally {
      setRootFolderLoading(false);
    }
  }, [currentTeamId, token]);

  // Call the function when teamId changes or component refreshes
  useEffect(() => {
    if (currentTeamId) {
      fetchRootFolderHistory();
    }
  }, [currentTeamId, refresh, fetchRootFolderHistory]);

  const [rootFolderFetching, setRootFolderFetching] = useState(false);

  // Add a function to fetch the root folder ID
  const fetchRootFolderId = useCallback(async () => {
    if (!currentTeamId) return;

    try {
      setRootFolderFetching(true);
      console.log("Fetching root folder ID for team:", currentTeamId);

      const response = await axios.get(
        `${import.meta.env.VITE_API}/getTeamRootFolder/${currentTeamId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success && response.data.rootFolder) {
        console.log("Found root folder ID:", response.data.rootFolder._id);
        setCurrentFolderId(response.data.rootFolder._id);
      } else {
        console.log("Root folder not found for team, setting empty ID");
        setCurrentFolderId("");
      }
    } catch (error) {
      console.error("Error fetching root folder ID:", error);
      setCurrentFolderId("");
    } finally {
      setRootFolderFetching(false);
    }
  }, [currentTeamId, token]);

  // Update the useEffect to fetch the root folder ID when team changes
  useEffect(() => {
    if (currentTeamId) {
      setPathHistory([]);
      setCurrentPath(currentTeamId);
      fetchRootFolderId(); // Fetch the root folder ID
    }
  }, [currentTeamId, fetchRootFolderId]);

  // Check if user has permission to modify files
  const teamContext = useContext(TeamConfigContext);
  const checkFilePermissions = useCallback(async () => {
    if (!currentTeamId || !user) return;

    try {
      // If we already have the configuration from context, use it directly
      if (teamContext?.teamInfo && teamContext?.teamConfiguration) {
        // Add a safety check to ensure members array exists
        const members = teamContext.teamInfo.members || [];

        const currentMember = members.find(
          (member) =>
            member.user &&
            member.user._id === user._id &&
            member.leaveAt === null
        );

        if (currentMember) {
          setUserRole(currentMember.role);

          // Check permissions using the context-provided configuration
          const hasPermission =
            currentMember.role === "leader" ||
            currentMember.isAdmin ||
            (
              teamContext.teamConfiguration?.AllowedRoleToModifyFiles || []
            ).includes(currentMember.role);

          setHasFilePermission(hasPermission);
          return;
        }
      }

      // Fallback to fetching both if not available from context
      const configResponse = await axios.get(
        `${import.meta.env.VITE_API}/getTeamConfiguration/${currentTeamId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (configResponse.data.success) {
        const teamResponse = await axios.get(
          `${import.meta.env.VITE_API}/getTeamById/${currentTeamId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (teamResponse.data) {
          // Find current user in team members
          // Add a safety check to ensure members array exists
          const members = teamResponse.data.members || [];

          const currentMember = members.find(
            (member) =>
              member.user &&
              member.user._id === user._id &&
              member.leaveAt === null
          );

          if (currentMember) {
            setUserRole(currentMember.role);

            // Check permissions: leader, admin, or role in AllowedRoleToModifyFiles
            const hasPermission =
              currentMember.role === "leader" ||
              currentMember.isAdmin ||
              (
                configResponse.data.configuration?.AllowedRoleToModifyFiles ||
                []
              ).includes(currentMember.role);

            setHasFilePermission(hasPermission);
          }
        }
      }
    } catch (error) {
      console.error("Error checking file permissions:", error);
      // Set default permission to false in case of error
      setHasFilePermission(false);
    }
  }, [currentTeamId, user, token, teamContext]);

  // Add a useEffect to log the context for debugging
  useEffect(() => {
    console.log("Team context in FileShare:", teamContext);
  }, [teamContext]);

  // Call permission check when team changes
  useEffect(() => {
    checkFilePermissions();
  }, [currentTeamId, checkFilePermissions]);

  return (
    <div className="file-sharing">
      <div className={`fs-container ${showStorage ? "half-border" : ""}`}>
        {/* Add permission notification banner if user doesn't have permission */}
        {!hasFilePermission && (
          <div
            className="alert alert-info mb-0"
            style={{
              borderTopLeftRadius: "12px",
              borderTopRightRadius: "12px",
            }}
          >
            <i className="fa-solid fa-info-circle me-2"></i>
            You can view and download files, but you don't have permission to
            upload, modify, or delete files.
          </div>
        )}
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
                {/* Only show file buttons if user has permission */}
                {hasFilePermission && (
                  <button
                    className="main-button"
                    onClick={() => setShowFileButtons(!showFileButtons)}
                  >
                    <i className="fa-solid fa-plus"></i>
                    <span>New</span>
                  </button>
                )}
                {/* Only show archive button if user has permission */}
                {hasFilePermission && (
                  <i
                    className="fa-solid fa-box-archive archive-button"
                    onClick={handleArchiveModalOpen}
                  ></i>
                )}
                {/* Team history button - updated to use modal */}
                <div className="team-history-button">
                  <i
                    className="fa-solid fa-clock-rotate-left history-icon"
                    title="Team folder history"
                    onClick={() => {
                      // Create a team folder history item to pass to the modal
                      const teamHistoryItem = {
                        _id: currentTeamId,
                        name: "Team Activity",
                        type: "folder",
                        history: rootFolderHistory || [],
                        createdAt:
                          rootFolderHistory && rootFolderHistory.length > 0
                            ? rootFolderHistory.find(
                                (h) => h.action === "created"
                              )?.timestamp
                            : new Date(),
                        owner: user,
                      };
                      setSelectedItemForHistory(teamHistoryItem);
                      setShowHistoryModal(true);
                    }}
                  ></i>
                </div>
                <i
                  className="fa-solid fa-bars show-storage"
                  onClick={toggleShowStorage}
                ></i>
                {showFileButtons && hasFilePermission && (
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
                      setLastUploadStatus={setLastUploadStatus}
                      setLastUploadSummary={setLastUploadSummary}
                    />

                    <button
                      onClick={viewLatestUploads}
                      className="view-latest-uploads"
                    >
                      <i className="fa-solid fa-list-check"></i>
                      <span>Recent Uploads</span>
                    </button>
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
                    {currentPath.replace(currentTeamId, "")} /
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
                  {hasFilePermission && (
                    <button
                      className="main-button"
                      onClick={() => setShowFileButtons(!showFileButtons)}
                    >
                      <i className="fa-solid fa-plus"></i>
                      <span>New</span>
                    </button>
                  )}
                  {hasFilePermission && (
                    <i
                      className="fa-solid fa-box-archive archive-button"
                      onClick={handleArchiveModalOpen}
                    ></i>
                  )}
                  {/* Team history button - updated to use modal */}
                  <div className="team-history-button">
                    <i
                      className="fa-solid fa-clock-rotate-left history-icon"
                      title="Team folder history"
                      onClick={() => {
                        // Create a team folder history item to pass to the modal
                        const teamHistoryItem = {
                          _id: currentTeamId,
                          name: "Team Activity",
                          type: "folder",
                          history: rootFolderHistory || [],
                          createdAt:
                            rootFolderHistory && rootFolderHistory.length > 0
                              ? rootFolderHistory.find(
                                  (h) => h.action === "created"
                                )?.timestamp
                              : new Date(),
                          owner: user,
                        };
                        setSelectedItemForHistory(teamHistoryItem);
                        setShowHistoryModal(true);
                      }}
                    ></i>
                  </div>
                  <i
                    className="fa-solid fa-bars show-storage"
                    onClick={toggleShowStorage}
                  ></i>
                  {showFileButtons && hasFilePermission && (
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
                        setLastUploadStatus={setLastUploadStatus}
                        setLastUploadSummary={setLastUploadSummary}
                      />
                      <UploadFolder
                        currentPath={currentPath}
                        setRefresh={setRefresh}
                        parentFolder={currentFolderId}
                        setProgress={setProgress}
                        availableUploadSize={availableUploadSize}
                        setLastUploadStatus={setLastUploadStatus}
                        setLastUploadSummary={setLastUploadSummary}
                      />

                      <button
                        onClick={viewLatestUploads}
                        className="view-latest-uploads"
                      >
                        <i className="fa-solid fa-list-check"></i>
                        <span>Recent Uploads</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className={`fs-content ${showStorage ? "half-border" : ""}`}>
          <div className="search-container mb-3">
            <div
              className="input-group"
              style={{ backgroundColor: "transparent" }}
            >
              <input
                type="text"
                className="form-control search-input"
                placeholder="Search files and folders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ backgroundColor: "transparent" }}
              />
              {searchTerm && (
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={() => setSearchTerm("")}
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              )}
            </div>
          </div>
          <div className="fs-content-header">
            <div className="name sortable" onClick={() => handleSort("name")}>
              Name
              {sortField === "name" && (
                <i
                  className={`fa-solid fa-sort-${
                    sortDirection === "asc" ? "up" : "down"
                  } ms-1`}
                ></i>
              )}
            </div>
            <div
              className="filesize sortable"
              onClick={() => handleSort("size")}
            >
              Size
              {sortField === "size" && (
                <i
                  className={`fa-solid fa-sort-${
                    sortDirection === "asc" ? "up" : "down"
                  } ms-1`}
                ></i>
              )}
            </div>
            <div
              className="modification-delete sortable"
              onClick={() => handleSort("date")}
            >
              Date
              {sortField === "date" && (
                <i
                  className={`fa-solid fa-sort-${
                    sortDirection === "asc" ? "up" : "down"
                  } ms-1`}
                ></i>
              )}
            </div>
            <div className="action">
              {selectedItems.length > 0 && hasFilePermission && (
                <button
                  className="bulk-delete-button"
                  onClick={handleDeleteSelected}
                  disabled={!(selectedItems.length > 0)}
                >
                  {isDeleting ? (
                    <div className="loader"></div>
                  ) : (
                    <>
                      <i className="fa-solid fa-trash"></i>
                      <span>Delete</span>
                    </>
                  )}
                </button>
              )}
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
                      {folder.history && folder.history.length > 0 ? (
                        <>
                          <div className="last-action">
                            {formatHistoryAction(
                              folder.history[folder.history.length - 1].action
                            )}{" "}
                            {getTimeFeedback(
                              folder.history[folder.history.length - 1]
                                .timestamp
                            )}{" "}
                            by{" "}
                            {folder.history[folder.history.length - 1]
                              .performedBy?.firstName || ""}{" "}
                            {folder.history[folder.history.length - 1]
                              .performedBy?.lastName || ""}
                          </div>
                        </>
                      ) : (
                        <>
                          Created {getTimeFeedback(folder.createdAt)} by{" "}
                          {folder.owner?.firstName} {folder.owner?.lastName}{" "}
                        </>
                      )}
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
                              <div
                                className="history option"
                                onClick={() => handleHistoryModalOpen(folder)}
                              >
                                <i className="fa-solid fa-clock-rotate-left"></i>
                                <span>History</span>
                              </div>
                              {/* Only show edit options if user has permission */}
                              {hasFilePermission && (
                                <>
                                  <div
                                    className="rename option"
                                    onClick={() =>
                                      handleRenameModalOpen(folder)
                                    }
                                  >
                                    <i className="fa-solid fa-pencil"></i>{" "}
                                    <span>Rename</span>
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
                                    {isDeleting ? (
                                      <div className="loader"></div>
                                    ) : (
                                      <>
                                        <i className="fa-solid fa-trash"></i>
                                        <span>Trash</span>
                                      </>
                                    )}
                                  </div>
                                </>
                              )}
                              <div
                                className="save option"
                                onClick={() => {
                                  handleDownload(folder.url, true);
                                }}
                              >
                                <i className="fa-solid fa-download"></i>
                                <span>Download</span>
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
                      {file.history && file.history.length > 0 ? (
                        <>
                          <div className="last-action">
                            {formatHistoryAction(
                              file.history[file.history.length - 1].action
                            )}{" "}
                            {getTimeFeedback(
                              file.history[file.history.length - 1].timestamp
                            )}{" "}
                            by{" "}
                            {file.history[file.history.length - 1].performedBy
                              ?.firstName || ""}{" "}
                            {file.history[file.history.length - 1].performedBy
                              ?.lastName || ""}
                          </div>
                        </>
                      ) : (
                        <>
                          Created {getTimeFeedback(file.createdAt)} by{" "}
                          {file.owner?.firstName} {file.owner?.lastName}{" "}
                        </>
                      )}
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
                          <div
                            className="view option"
                            onClick={() => handleFileClick(file.url)}
                          >
                            <i className="fa-solid fa-eye"></i>
                            <span>View</span>
                          </div>
                          <div
                            className="history option"
                            onClick={() => handleHistoryModalOpen(file)}
                          >
                            <i className="fa-solid fa-clock-rotate-left"></i>
                            <span>History</span>
                          </div>
                          {/* Only show edit options if user has permission */}
                          {hasFilePermission && (
                            <>
                              <div
                                className="rename option"
                                onClick={() => handleRenameModalOpen(file)}
                              >
                                <i className="fa-solid fa-pencil"></i>
                                <span>Rename</span>
                              </div>
                              <div
                                className="edit option"
                                onClick={() => handleFileEdit(file)}
                              >
                                <i className="fa-solid fa-pen-to-square"></i>{" "}
                                <span>Edit</span>
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
                            </>
                          )}
                          <div
                            className="save option"
                            onClick={() => {
                              handleDownload(file.url, false);
                            }}
                          >
                            <i className="fa-solid fa-download"></i>
                            <span>Download</span>
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
              <button
                className="view-status-btn"
                onClick={() => setShowUploadStatusModal(true)}
              >
                <i className="fa-solid fa-list-check"></i>
                <span>View Upload Status</span>
              </button>
            </>
          )}
          {progress === 0 && Object.keys(lastUploadStatus).length > 0 && (
            <button
              className="view-status-btn last-upload"
              onClick={() => setShowUploadStatusModal(true)}
            >
              <i className="fa-solid fa-list-check"></i>
              <span>View Last Upload</span>
            </button>
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
      {/* File History Modal */}
      <FileHistoryModal
        isOpen={showHistoryModal}
        onClose={handleHistoryModalClose}
        item={selectedItemForHistory}
      />
      {/* Rename Modal */}
      <Modal
        show={showRenameModal}
        onHide={handleRenameModalClose}
        className="rename-modal"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Rename</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label>New Name</Form.Label>
              <Form.Control
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter new name"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleRenameModalClose}>
            Cancel
          </Button>
          <Button className="rename-btn" onClick={handleRename}>
            Rename
          </Button>
        </Modal.Footer>
        <style jsx>{`
          :global(.rename-modal .modal-dialog) {
            max-width: 400px;
            margin: 1.75rem auto;
          }
        `}</style>
      </Modal>
      <UploadStatusModal
        show={showUploadStatusModal}
        onHide={() => setShowUploadStatusModal(false)}
        uploadStatus={lastUploadStatus}
        summary={lastUploadSummary}
      />
      <style jsx>{`
        .team-history-button {
          position: relative;
        }

        .history-icon {
          cursor: pointer;
          padding: 5px;
          color: #555;
          transition: color 0.3s;
        }

        .history-icon:hover {
          color: #007bff;
        }

        .history-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          width: 320px;
          background-color: #fff;
          border: 1px solid #ddd;
          border-radius: 4px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          z-index: 100;
          max-height: 400px;
          overflow-y: auto;
        }

        .history-header {
          padding: 8px 12px;
          font-weight: bold;
          border-bottom: 1px solid #eee;
          background-color: #f8f9fa;
        }

        .history-items {
          padding: 8px 0;
        }

        .history-item {
          padding: 8px 12px;
          border-bottom: 1px solid #f0f0f0;
        }

        .history-item:last-child {
          border-bottom: none;
        }

        .history-action {
          font-weight: 500;
          color: #007bff;
          font-size: 0.9rem;
        }

        .history-details {
          margin: 4px 0;
          font-size: 0.85rem;
          color: #333;
        }

        .history-time,
        .history-user {
          font-size: 0.75rem;
          color: #777;
        }

        .view-all-history {
          text-align: center;
          padding: 6px;
          background-color: #f8f9fa;
          cursor: pointer;
          color: #007bff;
          font-size: 0.8rem;
        }

        .view-all-history:hover {
          background-color: #e9ecef;
        }

        .history-loader {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid rgba(0, 0, 0, 0.1);
          border-top: 2px solid #007bff;
          border-radius: 50%;
          margin-left: 5px;
          vertical-align: middle;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default FileUpload;
