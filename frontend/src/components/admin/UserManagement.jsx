import React, { useState, useEffect, useRef } from "react";
import DataTable from "react-data-table-component";
import { useSelector } from "react-redux";
import axios from "axios";
import Swal from "sweetalert2";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { Modal, Tabs, Tab, Badge, Spinner } from "react-bootstrap";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Line, Bar, Pie } from "react-chartjs-2";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const token = useSelector((state) => state.auth.token);
  const datatableRef = useRef(null);

  // New state variables for user details modal
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userTeams, setUserTeams] = useState([]);
  const [userActivity, setUserActivity] = useState({}); // Changed to an object instead of array
  const [isLoading, setIsLoading] = useState(false);

  // Fetch users
  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data?.users || []);
      setFilteredUsers(res.data?.users || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  // Updated function to fetch user teams and chat statistics
  const fetchUserTeams = async (userId) => {
    try {
      setIsLoading(true);

      // Fetch teams the user belongs to
      const teamsRes = await axios.get(
        `${import.meta.env.VITE_API}/getTeamByUser/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setUserTeams(teamsRes?.data || []);

      // Fetch user chat statistics
      const chatStatsRes = await axios.get(
        `${import.meta.env.VITE_API}/getUserChatStatistics/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (chatStatsRes.data.success) {
        // Transform the API data for the chart
        const chartData = chatStatsRes.data.chartData || [];
        const days = chartData.map((item) => item.date);
        const messageCounts = chartData.map((item) => item.count);

        setUserActivity({
          days,
          messageCounts,
          totalMessages: chatStatsRes.data.totalMessages || 0,
        });
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching user data:", error);
      setIsLoading(false);

      // Fallback to empty arrays if API fails
      setUserActivity({
        days: [],
        messageCounts: [],
        totalMessages: 0,
      });
    }
  };

  // Handle opening the user details modal
  const handleViewUser = (user) => {
    setSelectedUser(user);
    fetchUserTeams(user._id);
    setShowUserModal(true);
  };

  // Handle closing the modal
  const handleCloseModal = () => {
    setShowUserModal(false);
    setSelectedUser(null);
    setUserTeams([]);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    setFilteredUsers(
      users.filter((user) =>
        user.email.toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [search, users]);

  useEffect(() => {
    // Dynamically add Bootstrap CSS
    const link = document.createElement("link");
    link.href =
      "https://cdn.jsdelivr.net/npm/bootstrap/dist/css/bootstrap.min.css";
    link.rel = "stylesheet";
    link.id = "bootstrap-css";
    document.head.appendChild(link);

    return () => {
      const existingLink = document.getElementById("bootstrap-css");
      if (existingLink) {
        existingLink.remove();
      }
    };
  }, []);

  // Toggle user status
  const toggleUserStatus = async (id, isDisabled) => {
    const action = isDisabled ? "Enable" : "Disable";

    Swal.fire({
      title: `${action} User`,
      html: `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
          <p style="font-size: 16px;">Are you sure you want to <b>${action.toLowerCase()}</b> this user?</p>
          ${
            !isDisabled
              ? `
              <input type="datetime-local" id="startTime" class="swal2-input" style="width: 90%;" placeholder="Start Time">
              <input type="datetime-local" id="endTime" class="swal2-input" style="width: 90%;" placeholder="End Time">
              <textarea id="reason" class="swal2-textarea" style="width: 90%;" placeholder="Reason for disabling (optional)"></textarea>
            `
              : ""
          }
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: `Yes, ${action}`,
      cancelButtonText: "Cancel",
      confirmButtonColor: isDisabled ? "#28a745" : "#dc3545",
      cancelButtonColor: "#6c757d",
      preConfirm: () => {
        if (!isDisabled) {
          const startTime = Swal.getPopup().querySelector("#startTime").value;
          const endTime = Swal.getPopup().querySelector("#endTime").value;
          const reason = Swal.getPopup().querySelector("#reason").value;

          if (!startTime || !endTime) {
            Swal.showValidationMessage("Start and End time are required.");
            return false;
          }
          return { startTime, endTime, reason };
        }
      },
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const data = isDisabled
            ? {}
            : {
                startTime: result.value.startTime,
                endTime: result.value.endTime,
                reason: result.value.reason,
              };

          await axios.put(
            `${import.meta.env.VITE_API}/${
              isDisabled ? "enableUser" : "disableUser"
            }/${id}`,
            data,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          fetchUsers();
          Swal.fire(
            "Success!",
            `User has been ${action.toLowerCase()}d.`,
            "success"
          );
        } catch (error) {
          console.error(`Error updating user status: ${error.message}`);
          Swal.fire(
            "Error",
            "Failed to update user status. Try again later.",
            "error"
          );
        }
      }
    });
  };

  const columns = [
    { name: "ID", selector: (row) => row._id, sortable: true },
    { name: "First Name", selector: (row) => row.firstName, sortable: true },
    { name: "Last Name", selector: (row) => row.lastName, sortable: true },
    { name: "Email", selector: (row) => row.email, sortable: true },
    {
      name: "Status",
      selector: (row) =>
        row.isDisable ? (
          <span className="text-danger">Disabled</span>
        ) : (
          <span className="text-success">Active</span>
        ),
      sortable: true,
      center: true,
    },
    {
      name: "Disable Start Time",
      selector: (row) =>
        row.disableStartTime
          ? new Date(row.disableStartTime).toLocaleString()
          : "N/A",
      sortable: true,
      center: true,
    },
    {
      name: "Disable End Time",
      selector: (row) =>
        row.disableEndTime
          ? new Date(row.disableEndTime).toLocaleString()
          : "N/A",
      sortable: true,
      center: true,
    },
    {
      name: "Disable Count",
      selector: (row) => row.disableCount || 0,
      sortable: true,
      center: true,
    },
    {
      name: "Actions",
      cell: (row) => (
        <div className="d-flex flex-column" style={{ gap: "2px" }}>
          <button
            className="btn btn-primary btn-md text-white"
            onClick={() => handleViewUser(row)}
            title="View user details"
          >
            <i className="fa-solid fa-eye"></i> View
          </button>
          <button
            className={`btn btn-md ${
              row.isDisable ? "btn-success" : "btn-danger"
            }`}
            onClick={() => toggleUserStatus(row._id, row.isDisable)}
            disabled={row.isAdmin}
            title={
              row.isAdmin && row.isDisable
                ? "Admin users cannot be disabled"
                : ""
            }
          >
            {row.isDisable ? "Enable" : "Disable"}
          </button>
        </div>
      ),
      center: true,
    },
  ];

  // Generate PDF report
  const generatePDF = async () => {
    const datatableElement = datatableRef.current;
    if (!datatableElement) return;

    // Create a title dynamically
    const titleElement = document.createElement("h2");
    titleElement.innerText = "User Lists";
    titleElement.style.textAlign = "center";
    titleElement.style.marginBottom = "10px";
    titleElement.style.fontFamily = "Arial, sans-serif";
    datatableElement.prepend(titleElement);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const canvas = await html2canvas(datatableElement);
    const imgData = canvas.toDataURL("image/png");
    titleElement.remove();

    const pdf = new jsPDF("l", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 25.4;

    const contentWidth = pageWidth - 2 * margin;
    const contentHeight = (canvas.height * contentWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", margin, margin, contentWidth, contentHeight);

    // Watermark settings
    pdf.setFont("Arial");
    pdf.setFontSize(14);
    pdf.setTextColor(215, 215, 215);
    const watermarkText = "spherify";
    const angle = 30;
    const trueOpacity = 3;

    let alternateOffset = 0;
    for (let y = 20; y < pageHeight; y += 40) {
      for (let x = -30 + alternateOffset; x < pageWidth; x += 80) {
        for (let i = 0; i < trueOpacity; i++) {
          pdf.text(watermarkText, x, y, { angle: angle });
        }
      }
      alternateOffset = alternateOffset === 0 ? 40 : 0;
    }

    pdf.save("User_Management_Report.pdf");
  };

  // Prepare chart data
  const activityChartData = {
    labels: userActivity.days || [],
    datasets: [
      {
        label: "Messages",
        data: userActivity.messageCounts || [],
        borderColor: "rgb(53, 162, 235)",
        backgroundColor: "rgba(53, 162, 235, 0.5)",
        tension: 0.3, // Add some curve to the line
      },
    ],
  };

  return (
    <div className="user-management-container">
      <h2 className="title">User Management</h2>
      <input
        type="text"
        className="form-control mb-3 search"
        placeholder="Search users..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="pdf-report">
        <button className="pdf-download" onClick={generatePDF}>
          <i className="fa-solid fa-file"></i>
          <span>PDF REPORT</span>
        </button>
      </div>
      <div ref={datatableRef}>
        <DataTable
          columns={columns}
          data={filteredUsers}
          pagination
          highlightOnHover
          striped
          responsive
          className="users-datatable"
        />
      </div>

      {/* User Details Modal */}
      <Modal
        show={showUserModal}
        onHide={handleCloseModal}
        size="lg"
        backdrop="static"
        aria-labelledby="user-details-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title id="user-details-modal">
            User Details
            {selectedUser?.isAdmin && (
              <Badge bg="dark" className="ms-2">
                Admin
              </Badge>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body
          style={{
            flexDirection: "column",
            maxHeight: "unset",
            alignItems: "unset",
          }}
        >
          {isLoading ? (
            <div className="text-center my-5">
              <Spinner animation="border" role="status" variant="primary">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
              <p className="mt-2">Loading user data...</p>
            </div>
          ) : selectedUser ? (
            <Tabs defaultActiveKey="profile" className="mb-3">
              <Tab
                eventKey="profile"
                title="Profile"
                style={{ maxHeight: "60vh", overflowY: "auto" }}
              >
                <div className="row">
                  <div className="col-md-4 text-center mb-3">
                    <img
                      src={selectedUser.avatar?.url || "/images/account.png"}
                      alt={`${selectedUser.firstName} ${selectedUser.lastName}`}
                      className="img-fluid rounded-circle mb-3"
                      style={{ maxWidth: "150px" }}
                    />
                    <h5>
                      {selectedUser.firstName} {selectedUser.lastName}
                    </h5>
                    <p className="text-muted">{selectedUser.email}</p>
                  </div>
                  <div className="col-md-8">
                    <div className="card">
                      <div className="card-header bg-light">
                        <h5 className="mb-0">User Information</h5>
                      </div>
                      <div className="card-body">
                        <table className="table table-borderless">
                          <tbody>
                            <tr>
                              <th scope="row" width="30%">
                                User ID
                              </th>
                              <td>{selectedUser._id}</td>
                            </tr>
                            <tr>
                              <th scope="row">Status</th>
                              <td>
                                <Badge
                                  bg={
                                    selectedUser.isDisable
                                      ? "danger"
                                      : "success"
                                  }
                                >
                                  {selectedUser.isDisable
                                    ? "Disabled"
                                    : "Active"}
                                </Badge>
                              </td>
                            </tr>
                            <tr>
                              <th scope="row">Account Created</th>
                              <td>
                                {new Date(
                                  selectedUser.createdAt
                                ).toLocaleString()}
                              </td>
                            </tr>
                            <tr>
                              <th scope="row">Last Updated</th>
                              <td>
                                {new Date(
                                  selectedUser.updatedAt
                                ).toLocaleString()}
                              </td>
                            </tr>
                            <tr>
                              <th scope="row">Disable Count</th>
                              <td>{selectedUser.disableCount || 0}</td>
                            </tr>
                            {selectedUser.isDisable && (
                              <>
                                <tr>
                                  <th scope="row">Disabled From</th>
                                  <td>
                                    {selectedUser.disableStartTime
                                      ? new Date(
                                          selectedUser.disableStartTime
                                        ).toLocaleString()
                                      : "N/A"}
                                  </td>
                                </tr>
                                <tr>
                                  <th scope="row">Disabled Until</th>
                                  <td>
                                    {selectedUser.disableEndTime
                                      ? new Date(
                                          selectedUser.disableEndTime
                                        ).toLocaleString()
                                      : "N/A"}
                                  </td>
                                </tr>
                                {selectedUser.disableReason && (
                                  <tr>
                                    <th scope="row">Reason</th>
                                    <td>{selectedUser.disableReason}</td>
                                  </tr>
                                )}
                              </>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="row">
                  <h5 className="mt-3">Risk Assessment</h5>
                  <Badge
                    bg={
                      selectedUser.disableCount > 3
                        ? "danger"
                        : selectedUser.disableCount > 1
                        ? "warning"
                        : "success"
                    }
                    className="p-4 py-3"
                    style={{ fontSize: "1.2rem", display: "flex" }}
                  >
                    {selectedUser.disableCount > 3
                      ? "High Risk"
                      : selectedUser.disableCount > 1
                      ? "Medium Risk"
                      : "Low Risk"}
                  </Badge>
                  <p className="mt-2 small">
                    Risk assessment based on account history and disable
                    frequency.
                  </p>
                </div>
              </Tab>

              <Tab
                eventKey="teams"
                title="Teams"
                style={{ maxHeight: "60vh", overflowY: "auto" }}
              >
                {userTeams.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="table-light">
                        <tr>
                          <th>Team Name</th>
                          <th>Role</th>
                          <th>Joined Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userTeams.map((team, index) => {
                          const memberInfo = team.members.find(
                            (member) =>
                              member.user === selectedUser._id ||
                              (member.user._id &&
                                member.user._id === selectedUser._id)
                          );

                          return (
                            <tr key={index}>
                              <td>
                                <div className="d-flex align-items-center">
                                  {team.logo?.url ? (
                                    <img
                                      src={team.logo.url}
                                      alt={team.name}
                                      className="me-2"
                                      style={{
                                        width: "30px",
                                        height: "30px",
                                        borderRadius: "50%",
                                      }}
                                    />
                                  ) : (
                                    <div
                                      className="me-2 bg-secondary text-white d-flex align-items-center justify-content-center"
                                      style={{
                                        width: "30px",
                                        height: "30px",
                                        borderRadius: "50%",
                                      }}
                                    >
                                      {team.name.charAt(0)}
                                    </div>
                                  )}
                                  {team.name}
                                </div>
                              </td>
                              <td>
                                <Badge
                                  bg={
                                    memberInfo?.isAdmin
                                      ? "primary"
                                      : "secondary"
                                  }
                                >
                                  {memberInfo?.role || "Member"}
                                </Badge>
                              </td>
                              <td>
                                {memberInfo?.joinedAt
                                  ? new Date(
                                      memberInfo.joinedAt
                                    ).toLocaleDateString()
                                  : "N/A"}
                              </td>
                              <td>
                                {memberInfo?.leaveAt ? (
                                  <Badge bg="warning" text="dark">
                                    Left
                                  </Badge>
                                ) : (
                                  <Badge bg="success">Active</Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="alert alert-info">
                    This user is not a member of any teams.
                  </div>
                )}
              </Tab>

              <Tab
                eventKey="activity"
                title="Activity"
                style={{ maxHeight: "60vh", overflowY: "auto" }}
              >
                <div className="card mb-4">
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <span>User Chat Activity (Last 30 Days)</span>
                    <span className="badge bg-primary">
                      Total Messages: {userActivity.totalMessages || 0}
                    </span>
                  </div>
                  <div className="card-body">
                    {userActivity.days?.length > 0 ? (
                      <Line
                        data={activityChartData}
                        options={{
                          responsive: true,
                          plugins: {
                            legend: {
                              position: "top",
                            },
                            title: {
                              display: true,
                              text: "Chat Message Activity",
                            },
                            tooltip: {
                              callbacks: {
                                title: (context) => `Date: ${context[0].label}`,
                                label: (context) => `Messages: ${context.raw}`,
                              },
                            },
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              title: {
                                display: true,
                                text: "Number of Messages",
                              },
                              ticks: {
                                precision: 0,
                              },
                            },
                            x: {
                              title: {
                                display: true,
                                text: "Date",
                              },
                            },
                          },
                        }}
                      />
                    ) : (
                      <div className="alert alert-info text-center">
                        No chat activity data available for this user in the
                        last 30 days.
                      </div>
                    )}
                  </div>
                </div>
                
                {userActivity.days?.length > 0 && (
                  <div className="card mb-4">
                    <div className="card-header bg-light">
                      <h5 className="mb-0">
                        <i className="fas fa-chart-pie me-2 text-primary"></i>
                        Activity Analysis
                      </h5>
                    </div>
                    <div className="card-body">
                      <div className="row">
                        {/* Average Messages */}
                        <div className="col-md-6 col-lg-3 mb-3">
                          <div className="p-3 bg-light rounded-3 border h-100">
                            <div className="d-flex align-items-center mb-2">
                              <div className="rounded-circle bg-primary p-2 me-2">
                                <i className="fas fa-calculator text-white"></i>
                              </div>
                              <h6 className="mb-0">Daily Average</h6>
                            </div>
                            <h3 className="mb-1">
                              {(userActivity.totalMessages / (userActivity.days.length || 1)).toFixed(1)}
                            </h3>
                            <p className="text-muted small mb-0">messages per day</p>
                          </div>
                        </div>
                        
                        {/* Peak Activity */}
                        <div className="col-md-6 col-lg-3 mb-3">
                          <div className="p-3 bg-light rounded-3 border h-100">
                            <div className="d-flex align-items-center mb-2">
                              <div className="rounded-circle bg-success p-2 me-2">
                                <i className="fas fa-arrow-trend-up text-white"></i>
                              </div>
                              <h6 className="mb-0">Peak Activity</h6>
                            </div>
                            <h3 className="mb-1">
                              {Math.max(...userActivity.messageCounts, 0)}
                            </h3>
                            <p className="text-muted small mb-0">
                              {userActivity.messageCounts.indexOf(Math.max(...userActivity.messageCounts)) !== -1 
                                ? `on ${userActivity.days[userActivity.messageCounts.indexOf(Math.max(...userActivity.messageCounts))]}`
                                : "messages (max)"}
                            </p>
                          </div>
                        </div>
                        
                        {/* Active Days */}
                        <div className="col-md-6 col-lg-3 mb-3">
                          <div className="p-3 bg-light rounded-3 border h-100">
                            <div className="d-flex align-items-center mb-2">
                              <div className="rounded-circle bg-info p-2 me-2">
                                <i className="fas fa-calendar-check text-white"></i>
                              </div>
                              <h6 className="mb-0">Active Days</h6>
                            </div>
                            <h3 className="mb-1">
                              {userActivity.messageCounts.filter(count => count > 0).length}
                            </h3>
                            <p className="text-muted small mb-0">
                              out of {userActivity.days.length} days
                            </p>
                          </div>
                        </div>
                        
                        {/* Activity Trend */}
                        <div className="col-md-6 col-lg-3 mb-3">
                          <div className="p-3 bg-light rounded-3 border h-100">
                            <div className="d-flex align-items-center mb-2">
                              <div className="rounded-circle bg-warning p-2 me-2">
                                <i className="fas fa-chart-line text-white"></i>
                              </div>
                              <h6 className="mb-0">Activity Trend</h6>
                            </div>
                            {(() => {
                              // Calculate trend by comparing first half to second half
                              const half = Math.floor(userActivity.messageCounts.length / 2);
                              const firstHalf = userActivity.messageCounts.slice(0, half).reduce((a, b) => a + b, 0);
                              const secondHalf = userActivity.messageCounts.slice(half).reduce((a, b) => a + b, 0);
                              const trend = secondHalf - firstHalf;
                              const trendPercent = firstHalf === 0 
                                ? secondHalf > 0 ? 100 : 0 
                                : Math.round((trend / firstHalf) * 100);
                              
                              return (
                                <>
                                  <div className="d-flex align-items-center">
                                    <h3 className="mb-0 me-2">{trendPercent}%</h3>
                                    {trend > 0 ? (
                                      <i className="fas fa-arrow-up text-success"></i>
                                    ) : trend < 0 ? (
                                      <i className="fas fa-arrow-down text-danger"></i>
                                    ) : (
                                      <i className="fas fa-minus text-muted"></i>
                                    )}
                                  </div>
                                  <p className="text-muted small mb-0">
                                    {trend > 0 ? "increasing" : trend < 0 ? "decreasing" : "stable"} activity
                                  </p>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                      
                      {/* Insights Section */}
                      <div className="mt-3 p-3 border rounded-3 bg-white">
                        <h6 className="mb-3">
                          <i className="fas fa-lightbulb text-warning me-2"></i>
                          Communication Insights
                        </h6>
                        <div className="d-flex flex-wrap gap-2">
                          {userActivity.messageCounts.filter(count => count > 0).length < userActivity.days.length / 3 && (
                            <div className="badge bg-danger p-2">
                              <i className="fas fa-exclamation-circle me-1"></i>
                              Low Engagement
                            </div>
                          )}
                          
                          {userActivity.messageCounts.filter(count => count === 0).length >= 7 && (
                            <div className="badge bg-warning text-dark p-2">
                              <i className="fas fa-pause-circle me-1"></i>
                              Extended Inactivity
                            </div>
                          )}
                          
                          {Math.max(...userActivity.messageCounts) > 50 && (
                            <div className="badge bg-primary p-2">
                              <i className="fas fa-comment-dots me-1"></i>
                              High Volume
                            </div>
                          )}
                          
                          {userActivity.messageCounts.filter(count => count > 0).length > userActivity.days.length * 0.7 && (
                            <div className="badge bg-success p-2">
                              <i className="fas fa-users me-1"></i>
                              Consistent Contributor
                            </div>
                          )}
                        </div>
                        
                        <p className="mt-3 mb-0 text-muted">
                          {(() => {
                            const activeDays = userActivity.messageCounts.filter(count => count > 0).length;
                            const avgMessages = (userActivity.totalMessages / (userActivity.days.length || 1)).toFixed(1);
                            
                            if (activeDays < userActivity.days.length / 3) {
                              return `This user has been active only ${activeDays} days in the last month with an average of ${avgMessages} messages per day. Consider increasing engagement.`;
                            } else if (userActivity.messageCounts.filter(count => count === 0).length >= 7) {
                              return `Despite periods of inactivity, this user maintains an average of ${avgMessages} messages when active. There may be opportunity to improve consistency.`;
                            } else if (activeDays > userActivity.days.length * 0.7) {
                              return `This user is highly active with consistent communication across ${activeDays} days this month, averaging ${avgMessages} messages daily.`;
                            } else {
                              return `This user shows moderate engagement with activity on ${activeDays} days this month and an average of ${avgMessages} messages per day.`;
                            }
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </Tab>
            </Tabs>
          ) : (
            <p>No user selected</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <button className="btn btn-secondary" onClick={handleCloseModal}>
            Close
          </button>
          {selectedUser && !selectedUser.isDisable ? (
            <button
              className="btn btn-danger"
              onClick={() => {
                handleCloseModal();
                toggleUserStatus(selectedUser._id, false);
              }}
              disabled={selectedUser.isAdmin}
            >
              Disable User
            </button>
          ) : (
            selectedUser && (
              <button
                className="btn btn-success"
                onClick={() => {
                  handleCloseModal();
                  toggleUserStatus(selectedUser._id, true);
                }}
              >
                Enable User
              </button>
            )
          )}
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default UserManagement;
