import React, { useState, useEffect, useCallback } from "react";
import {
  Modal,
  Button,
  Table,
  Spinner,
  Form,
  InputGroup,
  OverlayTrigger,
  Tooltip,
} from "react-bootstrap";
import { useSelector } from "react-redux";
import axios from "axios";
import {
  bytesToSize,
  formatDate,
  errMsg,
  succesMsg,
} from "../../../utils/helper";
import Swal from "sweetalert2";
import ArchiveModal from "../../main/file-sharing/ArchiveModal";
// Import the FileHistoryModal component
import FileHistoryModal from "../../main/file-sharing/FileHistoryModal";

const TeamStorageModal = ({ show, onHide, team, token }) => {
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState("");
  const [pathHistory, setPathHistory] = useState([]);
  const [breadcrumbs, setBreadcrumbs] = useState([{ name: "Root", path: "" }]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [totalStorageSize, setTotalStorageSize] = useState(0);
  const [isLoadingStorage, setIsLoadingStorage] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [itemToRename, setItemToRename] = useState(null);
  const [newName, setNewName] = useState("");
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  // Add state for file history modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedItemForHistory, setSelectedItemForHistory] = useState(null);

  const nextcloudConfig = useSelector(
    (state) => state.configurations.nextcloud
  );

  // Extract team ID when the team prop changes
  useEffect(() => {
    if (team) {
      // Set the currentPath to team ID directly rather than empty string
      setCurrentPath(team._id);
      setPathHistory([]);
      setBreadcrumbs([{ name: team.name, path: team._id }]);
      fetchFilesAndFolders(team._id, team._id);
      fetchFolderSize(team._id);
    }
  }, [team]);

  // Fetch files and folders for the specified team path
  const fetchFilesAndFolders = useCallback(
    async (path = "", teamId) => {
      if (!teamId) return;

      try {
        setIsLoading(true);
        const encodedPath = path ? encodeURIComponent(path) : "";
        const response = await axios.get(
          `${
            import.meta.env.VITE_API
          }/admin/getFilesAndFoldersByPath?path=${encodedPath}&teamId=${teamId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        // Sort files, putting folders first
        const sortedFiles = response.data.files.sort((a, b) => {
          if (a.type === "folder" && b.type === "file") return -1;
          if (a.type === "file" && b.type === "folder") return 1;
          return a.name.localeCompare(b.name);
        });

        setFiles(sortedFiles || []);
        updateBreadcrumbs(path, team?.name || "Team");
      } catch (error) {
        console.error("Error fetching files and folders:", error);
        errMsg("Failed to load files. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [token]
  );

  // Fetch folder size for storage statistics
  const fetchFolderSize = useCallback(
    async (teamId) => {
      if (!teamId) return;

      try {
        setIsLoadingStorage(true);
        const response = await axios.get(
          `${import.meta.env.VITE_API}/getFolderSize/?path=${encodeURIComponent(
            teamId
          )}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.data && response.data.size !== undefined) {
          setTotalStorageSize(Number(response.data.size) || 0);
        } else {
          setTotalStorageSize(0);
        }
      } catch (error) {
        console.error("Error fetching folder size:", error);
        setTotalStorageSize(0);
      } finally {
        setIsLoadingStorage(false);
      }
    },
    [token]
  );

  // Navigation functions
  const navigateToFolder = (folderName, path) => {
    setPathHistory((prev) => [...prev, currentPath]);
    const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
    setCurrentPath(newPath);
    fetchFilesAndFolders(newPath, team?._id);
  };

  // Back button logic should respect the team ID as the root
  const navigateBack = () => {
    if (pathHistory.length === 0) return;

    const previousPath = pathHistory[pathHistory.length - 1];
    setPathHistory((prev) => prev.slice(0, -1));
    setCurrentPath(previousPath);
    fetchFilesAndFolders(previousPath, team?._id);
  };

  const navigateToBreadcrumb = (path) => {
    if (path === currentPath) return;

    // Calculate new path history
    const pathParts = currentPath.split("/").filter(Boolean);
    const targetParts = path.split("/").filter(Boolean);

    let newHistory = [...pathHistory];

    if (targetParts.length < pathParts.length) {
      // We're going up in the hierarchy
      newHistory = pathHistory.slice(0, targetParts.length);
    }

    setPathHistory(newHistory);
    setCurrentPath(path);
    fetchFilesAndFolders(path, team?._id);
  };

  // Update breadcrumbs based on the current path
  const updateBreadcrumbs = (path, teamName) => {
    // For team ID path (root level), show just the team name
    if (!path || path === team?._id) {
      setBreadcrumbs([{ name: teamName, path: team?._id || "" }]);
      return;
    }

    // For paths within team folders, show full path
    const pathSegments = path.split("/").filter(Boolean);
    const newBreadcrumbs = [
      { name: teamName, path: team?._id || "" },
      ...pathSegments
        .filter((segment) => segment !== team?._id) // Filter out team ID from segments
        .map((segment, index) => {
          const fullPath = [
            team?._id,
            ...pathSegments.slice(0, index + 1),
          ].join("/");
          return {
            name: segment,
            path: fullPath,
          };
        }),
    ];

    setBreadcrumbs(newBreadcrumbs);
  };

  // File operations
  const handleFileClick = async (url) => {
    try {
      const response = await axios.get(
        `${
          import.meta.env.VITE_API
        }/getPublicLink?filePath=${encodeURIComponent(url)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      window.open(response.data.publicUrl, "_blank");
      succesMsg("Opening file...");
    } catch (error) {
      errMsg("Error opening file", error);
    }
  };

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
        window.open(response.data.downloadUrl, "_blank");
        succesMsg("Download link opened successfully.");
      } else {
        errMsg("Failed to get download link");
      }
    } catch (error) {
      errMsg("Failed to download file or folder");
    }
  };

  const handleDelete = (fileId, fileName, type) => {
    Swal.fire({
      title: `Move this ${type === "folder" ? "Folder" : "File"} to Trash?`,
      text: `Are you sure you want to move "${fileName}" to trash?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, move it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.delete(
            `${import.meta.env.VITE_API}/soft-delete/${fileId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          succesMsg(
            `${
              type === "folder" ? "Folder" : "File"
            } moved to trash successfully!`
          );

          // Refresh the file list
          fetchFilesAndFolders(currentPath, team?._id);
          fetchFolderSize(team?._id);
        } catch (error) {
          errMsg(
            `Failed to move ${type === "folder" ? "folder" : "file"} to trash!`
          );
        }
      }
    });
  };

  // Rename functionality
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
      await axios.put(
        `${import.meta.env.VITE_API}/rename/${itemToRename._id}`,
        { newName },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      succesMsg(
        `${
          itemToRename.type === "folder" ? "Folder" : "File"
        } renamed successfully.`
      );
      handleRenameModalClose();

      // Refresh the file list
      fetchFilesAndFolders(currentPath, team?._id);
    } catch (error) {
      errMsg(
        `Failed to rename ${
          itemToRename.type === "folder" ? "folder" : "file"
        }.`
      );
    }
  };

  // Sorting and filtering
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const filteredAndSortedFiles = files
    .filter((file) => {
      const matchesSearch = searchTerm
        ? file.name.toLowerCase().includes(searchTerm.toLowerCase())
        : true;
      const matchesType = filterType ? file.type === filterType : true;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      // First sort folders before files
      if (a.type === "folder" && b.type === "file") return -1;
      if (a.type === "file" && b.type === "folder") return 1;

      // Then apply the selected sort
      if (sortField === "size") {
        return sortDirection === "asc" ? a.size - b.size : b.size - a.size;
      }
      if (sortField === "name") {
        return sortDirection === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      // Default sort by date
      return sortDirection === "asc"
        ? new Date(a.createdAt) - new Date(b.createdAt)
        : new Date(b.createdAt) - new Date(a.createdAt);
    });

  // File type icons
  const getFileIcon = (name) => {
    if (!name) return <i className="fa-solid fa-file text-secondary"></i>;

    const ext = name.split(".").pop().toLowerCase();
    switch (ext) {
      case "pdf":
        return <i className="fa-solid fa-file-pdf text-danger"></i>;
      case "doc":
      case "docx":
        return <i className="fa-solid fa-file-word text-primary"></i>;
      case "xls":
      case "xlsx":
        return <i className="fa-solid fa-file-excel text-success"></i>;
      case "ppt":
      case "pptx":
        return <i className="fa-solid fa-file-powerpoint text-warning"></i>;
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return <i className="fa-solid fa-file-image text-info"></i>;
      case "zip":
      case "rar":
        return <i className="fa-solid fa-file-archive text-secondary"></i>;
      default:
        return <i className="fa-solid fa-file text-secondary"></i>;
    }
  };

  // Archive modal handlers
  const handleArchiveModalOpen = () => {
    setIsArchiveModalOpen(true);
  };

  const handleArchiveModalClose = () => {
    setIsArchiveModalOpen(false);
  };

  // Add handler functions for history modal
  const handleHistoryModalOpen = (item) => {
    setSelectedItemForHistory(item);
    setShowHistoryModal(true);
  };

  const handleHistoryModalClose = () => {
    setShowHistoryModal(false);
    setSelectedItemForHistory(null);
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="xl"
      backdrop="static"
      keyboard={false}
      className="team-storage-modal"
    >
      <Modal.Header closeButton>
        <Modal.Title>{team?.name} - Team Files</Modal.Title>
      </Modal.Header>

      <Modal.Body
        style={{ flexDirection: "column", alignItems: "unset", gap: "0" }}
      >
        <div className="d-flex justify-content-between mb-3 align-items-center" style={{gap: "1rem"}}>
          <div className="storage-info" style={{ flex: 1 }}>
            <h5>Storage Usage</h5>
            {isLoadingStorage ? (
              <Spinner animation="border" size="sm" />
            ) : (
              <div>
                <div className="progress mb-2" style={{ height: "20px" }}>
                  <div
                    className={`progress-bar ${
                      nextcloudConfig?.storageTypePerTeam === "infinity"
                        ? "bg-success"
                        : totalStorageSize >
                          nextcloudConfig?.maxSizePerTeam *
                            0.9 *
                            1024 *
                            1024 *
                            1024
                        ? "bg-danger"
                        : "bg-success"
                    }`}
                    role="progressbar"
                    style={{
                      width: `${
                        nextcloudConfig?.storageTypePerTeam === "infinity"
                          ? 50 // Just show 50% for unlimited storage
                          : Math.min(
                              (totalStorageSize /
                                (nextcloudConfig?.maxSizePerTeam *
                                  1024 *
                                  1024 *
                                  1024)) *
                                100,
                              100
                            )
                      }%`,
                    }}
                    aria-valuenow={Math.min(
                      (totalStorageSize /
                        ((nextcloudConfig?.maxSizePerTeam || 1) *
                          1024 *
                          1024 *
                          1024)) *
                        100,
                      100
                    )}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  >
                    {nextcloudConfig?.storageTypePerTeam === "infinity"
                      ? "Unlimited"
                      : `${Math.round(
                          (totalStorageSize /
                            (nextcloudConfig?.maxSizePerTeam *
                              1024 *
                              1024 *
                              1024)) *
                            100
                        )}%`}
                  </div>
                </div>
                <div className="d-flex justify-content-between">
                  <span>Used: {bytesToSize(totalStorageSize)}</span>
                  <span>
                    Limit:{" "}
                    {nextcloudConfig?.storageTypePerTeam === "infinity"
                      ? "Unlimited"
                      : `${nextcloudConfig?.maxSizePerTeam} GB`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Add Archive Button */}
          <div>
            <Button
              size="sm"
              onClick={handleArchiveModalOpen}
              className="ms-2 text-danger"
              style={{
                border: "none",
                display: "flex",
                flexDirection: "column",
                gap: "0.3rem",
                fontSize: "1rem",
                backgroundColor: "transparent",
              }}
            >
              <i
                className="fa-solid fa-box-archive me-1"
                style={{ fontSize: "1.2rem" }}
              ></i>
              <span>Archive</span>
            </Button>
          </div>
        </div>

        {/* Breadcrumb navigation */}
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            {breadcrumbs.map((crumb, index) => (
              <li
                key={index}
                className={`breadcrumb-item ${
                  index === breadcrumbs.length - 1 ? "active" : ""
                }`}
              >
                {index === breadcrumbs.length - 1 ? (
                  crumb.name
                ) : (
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      navigateToBreadcrumb(crumb.path);
                    }}
                  >
                    {crumb.name}
                  </a>
                )}
              </li>
            ))}
          </ol>
        </nav>

        {/* Search and filter controls */}
        <div className="d-flex flex-wrap gap-3 mb-3">
          <InputGroup className="w-auto flex-grow-1">
            <InputGroup.Text>
              <i className="fa-solid fa-search"></i>
            </InputGroup.Text>
            <Form.Control
              placeholder="Search by filename..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>

          <Form.Select
            className="w-auto"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">All Files</option>
            <option value="file">Files</option>
            <option value="folder">Folders</option>
          </Form.Select>
        </div>

        {/* Files and folders table */}
        {isLoading ? (
          <div className="text-center p-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2">Loading files...</p>
          </div>
        ) : (
          <Table hover responsive>
            <thead>
              <tr>
                <th
                  onClick={() => handleSort("name")}
                  style={{ cursor: "pointer", gap: "0.3rem" }}
                  className="w-40"
                >
                  Name{" "}
                  {sortField === "name" && (
                    <i
                      className={`fa-solid fa-sort-${
                        sortDirection === "asc" ? "up" : "down"
                      }`}
                    ></i>
                  )}
                </th>
                <th
                  onClick={() => handleSort("size")}
                  style={{ cursor: "pointer", gap: "0.3rem" }}
                >
                  Size{" "}
                  {sortField === "size" && (
                    <i
                      className={`fa-solid fa-sort-${
                        sortDirection === "asc" ? "up" : "down"
                      }`}
                    ></i>
                  )}
                </th>
                <th>Owner</th>
                <th
                  onClick={() => handleSort("createdAt")}
                  style={{ cursor: "pointer", gap: "0.3rem" }}
                >
                  Created{" "}
                  {sortField === "createdAt" && (
                    <i
                      className={`fa-solid fa-sort-${
                        sortDirection === "asc" ? "up" : "down"
                      }`}
                    ></i>
                  )}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedFiles.length > 0 ? (
                filteredAndSortedFiles.map((file) => (
                  <tr key={file._id}>
                    <td>
                      <div
                        className="d-flex align-items-center"
                        style={{ cursor: "pointer", gap: "0.3rem" }}
                        onClick={() =>
                          file.type === "folder"
                            ? navigateToFolder(file.name, file.relativePath)
                            : handleFileClick(file.url)
                        }
                      >
                        <span className="me-2">
                          {file.type === "folder" ? (
                            <i className="fa-solid fa-folder text-warning"></i>
                          ) : (
                            getFileIcon(file.name)
                          )}
                        </span>
                        <OverlayTrigger
                          placement="top"
                          overlay={<Tooltip>{file.name}</Tooltip>}
                        >
                          <span
                            className="text-truncate d-inline-block"
                            style={{ maxWidth: "300px" }}
                          >
                            {file.name}
                          </span>
                        </OverlayTrigger>
                      </div>
                    </td>
                    <td>{file.size ? bytesToSize(file.size) : "N/A"}</td>
                    <td>
                      {file.owner?.firstName} {file.owner?.lastName}
                    </td>
                    <td>{formatDate(file.createdAt)}</td>
                    <td>
                      <div className="d-flex gap-1">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            file.type === "folder"
                              ? navigateToFolder(file.name, file.relativePath)
                              : handleFileClick(file.url);
                          }}
                        >
                          <i
                            className={`fa-solid ${
                              file.type === "folder"
                                ? "fa-folder-open"
                                : "fa-eye"
                            }`}
                          ></i>
                        </Button>
                        {/* Add history button */}
                        <Button
                          variant="outline-info"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleHistoryModalOpen(file);
                          }}
                        >
                          <i className="fa-solid fa-clock-rotate-left"></i>
                        </Button>
                        <Button
                          variant="outline-success"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(file.url, file.type === "folder");
                          }}
                        >
                          <i className="fa-solid fa-download"></i>
                        </Button>
                        <Button
                          variant="outline-warning"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRenameModalOpen(file);
                          }}
                        >
                          <i className="fa-solid fa-pencil"></i>
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(file._id, file.name, file.type);
                          }}
                        >
                          <i className="fa-solid fa-trash"></i>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-4">
                    {files.length === 0
                      ? "No files found in this location."
                      : "No matching files found."}
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        )}

        {/* Include FileHistoryModal */}
        <FileHistoryModal
          isOpen={showHistoryModal}
          onClose={handleHistoryModalClose}
          item={selectedItemForHistory}
        />

        {/* Archive Modal */}
        <ArchiveModal
          isOpen={isArchiveModalOpen}
          onClose={handleArchiveModalClose}
          teamId={team?._id}
          setRefresh={() => fetchFilesAndFolders(currentPath, team?._id)}
        />

        {/* Rename Modal */}
        <Modal show={showRenameModal} onHide={handleRenameModalClose} size="sm" className="rename-modal">
          <Modal.Header closeButton>
            <Modal.Title>
              Rename {itemToRename?.type === "folder" ? "Folder" : "File"}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group>
              <Form.Label>New Name</Form.Label>
              <Form.Control
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleRenameModalClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleRename}>
              Rename
            </Button>
          </Modal.Footer>
        </Modal>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default TeamStorageModal;
