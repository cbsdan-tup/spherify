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
import { FaPlus } from "react-icons/fa";
import axios from "axios";
import { useSelector } from "react-redux";
import { errMsg, succesMsg, getToken, socket } from "../../../utils/helper";
import { toast } from "react-toastify";
import FileShare from "../file-sharing/FileShare";
import InviteMemberPopUp from "../InviteMemberPopUp";
import Calendar from "../projectmanagement/Calendar";
import moment from "moment";
import { Link } from "react-router-dom";
import CreateNewFile from "../live-editing/CreateNewFile";
import { Modal, Button, Form } from "react-bootstrap";
import { fetchTeamMembers } from "../../../functions/TeamFunctions";
import debounce from "lodash/debounce";
import TeamHistory from "./TeamHistory";
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Register chart elements
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  ChartDataLabels
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
      case "leader":
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
              <div className="mx-auto mb-3 mt-3">
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
                {member.isAdmin && member.role !== "leader" && (
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
                    disabled={member.role === "leader" || !isCurrentUserAdmin}
                    className="border-0 bg-light"
                  >
                    <option value="member">Member</option>
                    <option value="moderator">Moderator</option>
                    {isCurrentUserAdmin && <option value="leader">Leader</option>}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Only team leaders can change roles to leader
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Check
                    type="switch"
                    id="admin-toggle"
                    label="Grant admin privileges"
                    checked={isAdmin}
                    onChange={(e) => setIsAdmin(e.target.checked)}
                    disabled={member.role === "leader"}
                    className="admin-toggle"
                  />
                </Form.Group>
              </>
            )}
          </Form>
        )}
      </Modal.Body>
      <Modal.Footer className="border-0">
        {isCurrentUserAdmin && member?.role !== "leader" && (
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
  // Update state for tab control to include distribution
  const [activeTab, setActiveTab] = useState('priorities');
  // Change default Gantt chart view to 'timeline' instead of 'all'
  const [activeGanttView, setActiveGanttView] = useState('timeline');
  
  // Add state for card completion data
  const [completionData, setCompletionData] = useState({
    completed: 0,
    inProgress: 0,
    noProgress: 0  // Add this new state
  });

  // Kanban Pie Chart Data
  const [priorityData, setPriorityData] = useState({
    low: 0,
    medium: 0,
    high: 0
  });

  // Replace the existing kanbanData with priority-based data
  const kanbanData = {
    labels: ['Low Priority', 'Medium Priority', 'High Priority'],
    datasets: [
      {
        data: [priorityData.low, priorityData.medium, priorityData.high],
        backgroundColor: ['#0B9C37', '#e3cc1a', '#B74714'], // Green, Yellow, Red
      },
    ],
  };

  // Add completion data chart configuration
  const completionChartData = {
    labels: ['Completed', 'In Progress', 'No Progress'],
    datasets: [{
      data: [completionData.completed, completionData.inProgress, completionData.noProgress],
      backgroundColor: ['#0d87d8', '#f2d600', '#B74714']  // Blue, Yellow, Red
    }]
  };

  // Add member assignment state
  const [assignmentData, setAssignmentData] = useState({
    assigned: 0,
    unassigned: 0
  });

  // Add new state for member task data
  const [memberTaskData, setMemberTaskData] = useState([]);

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
  const [showRequestHistory, setShowRequestHistory] = useState(false);

  // Add a refresh trigger for Gantt tasks
  const [ganttRefresh, setGanttRefresh] = useState(false);

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
      // Don't limit to only 5 tasks - display all tasks
      setGanttTasks(res.data);
    } catch (error) {
      console.error("Error fetching Gantt tasks:", error);
      errMsg("Error fetching Gantt tasks", error);
    }
  };

  // Add dependency on ganttRefresh to allow manual refresh
  useEffect(() => {
    fetchFiles();
    fetchGanttTasks();
  }, [currentTeamId, ganttRefresh]);

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
        currentUserMember?.isAdmin || currentUserMember?.role === "leader"
      );
    }
  }, [members, authState.user]);

  // Create a utility function for logging status changes
  const logStatusChange = (user, prevStatus, newStatus) => {
    console.log(
      `%c[STATUS CHANGE] ${user.firstName} ${user.lastName}: ${
        prevStatus || "unknown"
      } → ${newStatus}`,
      `color: ${
        newStatus === "active"
          ? "green"
          : newStatus === "inactive"
          ? "orange"
          : "gray"
      }`
    );
  };

  // Remove the debounce as it can cause delays in UI updates
  const updateMemberStatus = useCallback((userId, status, statusUpdatedAt) => {
    if (!isMounted.current) return;

    setMembers((currentMembers) => {
      // Check if we need to update anything
      const needsUpdate = currentMembers.some(
        (member) => member.user._id === userId && member.user.status !== status
      );

      if (!needsUpdate) return currentMembers; // No changes needed

      // Update the status
      const updatedMembers = currentMembers.map((member) => {
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
              statusUpdatedAt: statusUpdatedAt || new Date(),
            },
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
      console.log(
        "%c[SOCKET] Reconnecting socket in Dashboard...",
        "color: blue; font-weight: bold"
      );
      socket.connect();
    }

    // Listen for user status changes
    const handleStatusChange = (data) => {
      try {
        console.log("[STATUS EVENT]", data); // Log the raw event data

        // Check if this user is in our team members
        const teamMember = members.find((m) => m.user._id === data.userId);

        if (teamMember) {
          console.log(
            `[TEAM MEMBER] Found team member for status update: ${data.firstName} ${data.lastName}`
          );

          const userId = data.userId;
          const currentStatus = data.currentStatus;
          const previousStatus = data.previousStatus;

          // Function to be executed after the delay to apply the status change
          const applyStatusChange = () => {
            console.log(
              `[STATUS APPLYING] Applying delayed status change for ${data.firstName}: ${previousStatus} → ${currentStatus}`
            );
            updateMemberStatus(userId, currentStatus, data.statusUpdatedAt);

            // Force refresh for React to detect the change
            setRefresh((prev) => !prev);

            // Clear from pending changes
            delete pendingStatusChanges.current[userId];
          };

          // Cancel any pending status change for this user
          if (pendingStatusChanges.current[userId]) {
            console.log(
              `[STATUS CANCEL] Cancelling pending status change for ${data.firstName}`
            );
            clearTimeout(pendingStatusChanges.current[userId].timeoutId);
            delete pendingStatusChanges.current[userId];
          }

          // Determine if this is likely a page reload sequence
          const isPossibleReload =
            (previousStatus === "active" && currentStatus === "offline") ||
            (previousStatus === "offline" && currentStatus === "active");

          // Use a longer delay for possible reload sequences
          const delayTime = isPossibleReload ? 3000 : 500;

          console.log(
            `[STATUS DELAY] ${
              isPossibleReload
                ? "Possible reload detected"
                : "Normal status change"
            }, delaying by ${delayTime}ms`
          );

          // Schedule the status change with appropriate delay
          pendingStatusChanges.current[userId] = {
            timeoutId: setTimeout(applyStatusChange, delayTime),
            status: currentStatus,
          };

          // Only show notification for significant stable changes
          const isSignificantChange =
            (previousStatus === "offline" && currentStatus === "active") ||
            (previousStatus === "active" && currentStatus === "offline");

          // Only show notifications for significant changes after a delay to avoid reload flashes
          if (isSignificantChange) {
            // Wait a bit longer to show notifications to filter out temporary status changes
            setTimeout(() => {
              // Check if the status is still the same after the delay
              if (
                pendingStatusChanges.current[userId]?.status === currentStatus
              ) {
                const statusText =
                  currentStatus === "active"
                    ? "online"
                    : currentStatus === "inactive"
                    ? "away"
                    : "offline";

                console.log(
                  `[NOTIFICATION] Showing notification for ${data.firstName} ${data.lastName} (${statusText})`
                );

                // Don't show duplicate notifications within 30 seconds
                const lastNotification = statusNotifications[userId];
                const now = new Date();

                if (
                  !lastNotification ||
                  now - new Date(lastNotification.time) > 5000 ||
                  lastNotification.status !== currentStatus
                ) {
                  // Use a more visible toast with higher z-index and prominent styling
                  toast.info(
                    <div className="status-notification-content">
                      <div className="d-flex align-items-center gap-2">
                        <div className="member-avatar-container position-relative">
                          <img
                            src={
                              data.avatar?.url
                                ? data.avatar.url
                                : "/images/account.png"
                            }
                            alt={`${data.firstName} ${data.lastName}`}
                            className="rounded-circle"
                            width="30"
                            height="30"
                          />
                          <span
                            className={`status-indicator-dot position-absolute ${currentStatus}`}
                          ></span>
                        </div>
                        <span className="fw-bold">
                          {data.firstName} {data.lastName}
                        </span>
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
                        background:
                          currentStatus === "active"
                            ? "#28a745"
                            : currentStatus === "inactive"
                            ? "#ffc107"
                            : "#6c757d",
                      },
                    }
                  );

                  // Update notifications tracking
                  setStatusNotifications((prev) => ({
                    ...prev,
                    [userId]: {
                      status: currentStatus,
                      time: now,
                    },
                  }));
                }
              } else {
                console.log(
                  `[NOTIFICATION SKIPPED] Status changed again for ${data.firstName}, skipping notification`
                );
              }
            }, 2500); // Slightly longer than the status change delay
          }
        }
      } catch (error) {
        console.error("[STATUS CHANGE ERROR]", error);
      }
    };

    console.log(
      "%c[STATUS TRACKING] Setting up user status tracking...",
      "color: blue; font-weight: bold"
    );
    socket.on("userStatusChanged", handleStatusChange);

    return () => {
      console.log(
        "%c[STATUS TRACKING] Cleaning up status tracking...",
        "color: blue; font-weight: bold"
      );
      isMounted.current = false;
      socket.off("userStatusChanged", handleStatusChange);

      // Clear any pending timeouts
      Object.values(pendingStatusChanges.current).forEach((item) => {
        if (item.timeoutId) clearTimeout(item.timeoutId);
      });
    };
  }, [members, updateMemberStatus]);

  const fetchKanbanPriorityData = async () => {
    try {
      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken(authState)}`,
        },
      };

      // Fetch all lists for the team
      const listsResponse = await axios.get(
        `${import.meta.env.VITE_API}/getLists/${currentTeamId}`,
        config
      );

      // Fetch cards for each list
      const promises = listsResponse.data.map(list => 
        axios.get(`${import.meta.env.VITE_API}/getCards/${currentTeamId}/${list._id}`, config)
      );

      const cardsResponses = await Promise.all(promises);
      
      // Count priorities and completion status
      const priorityCounts = { low: 0, medium: 0, high: 0 };
      const completionCounts = { completed: 0, inProgress: 0, noProgress: 0 };
      const assignmentCounts = { assigned: 0, unassigned: 0 };

      // Track tasks per member
      const memberTaskCounts = {};

      cardsResponses.forEach(response => {
        response.data.forEach(card => {
          priorityCounts[card.priority]++;
          
          // Calculate completion based on checklist
          if (card.checklist && card.checklist.length > 0) {
            const completed = card.checklist.every(item => item.isCompleted);
            const hasProgress = card.checklist.some(item => item.isCompleted);
            
            if (completed) {
              completionCounts.completed++;
            } else if (hasProgress) {
              completionCounts.inProgress++;
            } else {
              completionCounts.noProgress++;
            }
          } else {
            completionCounts.noProgress++;  // If no checklist, count as no progress
          }

          // Handle assignments
          if (card.assignedTo && card.assignedTo.length > 0) {
            assignmentCounts.assigned++;

            // Count tasks for each member
            card.assignedTo.forEach(member => {
              const memberId = member._id;
              if (!memberTaskCounts[memberId]) {
                memberTaskCounts[memberId] = {
                  name: `${member.firstName} ${member.lastName}`,
                  avatar: member.avatar?.url || '/images/account.png',
                  total: 0,
                  completed: 0,
                  inProgress: 0,
                  notStarted: 0
                };
              }

              memberTaskCounts[memberId].total++;

              // Calculate completion status
              if (card.checklist && card.checklist.length > 0) {
                const completed = card.checklist.every(item => item.isCompleted);
                const hasProgress = card.checklist.some(item => item.isCompleted);
                
                if (completed) {
                  memberTaskCounts[memberId].completed++;
                } else if (hasProgress) {
                  memberTaskCounts[memberId].inProgress++;
                } else {
                  memberTaskCounts[memberId].notStarted++;
                }
              } else {
                memberTaskCounts[memberId].notStarted++;
              }
            });
          } else {
            assignmentCounts.unassigned++;
          }
        });
      });

      // Convert memberTaskCounts object to array and sort by total tasks
      const memberTaskStats = Object.values(memberTaskCounts)
      .sort((a, b) => b.total - a.total);
      console.log("Members: ",memberTaskStats )
      
      setMemberTaskData(memberTaskStats);

      setPriorityData(priorityCounts);
      setCompletionData(completionCounts);
      setAssignmentData(assignmentCounts);
    } catch (error) {
      console.error("Error fetching kanban data:", error);
      errMsg("Error fetching kanban data");
    }
  };

  useEffect(() => {
    if (currentTeamId) {
      fetchKanbanPriorityData();
      // ...existing fetch calls...
    }
  }, [currentTeamId]);

  const handleShowRequestHistory = () => {
    setShowRequestHistory(true);
  };

  // Function to render mini Gantt timeline
  const renderMiniGanttTimeline = () => {
    if (!ganttTasks || ganttTasks.length === 0) {
      return <p className="text-center text-muted">No tasks</p>;
    }
    
    // Use current year's full range instead of task-based range
    const now = new Date();
    const currentYear = now.getFullYear();
    const yearStart = new Date(currentYear, 0, 1); // January 1st of current year
    const yearEnd = new Date(currentYear, 11, 31); // December 31st of current year
    
    // Function to calculate position percentage based on the full year
    const getPositionPercentage = (date) => {
      const totalYearMs = yearEnd - yearStart;
      const positionMs = date - yearStart;
      return Math.max(0, Math.min(100, (positionMs / totalYearMs) * 100));
    };
    
    return (
      <div className="mini-gantt-container">
        {/* Timeline header with today marker */}
        <div className="mini-gantt-header">
          <div className="mini-gantt-today" 
               style={{ left: `calc(80px + (100% - 80px) * ${getPositionPercentage(now) / 100})` }}
               title={now.toLocaleDateString()}>
            <div className="today-marker"></div>
            <span>Today</span>
          </div>
        </div>
        
        {/* Grid container that properly accounts for label width */}
        <div className="mini-gantt-grid-container">
          {/* Fixed-width area for task labels */}
          <div className="mini-gantt-label-column"></div>
          
          {/* Month grid lines in the timeline area */}
          <div className="mini-gantt-grid">
            {Array.from({ length: 12 }, (_, i) => {
              const month = new Date(currentYear, i, 1);
              const position = getPositionPercentage(month);
              return (
                <div key={i} className="mini-gantt-grid-line" style={{ left: `${position}%` }}>
                  {i % 2 === 0 && (
                    <div className="month-label">{month.toLocaleDateString(undefined, { month: 'short' })}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Task rows - all tasks are displayed in timeline view */}
        <div className="mini-gantt-tasks">
          {ganttTasks.map((task, index) => {
            const startDate = new Date(task.startDate);
            const endDate = new Date(task.endDate);
            
            // Clamp dates to current year range for visualization
            const clampedStart = new Date(Math.max(yearStart, startDate));
            const clampedEnd = new Date(Math.min(yearEnd, endDate));
            
            const startPos = getPositionPercentage(clampedStart);
            const endPos = getPositionPercentage(clampedEnd);
            const width = Math.max(0.5, endPos - startPos); // Ensure minimum width for visibility
            
            const isPartiallyOutOfRange = startDate < yearStart || endDate > yearEnd;
            
            return (
              <div className="mini-gantt-task-row" key={index}>
                <div className="mini-gantt-task-label">{task.title}</div>
                <div className="mini-gantt-timeline">
                  <div 
                    className={`mini-gantt-bar ${isPartiallyOutOfRange ? 'partial' : ''}`}
                    style={{
                      left: `${startPos}%`,
                      width: `${width}%`,
                      backgroundColor: task.color || '#007bff'
                    }}
                    title={`${task.title}: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}${
                      isPartiallyOutOfRange ? ' (extends outside current year)' : ''
                    }`}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Add CSS styles directly in your component
  useEffect(() => {
    // Add styles for the mini Gantt chart
    const style = document.createElement('style');
    style.textContent = `
      .mini-gantt-container {
        width: 100%;
        padding: 10px 0;
        position: relative;
      }
      .mini-gantt-header {
        height: 20px;
        position: relative;
        margin-bottom: 15px;
        border-bottom: 1px solid #eee;
      }
      .mini-gantt-today {
        position: absolute;
        transform: translateX(-50%);
        text-align: center;
        z-index: 5;
        top: -20px; /* Move the today marker higher up */
      }
      .today-marker {
        height: 15px; /* Increase the height for better visibility */
        width: 2px;
        background-color: #dc3545;
        margin: 0 auto;
      }
      .mini-gantt-start {
        position: absolute;
        left: 0;
        font-size: 0.7rem;
        color: #666;
      }
      .mini-gantt-end {
        position: absolute;
        right: 0;
        font-size: 0.7rem;
        color: #666;
      }
      .mini-gantt-grid-container {
        display: flex;
        position: relative;
        height: 20px;
        margin-bottom: 10px;
      }
      .mini-gantt-label-column {
        width: 80px;
        flex-shrink: 0;
      }
      .mini-gantt-grid {
        flex: 1;
        position: relative;
        height: 100%;
      }
      .mini-gantt-grid-line {
        position: absolute;
        height: 100%;
        width: 1px;
        background-color: rgba(0,0,0,0.1);
        top: 0;
        bottom: 0;
        z-index: 1;
      }
      .month-label {
        position: absolute;
        top: -15px;
        transform: translateX(-50%);
        font-size: 0.65rem;
        color: #888;
        white-space: nowrap;
      }
      .mini-gantt-tasks {
        display: flex;
        flex-direction: column;
        gap: 8px;
        position: relative;
        max-height: 200px; /* Set a fixed height for the container */
        overflow-y: auto; /* Enable vertical scrolling */
        padding-right: 8px; /* Add some padding for the scrollbar */
      }
      /* Custom scrollbar styling */
      .mini-gantt-tasks::-webkit-scrollbar {
        width: 6px;
      }
      .mini-gantt-tasks::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 4px;
      }
      .mini-gantt-tasks::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 4px;
      }
      .mini-gantt-tasks::-webkit-scrollbar-thumb:hover {
        background: #a1a1a1;
      }
      .mini-gantt-task-row {
        display: flex;
        height: 25px;
        align-items: center;
        position: relative;
        z-index: 2;
      }
      .mini-gantt-task-label {
        width: 80px;
        flex-shrink: 0;
        font-size: 0.8rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        padding-right: 5px;
      }
      .mini-gantt-timeline {
        flex: 1;
        height: 15px;
        position: relative;
        background-color: #f5f5f5;
        border-radius: 4px;
      }
      .mini-gantt-bar {
        position: absolute;
        height: 100%;
        border-radius: 4px;
        transition: all 0.2s;
        z-index: 3;
      }
      .mini-gantt-bar.partial::before,
      .mini-gantt-bar.partial::after {
        content: "";
        position: absolute;
        top: 0;
        height: 100%;
        width: 3px;
        background: repeating-linear-gradient(
          45deg,
          transparent,
          transparent 2px,
          rgba(0,0,0,0.2) 2px,
          rgba(0,0,0,0.2) 4px
        );
        z-index: 4;
      }
      .mini-gantt-bar.partial::before {
        left: 0;
      }
      .mini-gantt-bar.partial::after {
        right: 0;
      }
      .mini-gantt-bar:hover {
        transform: scaleY(1.2);
        z-index: 5;
      }
      /* Add scrolling to the list view */
      .gantt-list-view {
        max-height: 200px;
        overflow-y: auto;
        padding-right: 8px; /* Add padding for scrollbar */
      }

      /* Custom scrollbar styling for list view */
      .gantt-list-view::-webkit-scrollbar {
        width: 6px;
      }
      .gantt-list-view::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 4px;
      }
      .gantt-list-view::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 4px;
      }
      .gantt-list-view::-webkit-scrollbar-thumb:hover {
        background: #a1a1a1;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="team-content container">
      <FileShare />
      {/* Main Grid Layout */}
      <div className="kanban-team-members cards">
        {/* Kanban Board */}
        <div className="kanban-gantt-live-editing">
          <div className="kanban-gantt">
            <div className="card chart-bg kanban-board" style={{position: "relative"}}>
              <div className="card-header">
                <div className="d-flex justify-content-between align-items-center justify-content-between w-100">
                  <div className="dropdown" style={{position: "absolute", left: "10px", top:"13px"}}>
                    <button 
                      className="text-white dropdown-toggle kanban-chart-dropdown" 
                      type="button" 
                      id="chartViewDropdown" 
                      data-toggle="dropdown" 
                      aria-expanded="false"
                    >
                      {activeTab === 'priorities' ? 'Task Priorities' : 
                       activeTab === 'completion' ? 'Task Completion' : 'Member Tasks'}
                    </button>
                    <ul className="dropdown-menu" aria-labelledby="chartViewDropdown">
                      <li>
                        <button 
                          className={`dropdown-item ${activeTab === 'priorities' ? 'active' : ''}`} 
                          onClick={() => setActiveTab('priorities')}
                        >
                          Task Priorities
                        </button>
                      </li>
                      <li>
                        <button 
                          className={`dropdown-item ${activeTab === 'completion' ? 'active' : ''}`}
                          onClick={() => setActiveTab('completion')}
                        >
                          Task Completion
                        </button>
                      </li>
                      <li>
                        <button 
                          className={`dropdown-item ${activeTab === 'distribution' ? 'active' : ''}`}
                          onClick={() => setActiveTab('distribution')}
                        >
                          Member Tasks
                        </button>
                      </li>
                    </ul>
                  </div>
                  <Link
                    to={`/main/${currentTeamId}/kanban`}
                    className="gantt-link"
                    style={{paddingBottom: "15px", paddingTop: "5px", marginLeft: "auto"}}
                  >
                    <i className="fa-solid fa-right-from-bracket" style={{fontSize: "1rem"}}></i>
                  </Link>
                </div>
              </div>
              <div className="card-body" style={{alignItems: "unset"}}>
                {activeTab === 'priorities' ? (
                  Object.values(priorityData).every(count => count === 0) ? (
                    <p className="text-center text-muted">No tasks available</p>
                  ) : (
                    <div className="d-flex justify-content-center align-items-center" style={{ height: '300px' }}>
                      <Pie 
                        data={kanbanData}
                        options={{
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { 
                              position: 'bottom',
                              labels: {
                                padding: 20,
                                font: {
                                  size: 12
                                }
                              }
                            },
                            tooltip: {
                              callbacks: {
                                label: (context) => {
                                  const total = Object.values(priorityData).reduce((a, b) => a + b, 0);
                                  const percentage = ((context.raw / total) * 100).toFixed(1);
                                  return `${context.label}: ${context.raw} (${percentage}%)`;
                                }
                              }
                            },
                            datalabels: {
                              formatter: (value, ctx) => {
                                const total = Object.values(priorityData).reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                const label = ctx.chart.data.labels[ctx.dataIndex];
                                return `${label}: ${percentage}%`;
                              },
                              color: '#fff',
                              font: {
                                weight: 'bold',
                                size: 11
                              },
                              padding: 4,
                              textAlign: 'center',
                              anchor: 'end',       // Position at the outer edge of slice
                              align: 'outer',      // Align the text outward from the center
                              offset: 8,           // Distance from anchor point
                              backgroundColor: function(context) {
                                return context.dataset.backgroundColor[context.dataIndex];
                              },
                              borderRadius: 4,
                              display: function(context) {
                                const value = context.dataset.data[context.dataIndex];
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = value / total * 100;
                                // Only show labels for segments that are large enough
                                return percentage > 5;
                              }
                            }
                          }
                        }}
                      />
                    </div>
                  )
                ) : activeTab === 'completion' ? (
                  <div className="d-flex justify-content-center align-items-center" style={{ height: '300px' }}>
                    <Pie 
                      data={completionChartData}
                      options={{
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { 
                            position: 'bottom',
                            labels: {
                              padding: 20,
                              font: {
                                size: 12
                              }
                            }
                          },
                          tooltip: {
                            callbacks: {
                              label: (context) => {
                                const total = Object.values(completionData).reduce((a, b) => a + b, 0);
                                const percentage = ((context.raw / total) * 100).toFixed(1);
                                let status = context.label === 'Completed' ? 'Finished' : 
                                            context.label === 'In Progress' ? 'Ongoing' : 'Not Started';
                                return `${status}: ${context.raw} (${percentage}%)`;
                              }
                            }
                          },
                          datalabels: {
                            formatter: (value, ctx) => {
                              const total = Object.values(completionData).reduce((a, b) => a + b, 0);
                              const percentage = ((value / total) * 100).toFixed(1);
                              const label = ctx.chart.data.labels[ctx.dataIndex];
                              return `${label}: ${percentage}%`;
                            },
                            color: '#fff',
                            font: {
                              weight: 'bold',
                              size: 11
                            },
                            padding: 4,
                            textAlign: 'center',
                            anchor: 'end',        // Position at the outer edge of slice
                            align: 'outer',       // Align the text outward from the center
                            offset: 8,            // Distance from anchor point
                            backgroundColor: function(context) {
                              return context.dataset.backgroundColor[context.dataIndex];
                            },
                            borderRadius: 4,
                            display: function(context) {
                              const value = context.dataset.data[context.dataIndex];
                              const total = context.dataset.data.reduce((a, b) => a + b, 0);
                              const percentage = value / total * 100;
                              // Only show labels for segments that are large enough
                              return percentage > 5;
                            }
                          }
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="member-distribution" style={{flex: 1}}>
                    <div className="member-stats-list">
                      {memberTaskData.map((member, index) => (
                        <div key={index} className="member-stat-card mb-2 p-2 bg-light rounded d-flex align-items-center" style={{gap: "10px"}} >
                          <div className="avatar">
                            <img src={member.avatar} alt={member.name} className="rounded-circle" width="30" />
                          </div>
                          <div className="d-flex flex-column" style={{alignItems: "unset", gap:"5px", flex: 1, width: "100%"}}>
                            <span className="fw-bold">{member.name}</span>
                            <div className="d-flex" style={{gap: "5px"}}>
                              <span className="badge bg-primary text-white">{member.total} tasks</span>
                              <span className="badge bg-success text-white">{member.completed} completed</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="card chart-bg gantt-chart">
              <div className="card-header fw-semibold">
                <div className="d-flex justify-content-between align-items-center w-100">
                  <div className="dropdown" style={{position: "relative"}}>
                    <button 
                      className="text-white dropdown-toggle kanban-chart-dropdown" 
                      type="button" 
                      id="ganttViewDropdown" 
                      data-toggle="dropdown" 
                      aria-expanded="false"
                    >
                      {activeGanttView === 'all' ? 'All Tasks' : 
                       activeGanttView === 'timeline' ? 'Timeline View' : 
                       activeGanttView === 'upcoming' ? 'Upcoming Tasks' : 'All Tasks'}
                    </button>
                    <ul className="dropdown-menu" aria-labelledby="ganttViewDropdown">
                      <li>
                        <button 
                          className={`dropdown-item ${activeGanttView === 'all' ? 'active' : ''}`} 
                          onClick={() => setActiveGanttView('all')}
                        >
                          All Tasks
                        </button>
                      </li>
                      <li>
                        <button 
                          className={`dropdown-item ${activeGanttView === 'upcoming' ? 'active' : ''}`}
                          onClick={() => setActiveGanttView('upcoming')}
                        >
                          Upcoming Tasks
                        </button>
                      </li>
                      <li>
                        <button 
                          className={`dropdown-item ${activeGanttView === 'timeline' ? 'active' : ''}`}
                          onClick={() => setActiveGanttView('timeline')}
                        >
                          Timeline View
                        </button>
                      </li>
                    </ul>
                  </div>
                  <div className="d-flex align-items-center">
                    <Link
                      to={`/main/${currentTeamId}/gantt`}
                      className="gantt-link"
                    >
                      <i className="fa-solid fa-right-from-bracket"></i>
                    </Link>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="title">Tasks</div>
                <div className="task-content">
                  {ganttTasks.length === 0 && (
                    <p className="text-center text-muted">No tasks</p>
                  )}
                  
                  {activeGanttView === 'timeline' ? (
                    renderMiniGanttTimeline()
                  ) : (
                    <div className="gantt-list-view">
                      {ganttTasks.length > 0 &&
                        ganttTasks
                          .filter(task => {
                            const now = new Date();
                            const taskStart = new Date(task.startDate);
                            const taskEnd = new Date(task.endDate);
                            
                            if (activeGanttView === 'all') return true;
                            if (activeGanttView === 'upcoming') {
                              // Show upcoming and ongoing tasks
                              return taskEnd >= now;
                            }
                            return true;
                          })
                          .map((task, index) => (
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
                          ))
                      }
                    </div>
                  )}
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
              <div style={{display: "flex", gap: "0.5rem", alignItems: "center"}}>
                <span className="badge bg-primary text-white">
                  {members && members.length}
                </span>
                <span 
                  className="team-request-history-dashboard"
                  onClick={handleShowRequestHistory}
                  style={{ cursor: "pointer", marginLeft: "10px" }}
                >
                  <i className="fas fa-history"></i>
                </span>
              </div>
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
                // Sort members by status: active first, then inactive, then offline
                [...members]
                  .sort((a, b) => {
                    // Create priority mapping for statuses
                    const statusPriority = {
                      active: 1,
                      inactive: 2,
                      offline: 3,
                    };

                    // Get the priority values (defaulting to lowest priority if undefined)
                    const priorityA = statusPriority[a.user?.status] || 3;
                    const priorityB = statusPriority[b.user?.status] || 3;

                    // Sort by priority
                    return priorityA - priorityB;
                  })
                  .map((member, index) => (
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
                            {(member.isAdmin || member.role === "leader") && (
                              <span className="badge w-auto bg-info ms-1 d-flex align-items-center justify-content-center" style={{fontSize: "0.8rem"}}>
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
                        <i className="fa-solid fa-chevron-right" style={{color: "#1d559e", marginRight: "1rem"}}></i>
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
                      <div className="mb-0 fw-medium d-flex align-items-center" style={{gap: "5px", cursor: "pointer"}}>
                        <i className="fa-solid fa-calendar-days mx-2"></i>
                        <div
                          className="d-flex align-start flex-column"
                          style={{ gadiv: "5px" }}
                        >
                        <span style={{fontWeight: "600"}}>
                          {new Date(event.startDate).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "numeric",
                            hour12: true,
                          })}{" "}
                        </span>
                        <span>{event.name}</span>
                        </div>
                      </div>
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

      <TeamHistory 
        show={showRequestHistory}
        onHide={() => setShowRequestHistory(false)}
        teamId={currentTeamId}
        isCurrentUserAdmin={isCurrentUserAdmin}
      />
      
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
