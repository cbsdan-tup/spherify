import React, { useState, useEffect } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import PdfGenerator from "./PdfGenerator";

ChartJS.register(ArcElement, Tooltip, Legend);

const ContributionReport = ({ teamId }) => {
  const token = useSelector((state) => state.auth.token);
  const [loading, setLoading] = useState(true);
  const [contributionData, setContributionData] = useState(null);
  const [sortField, setSortField] = useState("filesCreated");
  const [sortDirection, setSortDirection] = useState("desc");
  const [displayMode, setDisplayMode] = useState("table");
  const [teamDetails, setTeamDetails] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch team contributions
        const contributionsResponse = await axios.get(
          `${import.meta.env.VITE_API}/contributions/${teamId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        
        // Fetch team details for the PDF report
        const detailsResponse = await axios.get(
          `${import.meta.env.VITE_API}/getTeamBasicDetails/${teamId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        
        setContributionData(contributionsResponse.data);
        setTeamDetails(detailsResponse.data.team);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching contributions:", err);
        setLoading(false);
      }
    };

    fetchData();
  }, [teamId, token]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  if (loading) {
    return <div className="text-center p-5">Loading contribution data...</div>;
  }

  // Prepare task metrics chart
  const taskChartData = contributionData?.taskMetrics
    ? {
        labels: ["Completed", "In Progress", "Not Started"],
        datasets: [
          {
            data: [
              contributionData.taskMetrics.completed,
              contributionData.taskMetrics.inProgress,
              contributionData.taskMetrics.notStarted,
            ],
            backgroundColor: ["#4CAF50", "#FFC107", "#F44336"],
            borderWidth: 1,
          },
        ],
      }
    : null;

  // Sort user contributions based on sort field
  const userContributions = [...(contributionData?.userContributions || [])];
  
  userContributions.sort((a, b) => {
    let valueA, valueB;
    
    // Get the correct value based on the sort field
    switch (sortField) {
      case "filesCreated":
        valueA = a.files.created;
        valueB = b.files.created;
        break;
      case "filesEdited":
        valueA = a.files.edited;
        valueB = b.files.edited;
        break;
      case "tasksAssigned":
        valueA = a.tasks.assigned;
        valueB = b.tasks.assigned;
        break;
      case "tasksCompleted":
        valueA = a.tasks.completed;
        valueB = b.tasks.completed;
        break;
      case "completionRate":
        valueA = parseFloat(a.completionRate);
        valueB = parseFloat(b.completionRate);
        break;
      case "messages":
        valueA = a.messages;
        valueB = b.messages;
        break;
      case "totalContributions":
        valueA = a.files.created + a.files.edited + a.messages + a.tasks.assigned;
        valueB = b.files.created + b.files.edited + b.messages + b.tasks.assigned;
        break;
      default:
        valueA = a.files.created + a.files.edited + a.messages + a.tasks.assigned;
        valueB = b.files.created + b.files.edited + b.messages + b.tasks.assigned;
    }
    
    // Apply sort direction
    if (sortDirection === "asc") {
      return valueA - valueB;
    } else {
      return valueB - valueA;
    }
  });

  return (
    <div className="contribution-report">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>Team Contributions</h4>
        <PdfGenerator 
          teamDetails={teamDetails} 
          contributionData={contributionData} 
        />
      </div>
      
      <div className="row mb-4">
        <div className="col-md-8">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="card-title">Member Contributions</h5>
                <div className="control-buttons">
                  <div className="btn-group">
                    <button
                      className={`btn btn-sm ${displayMode === 'table' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setDisplayMode('table')}
                    >
                      <i className="fas fa-table me-1"></i>
                      Table
                    </button>
                    <button
                      className={`btn btn-sm ${displayMode === 'cards' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setDisplayMode('cards')}
                    >
                      <i className="fas fa-th me-1"></i>
                      Cards
                    </button>
                  </div>
                </div>
              </div>

              {displayMode === 'table' ? (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Member</th>
                        <th 
                          onClick={() => handleSort("filesCreated")}
                          className="sortable"
                          style={{ cursor: 'pointer' }}
                        >
                          Files Created
                          {sortField === "filesCreated" && (
                            <i className={`ms-1 fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'}`}></i>
                          )}
                        </th>
                        <th 
                          onClick={() => handleSort("filesEdited")}
                          className="sortable"
                          style={{ cursor: 'pointer' }}
                        >
                          Files Edited
                          {sortField === "filesEdited" && (
                            <i className={`ms-1 fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'}`}></i>
                          )}
                        </th>
                        <th 
                          onClick={() => handleSort("tasksAssigned")}
                          className="sortable"
                          style={{ cursor: 'pointer' }}
                        >
                          Tasks
                          {sortField === "tasksAssigned" && (
                            <i className={`ms-1 fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'}`}></i>
                          )}
                        </th>
                        <th 
                          onClick={() => handleSort("completionRate")}
                          className="sortable"
                          style={{ cursor: 'pointer' }}
                        >
                          Completion %
                          {sortField === "completionRate" && (
                            <i className={`ms-1 fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'}`}></i>
                          )}
                        </th>
                        <th 
                          onClick={() => handleSort("messages")}
                          className="sortable"
                          style={{ cursor: 'pointer' }}
                        >
                          Messages
                          {sortField === "messages" && (
                            <i className={`ms-1 fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'}`}></i>
                          )}
                        </th>
                        <th 
                          onClick={() => handleSort("totalContributions")}
                          className="sortable"
                          style={{ cursor: 'pointer' }}
                        >
                          Total
                          {sortField === "totalContributions" && (
                            <i className={`ms-1 fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'}`}></i>
                          )}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {userContributions.map((user) => (
                        <tr key={user.userId}>
                          <td>
                            <div className="d-flex align-items-center" style={{gap: "1rem"}}>
                              {user.avatar ? (
                                <img
                                  src={user.avatar}
                                  alt=""
                                  className="rounded-circle me-2"
                                  width="32"
                                />
                              ) : (
                                <div 
                                  className="rounded-circle bg-secondary d-flex align-items-center justify-content-center me-2"
                                  style={{ width: "32px", height: "32px" }}
                                >
                                  <span className="text-white">{user.name.charAt(0)}</span>
                                </div>
                              )}
                              <div>
                                <div className="fw-bold">{user.name}</div>
                                <span className={`badge bg-${
                                  user.role === 'leader' ? 'primary' :
                                  user.role === 'moderator' ? 'success' :
                                  'secondary'
                                }`}>
                                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td>{user.files.created}</td>
                          <td>{user.files.edited}</td>
                          <td>
                            {user.tasks.completed}/{user.tasks.assigned}
                          </td>
                          <td>
                            {user.completionRate > 0 ? (
                              <div className="d-flex align-items-center">
                                <span>{user.completionRate}%</span>
                                <div className="progress ms-2" style={{ height: '6px', width: '60px' }}>
                                  <div
                                    className="progress-bar"
                                    style={{ width: `${user.completionRate}%` }}
                                  ></div>
                                </div>
                              </div>
                            ) : (
                              <span>-</span>
                            )}
                          </td>
                          <td>{user.messages}</td>
                          <td>
                            <strong>
                              {user.files.created + user.files.edited + user.messages + user.tasks.assigned}
                            </strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="member-cards">
                  <div className="row">
                    {userContributions.map((user) => (
                      <div key={user.userId} className="col-md-6 col-lg-4 mb-3">
                        <div className="card h-100">
                          <div className="card-body">
                            <div className="d-flex align-items-center mb-3" style={{gap: "0.5rem"}}>
                              {user.avatar ? (
                                <img
                                  src={user.avatar}
                                  alt=""
                                  className="rounded-circle me-2"
                                  width="48"
                                  height="48"
                                />
                              ) : (
                                <div 
                                  className="rounded-circle bg-secondary d-flex align-items-center justify-content-center me-2"
                                  style={{ width: "48px", height: "48px" }}
                                >
                                  <span className="text-white">{user.name.charAt(0)}</span>
                                </div>
                              )}
                              <div>
                                <div className="fw-bold">{user.name}</div>
                                <span className={`badge bg-${
                                  user.role === 'leader' ? 'primary' :
                                  user.role === 'moderator' ? 'success' :
                                  'secondary'
                                }`}>
                                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                </span>
                              </div>
                            </div>
                            
                            <div className="stats-grid">
                              <div className="stat-item">
                                <div className="stat-label">Files Created</div>
                                <div className="stat-value">{user.files.created}</div>
                              </div>
                              <div className="stat-item">
                                <div className="stat-label">Files Edited</div>
                                <div className="stat-value">{user.files.edited}</div>
                              </div>
                              <div className="stat-item">
                                <div className="stat-label">Tasks</div>
                                <div className="stat-value">{user.tasks.completed}/{user.tasks.assigned}</div>
                              </div>
                              <div className="stat-item">
                                <div className="stat-label">Messages</div>
                                <div className="stat-value">{user.messages}</div>
                              </div>
                            </div>
                            
                            <div className="mt-3">
                              <span className="text-muted">Task Completion</span>
                              <div className="progress" style={{ height: '10px' }}>
                                <div
                                  className="progress-bar"
                                  style={{ width: `${user.completionRate}%` }}
                                ></div>
                              </div>
                              <div className="text-end text-muted small">
                                {user.completionRate}%
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title">Task Status</h5>
              {taskChartData ? (
                <div style={{ height: "250px", display: "flex", justifyContent: "center" }}>
                  <Doughnut 
                    data={taskChartData} 
                    options={{ 
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                        }
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="text-center p-5">No task data available</div>
              )}
              
              <div className="task-stats mt-4">
                <div className="row">
                  <div className="col-6">
                    <div className="stat-item text-center">
                      <div className="stat-label">Total Tasks</div>
                      <div className="stat-value">{contributionData?.taskMetrics?.total || 0}</div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="stat-item text-center">
                      <div className="stat-label">Completion</div>
                      <div className="stat-value">
                        {contributionData?.taskMetrics?.total ? 
                          `${Math.round((contributionData.taskMetrics.completed / contributionData.taskMetrics.total) * 100)}%` : 
                          '0%'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ContributionReport;
