import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import { errMsg } from "../../../utils/helper";
import { Modal, Button, Spinner } from "react-bootstrap";
import { Pie, Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
} from "chart.js";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import moment from "moment";
import "./TeamReportModal.css";

// Register ChartJS components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title
);

const TeamReportModal = ({ show, onHide, team }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [teamData, setTeamData] = useState(null);
  const [cloudUsage, setCloudUsage] = useState(null);
  const [memberActivity, setMemberActivity] = useState(null);
  const [chatEngagement, setChatEngagement] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  
  const token = useSelector((state) => state.auth.token);
  const reportRef = useRef(null);

  useEffect(() => {
    if (show && team?._id) {
      fetchTeamReport(team._id);
    }
  }, [show, team]);

  const fetchTeamReport = async (teamId) => {
    setIsLoading(true);
    try {
      // Make sure these API paths match your backend structure
      const apiBase = `${import.meta.env.VITE_API}`; 
      
      // Log the API endpoint for debugging
      console.log("API Endpoints:", {
        teamDetails: `${apiBase}/getTeamDetails/${teamId}`,
        memberActivity: `${apiBase}/getTeamMemberActivity/${teamId}`, 
        chatEngagement: `${apiBase}/getTeamChatEngagement/${teamId}`
      });
      
      // Fetch all the required data in parallel for efficiency
      const [teamDataRes, memberActivityRes, chatEngagementRes] = 
        await Promise.all([
          axios.get(`${apiBase}/getTeamDetails/${teamId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${apiBase}/getTeamMemberActivity/${teamId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${apiBase}/getTeamChatEngagement/${teamId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

      console.log("Team data response:", teamDataRes.data);
      console.log("Member activity response:", memberActivityRes.data);
      console.log("Chat engagement response:", chatEngagementRes.data);

      setTeamData(teamDataRes.data);
      setMemberActivity(memberActivityRes.data);
      setChatEngagement(chatEngagementRes.data);
      
      // Specifically fetch the cloud usage using the endpoint from FileShare component
      const cloudUsageRes = await axios.get(
        `${apiBase}/getFolderSize/?path=${encodeURIComponent(teamId)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      console.log("Cloud usage response:", cloudUsageRes.data);
      
      // Process cloud storage data
      if (cloudUsageRes.data) {
        const usedStorage = cloudUsageRes.data.size || 0;
        const totalStorage = team.storageType === "infinity" 
          ? usedStorage * 2 // Just for visualization if unlimited
          : team.storageLimit * 1024 * 1024 * 1024; // Convert GB to bytes
        
        setCloudUsage({
          usedStorage,
          totalStorage,
          freeStorage: totalStorage - usedStorage,
        });
      }
    } catch (error) {
      console.error("Error fetching team report data:", error);
      
      if (error.response?.status === 403) {
        errMsg("You don't have permission to access this data. Admin privileges required.");
      } else {
        errMsg("Failed to load team report data: " + (error.response?.data?.message || error.message));
      }
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        onHide();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const generatePDF = async () => {
    if (!reportRef.current) return;
    setExportingPdf(true);
    
    try {
      // Add a temp class for better PDF styling
      reportRef.current.classList.add('generating-pdf');
      
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const element = clonedDoc.getElementById('team-report-for-pdf');
          if (element) {
            element.style.padding = '20px';
            element.style.width = '100%';
          }
        }
      });
      
      reportRef.current.classList.remove('generating-pdf');
      
      const imgData = canvas.toDataURL("image/png");
      
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      
      const contentWidth = pageWidth - 2 * margin;
      const imgHeight = (canvas.height * contentWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      let pageCount = 1;
      
      // Add cover page
      pdf.setTextColor(44, 62, 80);
      pdf.setFontSize(24);
      pdf.text(`${team?.name} - Team Report`, margin, 40);
      
      pdf.setFontSize(14);
      pdf.text(`Generated on: ${moment().format('MMMM D, YYYY')}`, margin, 55);
      pdf.text(`Team Created: ${moment(team?.createdAt).format('MMMM D, YYYY')}`, margin, 65);
      pdf.text(`Total Members: ${team?.members?.length || 0}`, margin, 75);
      
      pdf.setFillColor(52, 152, 219);
      pdf.rect(margin, 90, contentWidth, 5, 'F');
      
      pdf.addImage(team?.logo?.url || '', 'PNG', (pageWidth/2) - 25, 120, 50, 50);
      
      pdf.addPage();
      
      // Add content pages
      while (heightLeft > 0) {
        pdf.addImage(
          imgData,
          "PNG",
          margin,
          margin - position,
          contentWidth,
          imgHeight
        );
        
        heightLeft -= (pageHeight - 2 * margin);
        position += (pageHeight - 2 * margin);
        
        if (heightLeft > 0) {
          pdf.addPage();
          pageCount++;
        }
      }
      
      // Add footer to all pages
      for (let i = 1; i <= pageCount + 1; i++) {
        pdf.setPage(i);
        pdf.setFontSize(10);
        pdf.setTextColor(128, 128, 128);
        pdf.text(`Spherify - Page ${i} of ${pageCount + 1}`, pageWidth/2, pageHeight - 10, { align: 'center' });
      }
      
      pdf.save(`${team?.name}_Team_Report_${moment().format('YYYY-MM-DD')}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      errMsg("Failed to generate PDF report. Please try again.");
    } finally {
      setExportingPdf(false);
    }
  };

  // Chart configurations with improved styles
  const cloudUsageChartConfig = {
    data: {
      labels: cloudUsage ? ['Used Storage', 'Free Storage'] : [],
      datasets: [
        {
          data: cloudUsage ? [cloudUsage.usedStorage, cloudUsage.freeStorage] : [],
          backgroundColor: ['rgba(231, 76, 60, 0.8)', 'rgba(46, 204, 113, 0.8)'],
          borderColor: ['rgba(231, 76, 60, 1)', 'rgba(46, 204, 113, 1)'],
          borderWidth: 1,
          hoverOffset: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            padding: 20,
            boxWidth: 15,
            font: {
              size: 13
            }
          }
        },
        title: {
          display: true,
          text: 'Team Storage Usage',
          font: {
            size: 16,
            weight: 'bold',
          },
          color: '#2c3e50',
          padding: {
            top: 10,
            bottom: 20
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const value = context.raw;
              if (value >= 1024 * 1024 * 1024) {
                return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
              } else if (value >= 1024 * 1024) {
                return `${(value / (1024 * 1024)).toFixed(2)} MB`;
              } else {
                return `${(value / 1024).toFixed(2)} KB`;
              }
            }
          }
        }
      },
    },
  };

  const memberActivityChartConfig = {
    data: {
      labels: memberActivity?.labels || [],
      datasets: [
        {
          label: 'Active Members',
          data: memberActivity?.activeCounts || [],
          borderColor: 'rgba(52, 152, 219, 1)',
          backgroundColor: 'rgba(52, 152, 219, 0.2)',
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: 'New Members',
          data: memberActivity?.newCounts || [],
          borderColor: 'rgba(155, 89, 182, 1)',
          backgroundColor: 'rgba(155, 89, 182, 0.2)',
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            precision: 0
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            boxWidth: 12,
            padding: 15
          }
        },
        title: {
          display: true,
          text: 'Member Activity (Last 30 Days)',
          font: {
            size: 16,
            weight: 'bold',
          },
          color: '#2c3e50',
          padding: {
            top: 10,
            bottom: 20
          }
        },
      },
    },
  };

  const chatEngagementChartConfig = {
    data: {
      labels: chatEngagement?.labels || [],
      datasets: [
        {
          label: 'Messages',
          data: chatEngagement?.messageCounts || [],
          backgroundColor: 'rgba(241, 196, 15, 0.8)',
          borderColor: 'rgba(243, 156, 18, 1)',
          borderWidth: 1,
          borderRadius: 4,
          hoverBackgroundColor: 'rgba(243, 156, 18, 0.9)',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            precision: 0
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      },
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: 'Chat Engagement (Last 7 Days)',
          font: {
            size: 16,
            weight: 'bold',
          },
          color: '#2c3e50',
          padding: {
            top: 10,
            bottom: 20
          }
        },
      },
    },
  };

  const formatStorageSize = (bytes) => {
    if (bytes === null) return "Calculating...";
    
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    } else if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    } else if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    } else {
      return `${bytes} Bytes`;
    }
  };

  const generateStorageAnalysis = (cloudUsage) => {
    if (!cloudUsage) return "No storage data available for analysis.";
    
    const usagePercent = (cloudUsage.usedStorage / cloudUsage.totalStorage) * 100;
    const usedGB = (cloudUsage.usedStorage / (1024 * 1024 * 1024)).toFixed(2);
    const totalGB = (cloudUsage.totalStorage / (1024 * 1024 * 1024)).toFixed(2);
    
    let analysisText = `This team is currently using ${usedGB} GB out of ${totalGB} GB allocated storage (${usagePercent.toFixed(1)}%).`;
    
    if (usagePercent > 90) {
      analysisText += ` The storage is critically full with only ${((cloudUsage.freeStorage) / (1024 * 1024 * 1024)).toFixed(2)} GB remaining. It's highly recommended to archive older files or request a storage increase soon.`;
    } else if (usagePercent > 70) {
      analysisText += ` The storage utilization is high. Consider reviewing file storage policies or planning for potential expansion in the coming months.`;
    } else if (usagePercent < 20) {
      analysisText += ` The team is using a small portion of their allocated storage, which suggests possible over-provisioning or a recently created team that hasn't fully utilized its resources yet.`;
    } else {
      analysisText += ` The storage utilization is at a healthy level, providing sufficient space for continued team collaboration.`;
    }
    
    return analysisText;
  };
  
  const generateMemberActivityAnalysis = (memberActivity, teamData) => {
    if (!memberActivity || !teamData) return "No member activity data available for analysis.";
    
    const totalMembers = teamData.memberCount || 0;
    const activeMembers = teamData.activeMembers || 0;
    const newMembers = teamData.newMembersThisMonth || 0;
    const leftMembers = teamData.leftMembersThisMonth || 0;
    
    const activePercentage = totalMembers > 0 ? ((activeMembers / totalMembers) * 100).toFixed(1) : 0;
    
    let analysisText = `The team currently has ${totalMembers} members, with ${activeMembers} active (${activePercentage}% engagement rate). `;
    
    // Analyze member growth
    if (newMembers > 0 && leftMembers === 0) {
      analysisText += `The team is growing, with ${newMembers} new member${newMembers > 1 ? 's' : ''} joining this month and no departures. `;
    } else if (newMembers === 0 && leftMembers > 0) {
      analysisText += `The team is shrinking, with ${leftMembers} member${leftMembers > 1 ? 's' : ''} leaving this month and no new additions. `;
    } else if (newMembers > leftMembers) {
      analysisText += `The team is experiencing net growth with ${newMembers} new member${newMembers > 1 ? 's' : ''} joining and ${leftMembers} leaving this month. `;
    } else if (newMembers < leftMembers) {
      analysisText += `The team is experiencing net reduction with ${leftMembers} member${leftMembers > 1 ? 's' : ''} leaving and only ${newMembers} joining this month. `;
    } else if (newMembers === leftMembers && newMembers > 0) {
      analysisText += `The team size is stable with equal numbers (${newMembers}) of members joining and leaving this month. `;
    } else {
      analysisText += `The team membership has been stable with no changes this month. `;
    }
    
    // Analyze activity trend
    if (memberActivity.activeCounts && memberActivity.activeCounts.length > 0) {
      const recentActivity = memberActivity.activeCounts.slice(-7);
      const avgRecentActivity = recentActivity.reduce((sum, count) => sum + count, 0) / recentActivity.length;
      const avgTotalActivity = memberActivity.activeCounts.reduce((sum, count) => sum + count, 0) / memberActivity.activeCounts.length;
      
      if (avgRecentActivity > avgTotalActivity * 1.2) {
        analysisText += `Member activity has been increasing recently, showing higher engagement in the past week compared to the monthly average.`;
      } else if (avgRecentActivity < avgTotalActivity * 0.8) {
        analysisText += `Member activity has been decreasing recently, showing lower engagement in the past week compared to the monthly average.`;
      } else {
        analysisText += `Member activity has been relatively consistent throughout the month.`;
      }
    }
    
    return analysisText;
  };
  
  const generateChatEngagementAnalysis = (chatEngagement) => {
    if (!chatEngagement || !chatEngagement.messageCounts || chatEngagement.messageCounts.length === 0) {
      return "No chat engagement data available for analysis.";
    }
    
    const totalMessages = chatEngagement.totalMessages || 0;
    const messageGroups = chatEngagement.messageGroupCount || 0;
    const avgMessagesPerDay = chatEngagement.avgMessagesPerDay || 0;
    const mostActiveUser = chatEngagement.mostActiveUser?.name || "N/A";
    
    let analysisText = `The team has exchanged ${totalMessages.toLocaleString()} messages across ${messageGroups} message groups, averaging ${avgMessagesPerDay.toFixed(1)} messages per day. `;
    
    // Analyze message distribution
    const messageCounts = chatEngagement.messageCounts;
    const maxMessages = Math.max(...messageCounts);
    const minMessages = Math.min(...messageCounts);
    const avgMessages = messageCounts.reduce((sum, count) => sum + count, 0) / messageCounts.length;
    const messageVariation = maxMessages - minMessages;
    
    if (messageVariation > avgMessages * 1.5) {
      analysisText += `There is high variability in daily communication, with some days showing significantly more activity than others. `;
    } else if (messageVariation < avgMessages * 0.5) {
      analysisText += `Communication patterns are fairly consistent day-to-day. `;
    } else {
      analysisText += `Daily communication shows moderate variability. `;
    }
    
    // Analyze trends
    const recentTrend = messageCounts[messageCounts.length - 1] > messageCounts[messageCounts.length - 2];
    
    if (recentTrend) {
      analysisText += `The most recent day shows an uptick in communication. `;
    } else {
      analysisText += `The most recent day shows a decline in communication. `;
    }
    
    // Add most active user
    if (mostActiveUser !== "N/A") {
      analysisText += `${mostActiveUser} is the most active communicator in the team.`;
    }
    
    return analysisText;
  };

  return (
    <Modal 
      show={show} 
      onHide={onHide} 
      centered 
      size="xl"
      backdrop="static"
      className="team-report-modal"
    >
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="fa-solid fa-chart-line me-2"></i>
          Team Report: {team?.name}
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        {isLoading ? (
          <div className="text-center p-5">
            <div className="spinner-container">
              <div className="spinner"></div>
              <p>Loading report data...</p>
            </div>
          </div>
        ) : (
          <div id="team-report-for-pdf" ref={reportRef} className="team-report-content">
            <div className="team-header">
              <div className="team-info">
                <div className="team-logo-container">
                  {team?.logo?.url ? (
                    <img src={team.logo.url} alt={team.name} className="team-logo" />
                  ) : (
                    <div className="team-logo-placeholder">
                      {team?.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="team-details">
                  <h2>{team?.name}</h2>
                  <div className="team-meta">
                    <div className="meta-item">
                      <i className="fa-solid fa-calendar-plus me-2"></i>
                      <span className="meta-label">Created:</span>
                      <span className="meta-value">{moment(team?.createdAt).format('MMMM D, YYYY')}</span>
                    </div>
                    <div className="meta-item">
                      <i className="fa-solid fa-circle-check me-2"></i>
                      <span className="meta-label">Status:</span>
                      <span className={`meta-value status-badge ${team?.isDisabled ? 'inactive' : 'active'}`}>
                        {team?.isDisabled ? 'Disabled' : 'Active'}
                      </span>
                    </div>
                    <div className="meta-item">
                      <i className="fa-solid fa-users me-2"></i>
                      <span className="meta-label">Members:</span>
                      <span className="meta-value">{team?.members?.filter(member => !member.leaveAt)?.length || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="data-card storage-section">
              <div className="card-header">
                <h3>
                  <i className="fa-solid fa-database me-2"></i>
                  Cloud Storage Usage
                </h3>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-5">
                    <div className="chart-container" style={{ height: "280px" }}>
                      {cloudUsage ? (
                        <Pie data={cloudUsageChartConfig.data} options={cloudUsageChartConfig.options} />
                      ) : (
                        <div className="chart-placeholder">
                          <i className="fa-solid fa-circle-notch fa-spin"></i>
                          <span>Loading data...</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-md-7">
                    <div className="storage-usage-container">
                      <div className="usage-meter">
                        <div className="progress-ring-container">
                          <svg className="progress-ring" width="120" height="120" viewBox="0 0 120 120">
                            <circle
                              className="progress-ring-circle-bg"
                              stroke="#e6e6e6"
                              strokeWidth="10"
                              fill="transparent"
                              r="50"
                              cx="60"
                              cy="60"
                            />
                            <circle
                              className="progress-ring-circle"
                              stroke="#3498db"
                              strokeWidth="10"
                              fill="transparent"
                              r="50"
                              cx="60"
                              cy="60"
                              strokeDasharray={`${2 * Math.PI * 50}`}
                              strokeDashoffset={`${2 * Math.PI * 50 * (1 - (cloudUsage ? Math.min((cloudUsage.usedStorage / cloudUsage.totalStorage), 1) : 0))}`}
                              strokeLinecap="round"
                              transform="rotate(-90 60 60)"
                            />
                          </svg>
                          <div className="progress-center">
                            {cloudUsage ? `${((cloudUsage.usedStorage / cloudUsage.totalStorage) * 100).toFixed(1)}%` : '0%'}
                          </div>
                        </div>
                        <div className="usage-stats">
                          <div className="stat-row">
                            <div className="stat-label">Total Allocated:</div>
                            <div className="stat-value highlighted">
                              {cloudUsage ? formatStorageSize(cloudUsage.totalStorage) : 'N/A'}
                            </div>
                          </div>
                          <div className="stat-row">
                            <div className="stat-label">Used Storage:</div>
                            <div className="stat-value warning">
                              {cloudUsage ? formatStorageSize(cloudUsage.usedStorage) : 'N/A'}
                            </div>
                          </div>
                          <div className="stat-row">
                            <div className="stat-label">Free Space:</div>
                            <div className="stat-value success">
                              {cloudUsage ? formatStorageSize(cloudUsage.freeStorage) : 'N/A'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="storage-capacity-visualization">
                        <div className="progress custom-progress">
                          <div 
                            className={`progress-bar ${
                              cloudUsage && (cloudUsage.usedStorage / cloudUsage.totalStorage) > 0.85 
                                ? 'bg-danger' 
                                : cloudUsage && (cloudUsage.usedStorage / cloudUsage.totalStorage) > 0.7 
                                  ? 'bg-warning' 
                                  : 'bg-success'
                            }`}
                            role="progressbar"
                            style={{ width: `${cloudUsage ? Math.min((cloudUsage.usedStorage / cloudUsage.totalStorage) * 100, 100) : 0}%` }}
                            aria-valuenow={cloudUsage ? Math.min((cloudUsage.usedStorage / cloudUsage.totalStorage) * 100, 100).toFixed(1) : 0}
                            aria-valuemin="0"
                            aria-valuemax="100"
                          ></div>
                        </div>
                        <div className="storage-labels">
                          <span>0</span>
                          <span>{cloudUsage ? formatStorageSize(cloudUsage.totalStorage) : 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="analysis-section">
                  <h4 className="analysis-title">
                    <i className="fa-solid fa-chart-line me-2"></i>
                    Storage Analysis
                  </h4>
                  <p className="analysis-text">
                    {generateStorageAnalysis(cloudUsage)}
                  </p>
                </div>
              </div>
            </div>

            <div className="data-card activity-section">
              <div className="card-header">
                <h3>
                  <i className="fa-solid fa-user-group me-2"></i>
                  Team Member Activity
                </h3>
              </div>
              <div className="card-body">
                <div className="chart-container" style={{ height: "280px" }}>
                  {memberActivity ? (
                    <Line data={memberActivityChartConfig.data} options={memberActivityChartConfig.options} />
                  ) : (
                    <div className="chart-placeholder">
                      <i className="fa-solid fa-circle-notch fa-spin"></i>
                      <span>Loading activity data...</span>
                    </div>
                  )}
                </div>
                
                <div className="stats-cards-container">
                  <div className="stats-card">
                    <div className="icon">
                      <i className="fa-solid fa-users"></i>
                    </div>
                    <div className="info">
                      <span className="value">{teamData?.memberCount || 0}</span>
                      <span className="label">Total Members</span>
                    </div>
                  </div>
                  
                  <div className="stats-card">
                    <div className="icon active">
                      <i className="fa-solid fa-user-check"></i>
                    </div>
                    <div className="info">
                      <span className="value">{teamData?.activeMembers || 0}</span>
                      <span className="label">Active Members</span>
                    </div>
                  </div>
                  
                  <div className="stats-card">
                    <div className="icon new">
                      <i className="fa-solid fa-user-plus"></i>
                    </div>
                    <div className="info">
                      <span className="value">{teamData?.newMembersThisMonth || 0}</span>
                      <span className="label">New This Month</span>
                    </div>
                  </div>
                  
                  <div className="stats-card">
                    <div className="icon inactive">
                      <i className="fa-solid fa-user-minus"></i>
                    </div>
                    <div className="info">
                      <span className="value">{teamData?.leftMembersThisMonth || 0}</span>
                      <span className="label">Left This Month</span>
                    </div>
                  </div>
                </div>
                <div className="analysis-section">
                  <h4 className="analysis-title">
                    <i className="fa-solid fa-magnifying-glass-chart me-2"></i>
                    Membership Analysis
                  </h4>
                  <p className="analysis-text">
                    {generateMemberActivityAnalysis(memberActivity, teamData)}
                  </p>
                </div>
              </div>
            </div>

            <div className="data-card engagement-section">
              <div className="card-header">
                <h3>
                  <i className="fa-solid fa-comments me-2"></i>
                  Chat Engagement
                </h3>
              </div>
              <div className="card-body">
                <div className="chart-container" style={{ height: "280px" }}>
                  {chatEngagement ? (
                    <Bar data={chatEngagementChartConfig.data} options={chatEngagementChartConfig.options} />
                  ) : (
                    <div className="chart-placeholder">
                      <i className="fa-solid fa-circle-notch fa-spin"></i>
                      <span>Loading chat data...</span>
                    </div>
                  )}
                </div>
                
                <div className="stats-cards-container">
                  <div className="stats-card">
                    <div className="icon message">
                      <i className="fa-solid fa-message"></i>
                    </div>
                    <div className="info">
                      <span className="value">{chatEngagement?.totalMessages || 0}</span>
                      <span className="label">Total Messages</span>
                    </div>
                  </div>
                  
                  <div className="stats-card">
                    <div className="icon chat-groups">
                      <i className="fa-solid fa-comments"></i>
                    </div>
                    <div className="info">
                      <span className="value">{chatEngagement?.messageGroupCount || 0}</span>
                      <span className="label">Message Groups</span>
                    </div>
                  </div>
                  
                  <div className="stats-card">
                    <div className="icon user">
                      <i className="fa-solid fa-medal"></i>
                    </div>
                    <div className="info">
                      <span className="value">{chatEngagement?.mostActiveUser?.name || 'N/A'}</span>
                      <span className="label">Most Active User</span>
                    </div>
                  </div>
                  
                  <div className="stats-card">
                    <div className="icon average">
                      <i className="fa-solid fa-chart-line"></i>
                    </div>
                    <div className="info">
                      <span className="value">{chatEngagement?.avgMessagesPerDay?.toFixed(1) || 0}</span>
                      <span className="label">Avg Messages/Day</span>
                    </div>
                  </div>
                </div>
                <div className="analysis-section">
                  <h4 className="analysis-title">
                    <i className="fa-solid fa-comment-dots me-2"></i>
                    Communication Analysis
                  </h4>
                  <p className="analysis-text">
                    {generateChatEngagementAnalysis(chatEngagement)}
                  </p>
                </div>
              </div>
            </div>

            <div className="data-card members-section">
              <div className="card-header">
                <h3>
                  <i className="fa-solid fa-address-card me-2"></i>
                  Active Team Members
                </h3>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Joined</th>
                        <th>Messages</th>
                        <th>Last Active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamData?.members?.filter(member => !member.leaveAt)?.map((member) => (
                        <tr key={member.user._id}>
                          <td className="member-name">
                            <div className="member-avatar">
                              {member.user.avatar?.url ? (
                                <img src={member.user.avatar.url} alt="Avatar" />
                              ) : (
                                <span>
                                  {`${member.user.firstName?.charAt(0)}${member.user.lastName?.charAt(0)}`}
                                </span>
                              )}
                            </div>
                            <div>
                              {member.user.firstName} {member.user.lastName}
                              {member.isAdmin && <span className="admin-badge">Admin</span>}
                            </div>
                          </td>
                          <td>{member.role || member.nickname || 'Member'}</td>
                          <td>{moment(member.joinedAt).format('MMM D, YYYY')}</td>
                          <td>{member.messageCount || 0}</td>
                          <td>{member.user.statusUpdatedAt ? moment(member.user?.statusUpdatedAt).format('MMM D, YYYY [at] h:mm A') : 'N/A'}</td>
                        </tr>
                      ))}
                      {(!teamData?.members?.filter(member => !member.leaveAt)?.length) && (
                        <tr>
                          <td colSpan="5" className="text-center">No active members</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="data-card membership-history-section">
              <div className="card-header">
                <h3>
                  <i className="fa-solid fa-clock-rotate-left me-2"></i>
                  Membership History
                </h3>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Joined</th>
                        <th>Left</th>
                        <th>Duration</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamData?.members?.sort((a, b) => 
                        new Date(b.joinedAt) - new Date(a.joinedAt)
                      )?.map((member) => {
                        // Calculate duration
                        const joinDate = moment(member.joinedAt);
                        const leaveDate = member.leaveAt ? moment(member.leaveAt) : moment();
                        const duration = moment.duration(leaveDate.diff(joinDate));
                        let durationText = '';
                        
                        if (duration.asMonths() >= 1) {
                          durationText = `${Math.floor(duration.asMonths())} month${Math.floor(duration.asMonths()) !== 1 ? 's' : ''}`;
                        } else if (duration.asDays() >= 1) {
                          durationText = `${Math.floor(duration.asDays())} day${Math.floor(duration.asDays()) !== 1 ? 's' : ''}`;
                        } else {
                          durationText = `${Math.floor(duration.asHours())} hour${Math.floor(duration.asHours()) !== 1 ? 's' : ''}`;
                        }
                        
                        return (
                          <tr key={`history-${member.user._id}-${member.joinedAt}`}>
                            <td className="member-name">
                              <div className="member-avatar">
                                {member.user.avatar?.url ? (
                                  <img src={member.user.avatar.url} alt="Avatar" />
                                ) : (
                                  <span>
                                    {`${member.user.firstName?.charAt(0)}${member.user.lastName?.charAt(0)}`}
                                  </span>
                                )}
                              </div>
                              <div>
                                {member.user.firstName} {member.user.lastName}
                                {member.isAdmin && <span className="admin-badge">Admin</span>}
                              </div>
                            </td>
                            <td>{moment(member.joinedAt).format('MMM D, YYYY')}</td>
                            <td>{member.leaveAt ? moment(member.leaveAt).format('MMM D, YYYY') : '—'}</td>
                            <td>{durationText}</td>
                            <td>
                              <span className={`status-badge ${member.leaveAt ? 'inactive' : 'active'}`}>
                                {member.leaveAt ? 'Left' : 'Active'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {(!teamData?.members || teamData.members.length === 0) && (
                        <tr>
                          <td colSpan="5" className="text-center">No membership history available</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <div className="report-footer">
              <div className="report-generated">
                Report generated on {moment().format('MMMM D, YYYY [at] h:mm:ss A')}
              </div>
              <div className="report-logo">Spherify</div>
            </div>
          </div>
        )}
      </Modal.Body>
      
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
        <Button 
          variant="primary" 
          onClick={generatePDF} 
          disabled={isLoading || exportingPdf}
        >
          {exportingPdf ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Generating...
            </>
          ) : (
            <>
              <i className="fa-solid fa-file-pdf me-2"></i>
              Download Report
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default TeamReportModal;
