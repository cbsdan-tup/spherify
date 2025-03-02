import React, { useEffect, useState } from "react";
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
import { errMsg, succesMsg, getToken } from "../../../utils/helper";
import FileShare from "../file-sharing/FileShare";
import InviteMemberPopUp from "../InviteMemberPopUp";
import Calendar from "../projectmanagement/Calendar";
import moment from "moment";
import { Link } from "react-router";
import CreateNewFile from "../live-editing/CreateNewFile";

// Register chart elements
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

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
  const fetchTeamMembers = async () => {
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

  useEffect(() => {
    if (currentTeamId !== null) {
      fetchTeamMembers();
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
                {
                  files.length === 0 && (
                    <p className="text-center text-muted">No files</p>
                  )
                }
                {files.length > 0 && files.map((file, index) => (
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
              <span className="badge bg-primary text-white">
                {members && members.length}
              </span>
            </div>
            <div className="card-body">
              {/* Team Member List */}
              {members &&
                members.map((member, index) => (
                  <div
                    key={index}
                    className="d-flex justify-content-between align-items-center bg-light p-2 mb-2 rounded"
                  >
                    <div className="d-flex align-items-center gap-2">
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
                      <div className="px-2">
                        <p className="mb-0 fw-semibold name">
                          {member.user.firstName} {member.user.lastName}
                        </p>
                        <p className="mb-0 fw-semibold role">
                          {member.role.charAt(0).toUpperCase() +
                            member.role.slice(1)}
                        </p>
                        <p
                          className={`status mb-0 text-sm ${
                            member.user?.status &&
                            member.user.status === "active"
                              ? "text-success"
                              : "text-muted"
                          }`}
                        >
                          {member.user?.status &&
                          member.user.status === "active"
                            ? "Active"
                            : `Last seen ${moment(
                                member.user.statusUpdatedAt
                              ).fromNow()}`}
                        </p>
                      </div>
                    </div>
                    <FaPencilAlt className="text-muted" />
                  </div>
                ))}
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
                  <div key={index} className="accordion-item">
                    <div
                      className="accordion-header bg-light p-2 mb-2 rounded"
                      onClick={() => {
                        setIsExpanded(!isExpanded);
                        setEventId(event._id);
                      }}
                      style={{ cursor: "pointer" }}
                    >
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
    </div>
  );
};

export default Dashboard;
