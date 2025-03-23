import React, { useState, useEffect } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from "chart.js";
import { Pie, Bar } from "react-chartjs-2";

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const TeamOverview = ({ teamId }) => {
  const token = useSelector((state) => state.auth.token);
  const [loading, setLoading] = useState(true);
  const [teamDetails, setTeamDetails] = useState(null);
  const [memberActivity, setMemberActivity] = useState(null);
  const [taskData, setTaskData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch detailed team information
        const detailsResponse = await axios.get(
          `${import.meta.env.VITE_API}/getTeamDetails/${teamId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        
        // Fetch member activity data
        const activityResponse = await axios.get(
          `${import.meta.env.VITE_API}/getTeamMemberActivity/${teamId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        
        // Fetch task data
        const taskResponse = await axios.get(
          `${import.meta.env.VITE_API}/getTeamTasks/${teamId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setTeamDetails(detailsResponse.data);
        setMemberActivity(activityResponse.data);
        setTaskData(taskResponse.data?.stats);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching team overview:", err);
        setLoading(false);
      }
    };

    fetchData();
  }, [teamId, token]);

  // Helper function to get pie chart options with center label
  const getPieChartOptions = (centerText, subText) => {
    return {
      maintainAspectRatio: false,
      // plugins: {
      //   legend: {
      //     position: 'bottom',
      //   },
      //   tooltip: {
      //     callbacks: {
      //       label: function(context) {
      //         const label = context.label || '';
      //         const value = context.raw || 0;
      //         const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
      //         const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
      //         return `${label}: ${value} (${percentage}%)`;
      //       }
      //     }
      //   }
      // },
      elements: {
        arc: {
          borderWidth: 0
        }
      },
      // Add center text using afterDraw hook
      plugins: [{
        id: 'centerText',
        afterDraw: (chart) => {
          const width = chart.width;
          const height = chart.height;
          const ctx = chart.ctx;
          const total = parseInt(centerText);
          
          // Don't display if total is 0
          if (total <= 0) return;
          
          ctx.restore();
          const fontSize = (height / 160).toFixed(2);
          ctx.font = `bold ${fontSize}em sans-serif`;
          ctx.textBaseline = "middle";
          ctx.fillStyle = "#555";
          
          const text = centerText;
          const textX = Math.round((width - ctx.measureText(text).width) / 2);
          const textY = height / 2 - 15;
          
          ctx.fillText(text, textX, textY);
          
          // Add subtitle with descriptive text
          ctx.font = `${fontSize * 0.6}em sans-serif`;
          ctx.fillStyle = "#777";
          
          const subTextX = Math.round((width - ctx.measureText(subText).width) / 2);
          const subTextY = height / 2 + 10;
          
          ctx.fillText(subText, subTextX, subTextY);
          
          ctx.save();
        }
      }]
    };
  };

  if (loading) {
    return <div className="text-center p-5">Loading team overview...</div>;
  }

  // Prepare chart data for member status
  const memberStatusData = {
    labels: ["Active", "New this month", "Left this month"],
    datasets: [
      {
        data: [
          teamDetails?.activeMembers || 0,
          teamDetails?.newMembersThisMonth || 0,
          teamDetails?.leftMembersThisMonth || 0,
        ],
        backgroundColor: ["#4CAF50", "#2196F3", "#F44336"],
        borderWidth: 1,
      },
    ],
  };

  // Calculate total members for the center label
  const totalMembers = (teamDetails?.activeMembers || 0) + 
                      (teamDetails?.newMembersThisMonth || 0) - 
                      (teamDetails?.leftMembersThisMonth || 0);

  // Prepare chart data for member activity
  const memberActivityData = memberActivity
    ? {
        labels: memberActivity.labels.slice(-7), // Last 7 days
        datasets: [
          {
            label: "Active Members",
            data: memberActivity.activeCounts.slice(-7),
            backgroundColor: "rgba(54, 162, 235, 0.6)",
          },
          {
            label: "New Members",
            data: memberActivity.newCounts.slice(-7),
            backgroundColor: "rgba(75, 192, 192, 0.6)",
          },
        ],
      }
    : null;

  // Prepare chart data for tasks
  const taskChartData = taskData
    ? {
        labels: ["Completed", "In Progress", "Pending"],
        datasets: [
          {
            data: [taskData.completed, taskData.inProgress, taskData.pending],
            backgroundColor: ["#4CAF50", "#FFC107", "#F44336"],
            borderWidth: 1,
          },
        ],
      }
    : null;
    
  // Calculate total tasks
  const totalTasks = taskData ? taskData.completed + taskData.inProgress + taskData.pending : 0;

  return (
    <div className="team-overview">
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title">Team Information</h5>
              <div className="d-flex align-items-center mb-3" style={{gap: "0.7rem"}}>
                {teamDetails?.logo?.url ? (
                  <img 
                    src={teamDetails.logo?.url || "/images/white-logo.png"} 
                    alt={teamDetails.name} 
                    className="me-3 rounded-circle" 
                    style={{ width: "50px", height: "50px" }}
                  />
                ) : (
                  <div 
                    className="me-3 rounded-circle bg-primary d-flex align-items-center justify-content-center" 
                    style={{ width: "50px", height: "50px" }}
                  >
                    <span className="text-white">{teamDetails?.name?.charAt(0)}</span>
                  </div>
                )}
                <div>
                  <h4 className="mb-0">{teamDetails?.name}</h4>
                  <p className="text-muted mb-0">
                    {teamDetails?.activeMembers} active members
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <p>
                  <strong>Created:</strong>{" "}
                  {new Date(teamDetails?.createdAt).toLocaleDateString()}
                </p>
                <p>
                  <strong>Created by:</strong>{" "}
                  {teamDetails?.createdBy?.firstName} {teamDetails?.createdBy?.lastName}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title">Member Status</h5>
              <div style={{ height: "250px", display: "flex", justifyContent: "center" }}>
                <Pie 
                  data={memberStatusData} 
                  options={getPieChartOptions(totalMembers.toString(), 'Total Members')} 
                />
              </div>
              
              {/* Add summary section */}
              <div style={{ textAlign: 'center', marginTop: '10px', padding: '5px' }}>
                <p style={{ margin: '0' }}>
                  <span style={{ fontWeight: 'bold', color: "#4CAF50" }}>Active: </span>
                  <span>{teamDetails?.activeMembers || 0}</span>
                  <span style={{ margin: '0 10px' }}>|</span>
                  <span style={{ fontWeight: 'bold', color: "#2196F3" }}>New: </span>
                  <span>{teamDetails?.newMembersThisMonth || 0}</span>
                  <span style={{ margin: '0 10px' }}>|</span>
                  <span style={{ fontWeight: 'bold', color: "#F44336" }}>Left: </span>
                  <span>{teamDetails?.leftMembersThisMonth || 0}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-8">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title">Member Activity (Last 7 Days)</h5>
              {memberActivityData && (
                <Bar
                style={{maxHeight: "400px"}}
                  data={memberActivityData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'top',
                      },
                      title: {
                        display: false,
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: 'Number of Members'
                        }
                      }
                    }
                  }}
                  height={300}
                />
              )}
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card h-100" style={{maxHeight: "400px"}}>
            <div className="card-body">
              <h5 className="card-title">Tasks Overview</h5>
              {taskChartData ? (
                <div style={{ height: "250px", display: "flex", justifyContent: "center" }}>
                  <Pie 
                    data={taskChartData} 
                    options={getPieChartOptions(totalTasks.toString(), 'Total Tasks')} 
                  />
                  
                  {/* Add summary section */}
                  <div style={{ 
                    position: 'absolute',
                    bottom: '5px',
                    left: '0',
                    right: '0',
                    textAlign: 'center', 
                    padding: '5px'
                  }}>
                    <p style={{ margin: '0', fontSize: '0.8rem' }}>
                      <span style={{ fontWeight: 'bold', color: "#4CAF50" }}>Completed: </span>
                      <span>{taskData.completed}</span>
                      <span style={{ margin: '0 5px' }}>|</span>
                      <span style={{ fontWeight: 'bold', color: "#FFC107" }}>In Progress: </span>
                      <span>{taskData.inProgress}</span>
                      <span style={{ margin: '0 5px' }}>|</span>
                      <span style={{ fontWeight: 'bold', color: "#F44336" }}>Pending: </span>
                      <span>{taskData.pending}</span>
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-center mt-5">No task data available</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamOverview;
