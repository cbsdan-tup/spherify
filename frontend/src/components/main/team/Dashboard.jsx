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
        backgroundColor: ["red", "green"],
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

  const fetchTeamMembers = async () => {
    try {
      const token = getToken(authState); 
      // Fetch team members
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      }
      const {data} = await axios.get(`${import.meta.env.VITE_API}/getTeamMembers/${currentTeamId}`, config);
  
      setMembers(data.members);

      console.log("Team members:", data.members);
    } catch (error) {
      console.error("Error fetching team members:", error);
      errMsg("Error fetching team members", error);
    }

  }
  useEffect(() => {
    if (currentTeamId !== null) {
      fetchTeamMembers();
    }
  }, [currentTeamId]);

  return (
    <div className="team-content container">
      <FileShare />
      <h1 className="fw-bold text-primary">Data Analytics & Dashboard</h1>
      <hr />
      {/* Main Grid Layout */}
      <div className="row g-4 mt-4">
        {/* Kanban Board */}
        <div className="col-md-4">
          <div className="card shadow chart-bg">
            <div className="card-header text-primary fw-semibold">
              Kanban Board
            </div>
            <div className="card-body">
              <Pie data={kanbanData} />
            </div>
          </div>
        </div>

        {/* Working Hours */}
        <div className="col-md-4">
          <div className="card shadow position-relative chart-bg">
            <div className="card-header fw-semibold text-primary">Working Hours</div>
            <div className="card-body">
              <Bar data={barData} />
              <div className="dropdown position-absolute top-0 end-0 m-2">
                <button
                  className="btn btn-sm btn-secondary dropdown-toggle"
                  data-bs-toggle="dropdown"
                >
                  Today
                </button>
                <ul className="dropdown-menu">
                  <li>
                    <a className="dropdown-item" href="#">
                      Last Week
                    </a>
                  </li>
                  <li>
                    <a className="dropdown-item" href="#">
                      Last Month
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Team Members */}
        <div className="col-md-4">
          <div className="card shadow chart-bg">
            <div className="card-header d-flex justify-content-between align-items-center">
              <span className="fw-semibold text-primary">Team Members</span>
              <span className="badge bg-primary text-white">{members && members.length}</span>
            </div>
            <div className="card-body">
              {/* Team Member List */}
              {members && members.map((member, index) => (
                <div
                  key={index}
                  className="d-flex justify-content-between align-items-center bg-light p-2 mb-2 rounded"
                >
                  <div className="d-flex align-items-center gap-2">
                    <img
                      src={member.user?.avatar?.url ? member.user.avatar.url : "/images/account.png"}
                      alt={member?.user?.firstName}
                      className="rounded-circle"
                      width="35"
                    />
                    <div className="px-2">
                      <p className="mb-0 fw-semibold">{member.user.firstName} {member.user.lastName}</p>
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
              <button className="btn btn-primary rounded-circle p-2">
                <FaPlus size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Project Calendar */}
      <div className="card shadow mt-4 chart-bg">
        <div className="card-header fw-semibold text-primary">
          Project Calendar
        </div>
        <div className="card-body">
          {[
            { date: "01/16/2025", task: "Finish Documentation" },
            { date: "01/21/2025", task: "Testing" },
            { date: "01/27/2025", task: "Implementation" },
          ].map((event, index) => (
            <div key={index} className="bg-light p-2 mb-2 rounded">
              <p className="mb-0 fw-medium">
                {event.date} - {event.task}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
