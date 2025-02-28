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
import { errMsg, getToken } from "../../../utils/helper";
import FileShare from "../file-sharing/FileShare";
import InviteMemberPopUp from "../InviteMemberPopUp";
import Calendar from "../projectmanagement/Calendar";

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

  const handleOpenInvitePopUp = () => {
    setShowInvitePopup(true);
  };
  const handleCloseInvitePopUp = () => {
    setShowInvitePopup(false);
  };
  const fetchTeamMembers = async () => {
    try {
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

  return (
    <div className="team-content container">
      <h1 className="fw-bold">Data Analytics & Dashboard</h1>
      <hr />
      <FileShare />
      {/* Main Grid Layout */}
      <div className="kanban-team-members cards">
        {/* Kanban Board */}
        <div className="card">
          <div className="card shadow chart-bg kanban-board">
            <div className="card-header fw-semibold">
              Kanban Board
            </div>
            <div className="card-body">
              <Pie data={kanbanData} />
            </div>
          </div>
        </div>


        {/* Team Members */}
        <div className="team-members card">
          <div className="card shadow chart-bg">
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
                        <p className="mb-0 fw-semibold">
                          {member.user.firstName} {member.user.lastName}
                        </p>
                        <p
                          className={`mb-0 text-sm ${
                            member.active ? "text-success" : "text-muted"
                          }`}
                        >
                          {member.status ? member.status : "Active"}
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
                style={{width: "40px", height: "40px"}}
              >
                <FaPlus size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow mt-4 chart-bg">
        <div className="card-header fw-semibold">
          Project Calendar
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
                      {new Date(event.startDate).toLocaleString()} -{" "}
                      {event.name}
                    </p>
                    {isExpanded && eventId === event._id && (
                      <div
                        className="accordion-body p-2 bg-white rounded border mt-2"
                        
                      >
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
                          {new Date(event.startDate).toLocaleString()}
                        </p>
                        <p className="text-muted small mb-0">
                          <strong>End:</strong>{" "}
                          {new Date(event.endDate).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-muted text-center">No upcoming events.</p>
          )}
        </div>
      </div>
      <div className="calendar-main">
        <Calendar setRefresh={setRefresh}/>
      </div>

      <InviteMemberPopUp
        show={showInvitePopup}
        handleClose={handleCloseInvitePopUp}
        authState={authState}
        currentTeamId={currentTeamId}
      />
    </div>
  );
};

export default Dashboard;
