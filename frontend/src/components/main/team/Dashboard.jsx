import React, { useEffect, useState, useCallback, useRef } from "react";
import { Pie, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import { FaPlus, FaPencilAlt } from "react-icons/fa";
import axios from "axios";
import { useSelector } from "react-redux";
import { errMsg, succesMsg, getToken, socket } from "../../../utils/helper";
import { toast } from "react-toastify";
import FileShare from "../file-sharing/FileShare";
import InviteMemberPopUp from "../InviteMemberPopUp";
import Calendar from "../projectmanagement/Calendar";
import moment from "moment";
import { Link } from "react-router";
import CreateNewFile from "../live-editing/CreateNewFile";
import { Modal, Button, Form } from "react-bootstrap";
import { fetchTeamMembers } from "../../../functions/TeamFunctions";
import debounce from "lodash/debounce";

// Register chart elements
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

// New component for editing team members
const EditMemberModal = ({
  show,
  onHide,
  member,
  isCurrentUserAdmin,
  onUpdateMember,
  onRemoveMember,
}) => {
  const [nickname, setNickname] = useState(member?.nickname || "");
  const [role, setRole] = useState(member?.role || "member");
  const [isAdmin, setIsAdmin] = useState(member?.isAdmin || false);

  useEffect(() => {
    if (member) {
      setNickname(member.nickname || "");
      setRole(member.role || "member");
      setIsAdmin(member.isAdmin || false);
    }
  }, [member]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdateMember({
      userId: member.user._id,
      nickname,
      role,
      isAdmin,
    });
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case "owner":
        return "bg-danger";
      case "moderator":
        return "bg-warning";
      default:
        return "bg-primary";
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered className="edit-member-modal">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="text-center w-100">
          Team Member Details
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="pt-0">
        {member && (
          <Form onSubmit={handleSubmit}>
            <div className="text-center mb-4 member-profile">
              <div className="avatar-container mx-auto mb-3 mt-3">
                <img
                  src={member.user?.avatar?.url || "/images/account.png"}
                  alt={member.user?.firstName}
                  className="rounded-circle dashboard-member-avatar"
                  width="100"
                  height="100"
                />
                <span
                  className={`status-indicator ${
                    member.user?.status === "active" ? "active" : "offline"
                  }`}
                ></span>
              </div>
              <h4 className="mb-1 fw-bold">
                {member.user.firstName} {member.user.lastName}
              </h4>
              <p className="text-muted mb-2">{member.user.email}</p>

              <div className="member-badges">
                <span
                  className={`badge text-white ${getRoleBadgeClass(
                    member.role
                  )} me-2`}
                >
                  {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                </span>
                {member.isAdmin && member.role !== "owner" && (
                  <span className="badge text-white bg-info">Admin</span>
                )}
              </div>

              <div className="member-status mt-2">
                <span
                  className={`status-text ${
                    member.user?.status === "active"
                      ? "text-success"
                      : "text-muted"
                  }`}
                >
                  {member.user?.status === "active"
                    ? "Currently Active"
                    : `Last seen ${moment(
                        member.user.statusUpdatedAt
                      ).fromNow()}`}
                </span>
              </div>
            </div>

            <hr className="my-4" />

            {isCurrentUserAdmin && (
              <>
                <h5 className="section-title">Edit Member Information</h5>

                <Form.Group className="mb-3">
                  <Form.Label>Nickname (optional)</Form.Label>
                  <Form.Control
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Enter nickname"
                    className="border-0 bg-light"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Role</Form.Label>
                  <Form.Select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    disabled={member.role === "owner" || !isCurrentUserAdmin}
                    className="border-0 bg-light"
                  >
                    <option value="member">Member</option>
                    <option value="moderator">Moderator</option>
                    {isCurrentUserAdmin && <option value="owner">Owner</option>}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Only team owners can change roles to owner
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Check
                    type="switch"
                    id="admin-toggle"
                    label="Grant admin privileges"
                    checked={isAdmin}
                    onChange={(e) => setIsAdmin(e.target.checked)}
                    disabled={member.role === "owner"}
                    className="admin-toggle"
                  />
                </Form.Group>
              </>
            )}
          </Form>
        )}
      </Modal.Body>
      <Modal.Footer className="border-0">
        {isCurrentUserAdmin && member?.role !== "owner" && (
          <Button
            variant="outline-danger"
            onClick={() => onRemoveMember(member.user._id)}
            className="me-auto"
          >
            <i className="fa-solid fa-user-minus me-1"></i> Remove
          </Button>
        )}
        <Button className="btn-secondary" onClick={onHide}>
          Close
        </Button>
        {isCurrentUserAdmin && (
          <Button className="btn-primary" onClick={handleSubmit}>
            <i className="fa-solid fa-save me-1"></i> Save Changes
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

const Dashboard = () => {
  // Kanban Pie Chart Data
  const kanbanData = {
    labels: ["Finished", "To do"],
    datasets: [
      {
        data: [2, 3],
        backgroundColor: ["#0B9C37", "#B74714"],
      },
    ],
  };

  // Bar Chart Data (Working Hours)
  const barData = {
    labels: ["Daniel", "Cassley", "Jury", "Romel"],
    datasets: [
      {
        label: "Hours Worked",
        data: [2, 6, 4, 7],
        backgroundColor: "black",
      },
    ],
  };

  const currentTeamId = useSelector((state) => state.team.currentTeamId);
  const authState = useSelector((state) => state.auth);

  const [members, setMembers] = useState([]);
  // Add this new state to track status notifications
  const [statusNotifications, setStatusNotifications] = useState({});
  
  // Keep track of if component is mounted
  const isMounted = useRef(true);

  const [showInvitePopup, setShowInvitePopup] = useState(false);
  const [teamCalendarEvents, setTeamCalendarEvents] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [eventId, setEventId] = useState(null);
  const [refresh, setRefresh] = useState(false);
  const [isCalendarFull, setIsCalendarFull] = useState(false);

  const [files, setFiles] = useState([]);
  const [showCreateFileModal, setShowCreateFileModal] = useState(false);
  const [ganttTasks, setGanttTasks] = useState([]);

  const token = useSelector((state) => state.auth.token);

  const [selectedMember, setSelectedMember] = useState(null);
  const [showMemberEditModal, setShowMemberEditModal] = useState(false);
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleShowCreateFileClose = () => {
    setShowCreateFileModal(false);
  };
  const handleShowCreateFileOpen = () => {
    setShowCreateFileModal(true);
  };

  const handleOpenInvitePopUp = () => {
    setShowInvitePopup(true);
  };
  const handleCloseInvitePopUp = () => {
    setShowInvitePopup(false);
  };
  const fetchTeamMembersData = async () => {
    try {
      if (currentTeamId === null) return;

      const token = getToken(authState);
      // Fetch team members
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      const { data } = await axios.get(
        `${import.meta.env.VITE_API}/getTeamMembers/${currentTeamId}`,
        config
      );

      setMembers(data.members);

      console.log("Team members:", data.members);
    } catch (error) {
      console.error("Error fetching team members:", error);
      errMsg("Error fetching team members", error);
    }
  };

  const fetchTeamCalendarEvents = async () => {
    try {
      if (currentTeamId === null) return;

      const token = getToken(authState);
      // Fetch team members
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      const { data } = await axios.get(
        `${import.meta.env.VITE_API}/getEventsByTeam/${currentTeamId}`,
        config
      );

      setTeamCalendarEvents(data);

      console.log("Calendar:", data);
    } catch (error) {
      console.error("Error fetching team calendar events:", error);
      errMsg("Error fetching team calendar events", error);
    }
  };

  // Create a debounced search function with 700ms delay
  const debouncedSearch = useCallback(
    debounce(async (term) => {
      try {
        if (currentTeamId === null) return;
        const result = await fetchTeamMembers(currentTeamId, authState, term);
        if (result) {
          setMembers(result);
        }
      } catch (error) {
        console.error("Error searching team members:", error);
        errMsg("Error searching team members");
      }
    }, 700),
    [currentTeamId, authState]
  );

  // Handle search input changes
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  };

  // Modify the existing fetchTeamMembers function to use our updated function
  const fetchAllTeamMembers = async () => {
    try {
      if (currentTeamId === null) return;
      const result = await fetchTeamMembers(currentTeamId, authState);
      if (result) {
        setMembers(result);
      }
    } catch (error) {
      console.error("Error fetching team members:", error);
      errMsg("Error fetching team members", error);
    }
  };

  useEffect(() => {
    if (currentTeamId !== null) {
      fetchAllTeamMembers();
      fetchTeamCalendarEvents();
    }
  }, [currentTeamId, refresh]);

  const toggleFullCalendar = () => {
    setIsCalendarFull((prev) => !prev);
  };

  const addNewFile = async (fileName, user, currentTeamId) => {
    try {
      if (currentTeamId === null) return;

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

      setFiles((prevFiles) =>
        [...prevFiles, res.data]
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 4)
      );
      succesMsg("File created successfully");
    } catch (error) {
      console.error("Error creating file:", error);
      errMsg("Error creating file", error);
    } finally {
      setShowCreateFileModal(false);
    }
  };

  const fetchFiles = async () => {
    try {
      if (currentTeamId === null) return;

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
      setFiles(
        res.data
          .filter((file) => !file.deleted)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 4)
      );
    } catch (error) {
      console.error("Error fetching files:", error);
      errMsg("Error fetching files", error);
    }
  };

  const fetchGanttTasks = async () => {
    try {
      if (currentTeamId === null) return;

      const config = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      };
      const res = await axios.get(
        `${import.meta.env.VITE_API}/getTasks/${currentTeamId}`,
        config
      );
      console.log("tasks", res.data);
      setGanttTasks(res.data.slice(0, 5));
    } catch (error) {
      console.error("Error fetching files:", error);
      errMsg("Error fetching files", error);
    }
  };
  useEffect(() => {
    fetchFiles();
    fetchGanttTasks();
  }, [currentTeamId]);

  const handleMemberClick = (member) => {
    setSelectedMember(member);
    setShowMemberEditModal(true);
  };

  const handleUpdateMember = async (memberData) => {
    try {
      const token = getToken(authState);
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      const response = await axios.put(
        `${import.meta.env.VITE_API}/updateTeamMember/${currentTeamId}/${
          memberData.userId
        }`,
        memberData,
        config
      );

      succesMsg("Member updated successfully");
      setShowMemberEditModal(false);
      fetchTeamMembersData(); // Refresh the member list
    } catch (error) {
      console.error("Error updating team member:", error);
      errMsg("Error updating team member", error);
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      if (
        window.confirm(
          "Are you sure you want to remove this member from the team?"
        )
      ) {
        const token = getToken(authState);
        const config = {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        };
        await axios.delete(
          `${
            import.meta.env.VITE_API
          }/removeTeamMember/${currentTeamId}/${userId}`,
          config
        );
        succesMsg("Member removed from team");
        setShowMemberEditModal(false);
        fetchTeamMembersData(); // Refresh the member list
      }
    } catch (error) {
      console.error("Error removing team member:", error);
      errMsg("Error removing team member", error);
    }
  };

  // Check if current user is a team admin
  useEffect(() => {
    if (members.length > 0 && authState.user) {
      const currentUserMember = members.find(
        (member) => member.user._id === authState.user._id
      );
      setIsCurrentUserAdmin(
        currentUserMember?.isAdmin || currentUserMember?.role === "owner"
      );
    }
  }, [members, authState.user]);

  // Create a utility function for logging status changes
const logStatusChange = (user, prevStatus, newStatus) => {
  console.log(
    `%c[STATUS CHANGE] ${user.firstName} ${user.lastName}: ${prevStatus || 'unknown'} → ${newStatus}`,
    `color: ${newStatus === 'active' ? 'green' : newStatus === 'inactive' ? 'orange' : 'gray'}`
  );
};

// Remove the debounce as it can cause delays in UI updates
const updateMemberStatus = useCallback((userId, status, statusUpdatedAt) => {
  if (!isMounted.current) return;
  
  setMembers(currentMembers => {
    // Check if we need to update anything
    const needsUpdate = currentMembers.some(member => 
      member.user._id === userId && member.user.status !== status
    );
    
    if (!needsUpdate) return currentMembers; // No changes needed
    
    // Update the status
    const updatedMembers = currentMembers.map(member => {
      if (member.user._id === userId) {
        const prevStatus = member.user.status;
        
        // Log the status change with detailed info
        logStatusChange(member.user, prevStatus, status);
        
        // Create a deep copy to ensure the component re-renders
        return {
          ...member,
          user: {
            ...member.user,
            status,
            statusUpdatedAt: statusUpdatedAt || new Date()
          }
        };
      }
      return member;
    });
    
    return updatedMembers;
  });
}, []);

// Setup socket listeners for team status updates with enhanced logging
const pendingStatusChanges = useRef({});
useEffect(() => {
  // Ensure socket is connected
  if (!socket.connected) {
    console.log("%c[SOCKET] Reconnecting socket in Dashboard...", "color: blue; font-weight: bold");
    socket.connect();
  }
  
  // Listen for user status changes
  const handleStatusChange = (data) => {
    try {
      console.log("[STATUS EVENT]", data); // Log the raw event data
      
      // Check if this user is in our team members
      const teamMember = members.find(m => m.user._id === data.userId);
      
      if (teamMember) {
        console.log(`[TEAM MEMBER] Found team member for status update: ${data.firstName} ${data.lastName}`);
        
        const userId = data.userId;
        const currentStatus = data.currentStatus;
        const previousStatus = data.previousStatus;
        
        // Function to be executed after the delay to apply the status change
        const applyStatusChange = () => {
          console.log(`[STATUS APPLYING] Applying delayed status change for ${data.firstName}: ${previousStatus} → ${currentStatus}`);
          updateMemberStatus(userId, currentStatus, data.statusUpdatedAt);
          
          // Force refresh for React to detect the change
          setRefresh(prev => !prev);
          
          // Clear from pending changes
          delete pendingStatusChanges.current[userId];
        };
        
        // Cancel any pending status change for this user
        if (pendingStatusChanges.current[userId]) {
          console.log(`[STATUS CANCEL] Cancelling pending status change for ${data.firstName}`);
          clearTimeout(pendingStatusChanges.current[userId].timeoutId);
          delete pendingStatusChanges.current[userId];
        }
        
        // Determine if this is likely a page reload sequence
        const isPossibleReload = 
          (previousStatus === 'active' && currentStatus === 'offline') || 
          (previousStatus === 'offline' && currentStatus === 'active');
          
        // Use a longer delay for possible reload sequences
        const delayTime = isPossibleReload ? 3000 : 500;
        
        console.log(`[STATUS DELAY] ${isPossibleReload ? 'Possible reload detected' : 'Normal status change'}, delaying by ${delayTime}ms`);
        
        // Schedule the status change with appropriate delay
        pendingStatusChanges.current[userId] = {
          timeoutId: setTimeout(applyStatusChange, delayTime),
          status: currentStatus
        };
        
        // Only show notification for significant stable changes
        const isSignificantChange = 
          (previousStatus === 'offline' && currentStatus === 'active') || 
          (previousStatus === 'active' && currentStatus === 'offline');
        
        // Only show notifications for significant changes after a delay to avoid reload flashes
        if (isSignificantChange) {
          // Wait a bit longer to show notifications to filter out temporary status changes
          setTimeout(() => {
            // Check if the status is still the same after the delay
            if (pendingStatusChanges.current[userId]?.status === currentStatus) {
              const statusText = currentStatus === "active" ? "online" : 
                              currentStatus === "inactive" ? "away" : "offline";
              
              console.log(`[NOTIFICATION] Showing notification for ${data.firstName} ${data.lastName} (${statusText})`);
              
              // Don't show duplicate notifications within 30 seconds
              const lastNotification = statusNotifications[userId];
              const now = new Date();
              
              if (!lastNotification || 
                  (now - new Date(lastNotification.time) > 5000) || 
                  lastNotification.status !== currentStatus) {
                
                // Use a more visible toast with higher z-index and prominent styling
                toast.info(
                  <div className="status-notification-content">
                    <div className="d-flex align-items-center gap-2">
                      <div className="member-avatar-container position-relative">
                        <img
                          src={data.avatar?.url ? data.avatar.url : "/images/account.png"}
                          alt={`${data.firstName} ${data.lastName}`}
                          className="rounded-circle"
                          width="30"
                          height="30"
                        />
                        <span className={`status-indicator-dot position-absolute ${currentStatus}`}></span>
                      </div>
                      <span className="fw-bold">{data.firstName} {data.lastName}</span>
                    </div>
                    <div className="mt-2">
                      <span className={`status-badge ${currentStatus}`}>
                        {statusText.toUpperCase()}
                      </span>
                    </div>
                  </div>,
                  {
                    position: "bottom-right",
                    autoClose: 1000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    closeButton: true,
                    className: `status-toast status-toast-${currentStatus}`,
                    style: { zIndex: 9999, minWidth: "300px" },
                    progressStyle: { 
                      background: currentStatus === "active" ? "#28a745" : 
                                  currentStatus === "inactive" ? "#ffc107" : "#6c757d" 
                    }
                  }
                );
                
                // Update notifications tracking
                setStatusNotifications(prev => ({
                  ...prev,
                  [userId]: {
                    status: currentStatus,
                    time: now
                  }
                }));
              }
            } else {
              console.log(`[NOTIFICATION SKIPPED] Status changed again for ${data.firstName}, skipping notification`);
            }
          }, 2500); // Slightly longer than the status change delay
        }
      }
    } catch (error) {
      console.error("[STATUS CHANGE ERROR]", error);
    }
  };
  
  console.log("%c[STATUS TRACKING] Setting up user status tracking...", "color: blue; font-weight: bold");
  socket.on("userStatusChanged", handleStatusChange);

  return () => {
    console.log("%c[STATUS TRACKING] Cleaning up status tracking...", "color: blue; font-weight: bold");
    isMounted.current = false;
    socket.off("userStatusChanged", handleStatusChange);
    
    // Clear any pending timeouts
    Object.values(pendingStatusChanges.current).forEach(item => {
      if (item.timeoutId) clearTimeout(item.timeoutId);
    });
  };
}, [members, updateMemberStatus]);

  return (
    <div className="team-content container">
      <FileShare />
      {/* Main Grid Layout */}
      <div className="kanban-team-members cards">
        {/* Kanban Board */}
        <div className="kanban-gantt-live-editing">
          <div className="kanban-gantt">
            <div className="card kanban-board">
              <div className="card-header fw-semibold">
                <span>Kanban Board</span>
                <Link
                  to={`/main/${currentTeamId}/kanban`}
                  className="gantt-link"
                >
                  <i className="fa-solid fa-right-from-bracket"></i>
                </Link>
              </div>
              <div className="card-body">
                <Pie data={kanbanData} />
              </div>
            </div>
            <div className="card chart-bg gantt-chart">
              <div className="card-header fw-semibold">
                <span>Gantt Chart</span>
                <Link
                  to={`/main/${currentTeamId}/gantt`}
                  className="gantt-link"
                >
                  <i className="fa-solid fa-right-from-bracket"></i>
                </Link>
              </div>
              <div className="card-body">
                <div className="title">Tasks</div>
                <div className="task-content">
                  {ganttTasks.length === 0 && (
                    <p className="text-center text-muted">No tasks</p>
                  )}
                  {ganttTasks.length > 0 &&
                    ganttTasks.map((task, index) => (
                      <div className="task" key={index}>
                        <div className="label">{task?.title}</div>
                        <div className="date">
                          <div className="start">
                            {moment(task?.startDate).format("MM/DD")}
                          </div>
                          <div>-</div>
                          <div className="end">
                            {moment(task?.endDate).format("MM/DD")}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
          <div className="live-editing-container">
            <div className="card live-editing">
              <div className="card-header fw-semibold">Live Editing</div>
              <div className="card-body">
                <div className="item add" onClick={handleShowCreateFileOpen}>
                  <i className="fa-solid fa-plus"></i>
                  <span>Add New File</span>
                </div>
                {files.length === 0 && (
                  <p className="text-center text-muted">No files</p>
                )}
                {files.length > 0 &&
                  files.map((file, index) => (
                    <Link
                      key={index}
                      className="item file"
                      to={`/main/${currentTeamId}/live-editing/${file._id}`}
                    >
                      <i className="fa-solid fa-file"></i>
                      <span>{file.fileName}</span>
                      <i className="fa-solid fa-chevron-right text-primary"></i>
                    </Link>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Team Members */}
        <div className="team-members">
          <div className="card chart-bg">
            <div className="card-header d-flex justify-content-between align-items-center">
              <span className="fw-semibold">Team Members</span>
              <span className="badge bg-primary text-white">
                {members && members.length}
              </span>
            </div>
            <div className="card-body">
              {/* Add search bar */}
              <div className="mb-3">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by name, email, role..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </div>

              {/* Team Member List */}
              {members && members.length > 0 ? (
                members.map((member, index) => (
                  <div
                    key={index}
                    className="d-flex justify-content-between align-items-center bg-light p-2 mb-2 rounded member-list-item"
                    onClick={() => handleMemberClick(member)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <div className="member-avatar-container">
                        <img
                          src={
                            member.user?.avatar?.url
                              ? member.user.avatar.url
                              : "/images/account.png"
                          }
                          alt={member?.user?.firstName}
                          className="rounded-circle"
                          width="35"
                        />
                        <span
                          className={`member-status-dot ${
                            member.user?.status === "active" 
                              ? "active" 
                              : member.user?.status === "inactive" 
                                ? "inactive" 
                                : "offline"
                          }`}
                        ></span>
                      </div>
                      <div className="px-2">
                        <p className="mb-0 fw-semibold name">
                          {member.user.firstName} {member.user.lastName}
                          {member.nickname && (
                            <span className="text-muted ms-1">
                              ({member.nickname})
                            </span>
                          )}
                        </p>
                        <p
                          className="mb-0 fw-semibold role d-flex align-items-center"
                          style={{ gap: "5px" }}
                        >
                          {member.isAdmin && member.role !== "owner" && (
                            <span className="badge w-auto bg-info ms-1">
                              Admin
                            </span>
                          )}
                          <span>
                            {member.role.charAt(0).toUpperCase() +
                              member.role.slice(1)}
                          </span>
                        </p>
                        <p
                          className={`status mb-0 text-sm ${
                            member.user?.status === "active"
                              ? "text-success"
                              : member.user?.status === "inactive"
                                ? "text-warning"
                                : "text-muted"
                          }`}
                        >
                          {member.user?.status === "active"
                            ? "Active now"
                            : member.user?.status === "inactive"
                              ? "Inactive" 
                              : `Last seen ${moment(
                                  member.user.statusUpdatedAt
                                ).fromNow()}`}
                        </p>
                      </div>
                    </div>
                    <div className="view-member-btn">
                      <i className="fa-solid fa-chevron-right text-primary"></i>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-3">
                  <p className="text-muted">No members found</p>
                </div>
              )}
            </div>
            <div className="card-footer text-center">
              <button
                className="btn btn-primary rounded-circle p-2 invite-member-btn"
                onClick={handleOpenInvitePopUp}
                style={{ width: "40px", height: "40px" }}
              >
                <FaPlus size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={`calendar-main ${isCalendarFull ? "full" : ""}`}>
        <div className="toggleFullCalendar" onClick={toggleFullCalendar}>
          <i
            className={`fa-solid ${
              isCalendarFull ? "fa-compress" : "fa-expand"
            }`}
          ></i>
        </div>
        <Calendar setRefresh={setRefresh} />
        <div
          className={`card shadow upcoming-events ${
            isCalendarFull ? "d-none" : ""
          }`}
        >
          <div className="card-header fw-semibold">
            <i className="fa-solid fa-bell"></i>
            <span>Upcoming Events</span>
          </div>
          <div className="card-body">
            {teamCalendarEvents.length > 0 ? (
              teamCalendarEvents.map((event, index) => {
                return (
                  <div
                    key={index}
                    className="accordion-item"
                    onClick={() => {
                      setIsExpanded(!isExpanded);
                      setEventId(event._id);
                    }}
                  >
                    <div className="accordion-header bg-light p-2 mb-2 rounded">
                      <p className="mb-0 fw-medium">
                        <i className="fa-solid fa-calendar-days mx-2"></i>
                        {new Date(event.startDate).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "numeric",
                          hour12: true,
                        })}{" "}
                        - {event.name}
                      </p>
                      {isExpanded && eventId === event._id && (
                        <div className="accordion-body p-2 bg-white rounded border mt-2">
                          {event.description && (
                            <p className="text-muted small mb-1">
                              <strong>Description:</strong> {event.description}
                            </p>
                          )}
                          {event.location && (
                            <p className="text-muted small mb-1">
                              📍 {event.location}
                            </p>
                          )}
                          <p className="text-muted small mb-1">
                            <strong>Start:</strong>{" "}
                            {new Date(event.startDate).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "numeric",
                              hour12: true,
                            })}
                          </p>
                          <p className="text-muted small mb-0">
                            <strong>End:</strong>{" "}
                            {new Date(event.endDate).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "numeric",
                              hour12: true,
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-white text-center">No upcoming events.</p>
            )}
          </div>
        </div>
      </div>

      <InviteMemberPopUp
        show={showInvitePopup}
        handleClose={handleCloseInvitePopUp}
        authState={authState}
        currentTeamId={currentTeamId}
      />
      <CreateNewFile
        show={showCreateFileModal}
        onHide={handleShowCreateFileClose}
        onCreateFile={addNewFile}
      />
      <EditMemberModal
        show={showMemberEditModal}
        onHide={() => setShowMemberEditModal(false)}
        member={selectedMember}
        isCurrentUserAdmin={isCurrentUserAdmin}
        onUpdateMember={handleUpdateMember}
        onRemoveMember={handleRemoveMember}
      />
    </div>
  );
};

export default Dashboard;
