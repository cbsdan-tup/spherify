import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
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
import { Line } from "react-chartjs-2";
import Swal from "sweetalert2";

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

const UserDetailsModal = ({ show, onHide, userId, refreshList = () => {} }) => {
  const token = useSelector((state) => state.auth.token);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userTeams, setUserTeams] = useState([]);
  const [userActivity, setUserActivity] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Fetch user data when modal opens or userId changes
  useEffect(() => {
    if (show && userId) {
      fetchUserDetails();
    }
  }, [show, userId]);

  // Reset state when modal closes
  useEffect(() => {
    if (!show) {
      setSelectedUser(null);
      setUserTeams([]);
      setUserActivity({});
    }
  }, [show]);

  const fetchUserDetails = async () => {
    try {
      setIsLoading(true);

      // Fetch user details
      const [userDetailsRes, teamsRes, chatStatsRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API}/user/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${import.meta.env.VITE_API}/getTeamByUser/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(
          `${import.meta.env.VITE_API}/getUserChatStatistics/${userId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        ),
      ]);

      if (userDetailsRes.data.success) {
        setSelectedUser(userDetailsRes.data.user);
      }

      setUserTeams(teamsRes?.data || []);

      if (chatStatsRes.data.success) {
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
      setUserActivity({
        days: [],
        messageCounts: [],
        totalMessages: 0,
      });
    }
  };

  // Toggle user status (enable/disable)
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

          onHide();
          refreshList();
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

  // Prepare chart data
  const activityChartData = {
    labels: userActivity.days || [],
    datasets: [
      {
        label: "Messages",
        data: userActivity.messageCounts || [],
        borderColor: "rgb(53, 162, 235)",
        backgroundColor: "rgba(53, 162, 235, 0.5)",
        tension: 0.3,
      },
    ],
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      backdrop="static"
      aria-labelledby="user-details-modal"
      className="user-details-modal"
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
                                  selectedUser.isDisable ? "danger" : "success"
                                }
                              >
                                {selectedUser.isDisable ? "Disabled" : "Active"}
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
              <div className="row d-flex flex-column" style={{ padding: "1rem"}}>
                <h5 className="mt-3">Risk Assessment</h5>
                <Badge
                  bg={
                    selectedUser.disableCount > 3
                      ? "danger"
                      : selectedUser.disableCount > 1
                      ? "warning"
                      : "success"
                  }
                  className="p-4 py-3 text-white"
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
                                  memberInfo?.isAdmin ? "primary" : "secondary"
                                }
                                className="text-white"
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
                                <Badge bg="warning" text="white" >
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
                  <span>Login History</span>
                  <span className="badge bg-info">
                    Total Logins: {selectedUser.loginHistory?.length || 0}
                  </span>
                </div>
                <div className="card-body">
                  {selectedUser.loginHistory?.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead className="table-light">
                          <tr>
                            <th>Date & Time</th>
                            <th>IP Address</th>
                            <th>Device Info</th>
                            <th>Location</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedUser.loginHistory
                            .sort(
                              (a, b) =>
                                new Date(b.timestamp) - new Date(a.timestamp)
                            )
                            .slice(0, 10) // Show only the most recent 10 logins
                            .map((login, index) => (
                              <tr key={index}>
                                <td>
                                  {new Date(login.timestamp).toLocaleString()}
                                  {index === 0 && (
                                    <span className="ms-2 badge bg-success">
                                      Latest
                                    </span>
                                  )}
                                </td>
                                <td>{login.ipAddress}</td>
                                <td>
                                  <span
                                    className="text-truncate d-inline-block"
                                    style={{ maxWidth: "200px" }}
                                    title={login.deviceInfo}
                                  >
                                    {login.deviceInfo}
                                  </span>
                                </td>
                                <td>{login.location || "Unknown"}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="alert alert-info text-center">
                      No login history available for this user.
                    </div>
                  )}
                </div>
              </div>

              {/* Login Activity Map - NEW ADDITION */}
              {selectedUser.loginHistory?.length > 0 && (
                <div className="card mb-4">
                  <div className="card-header bg-light">
                    <h5 className="mb-0">
                      <i className="fas fa-map-marker-alt me-2 text-danger"></i>
                      Login Activity Analysis
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      {/* Most Recent Login */}
                      <div className="col-md-6 col-lg-4 mb-3">
                        <div className="p-3 bg-light rounded-3 border h-100 d-flex" style={{flexDirection: "column", gap: "1rem", alignItems: "center"}}>
                          <div className="d-flex align-items-center mb-2">
                            <div className="rounded-circle bg-success p-2 me-2">
                              <i className="fas fa-clock text-white"></i>
                            </div>
                            <h6 className="mb-0">Last Login</h6>
                          </div>
                          {selectedUser.loginHistory.length > 0 && (
                            <>
                              <h3 className="mb-1">
                                {new Date(
                                  selectedUser.loginHistory.sort(
                                    (a, b) =>
                                      new Date(b.timestamp) -
                                      new Date(a.timestamp)
                                  )[0]?.timestamp
                                ).toLocaleDateString()}
                              </h3>
                              <p className="text-muted small mb-0">
                                {new Date(
                                  selectedUser.loginHistory.sort(
                                    (a, b) =>
                                      new Date(b.timestamp) -
                                      new Date(a.timestamp)
                                  )[0]?.timestamp
                                ).toLocaleTimeString()}
                              </p>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Device Diversity */}
                      <div className="col-md-6 col-lg-4 mb-3">
                        <div className="p-3 bg-light rounded-3 border h-100 d-flex" style={{flexDirection: "column", gap: "1rem", alignItems: "center"}}>
                          <div className="d-flex align-items-center mb-2">
                            <div className="rounded-circle bg-primary p-2 me-2">
                              <i className="fas fa-laptop text-white"></i>
                            </div>
                            <h6 className="mb-0">Different Devices</h6>
                          </div>
                          <h3 className="mb-1">
                            {
                              new Set(
                                selectedUser.loginHistory.map((login) =>
                                  login.deviceInfo?.includes("Mobile")
                                    ? "Mobile"
                                    : "Desktop"
                                )
                              ).size
                            }
                          </h3>
                          <p className="text-muted small mb-0">
                            device types detected
                          </p>
                        </div>
                      </div>

                      {/* Login Frequency */}
                      <div className="col-md-6 col-lg-4 mb-3">
                        <div className="p-3 bg-light rounded-3 border h-100 d-flex" style={{flexDirection: "column", gap: "1rem", alignItems: "center"}}>
                          <div className="d-flex align-items-center mb-2">
                            <div className="rounded-circle bg-warning p-2 me-2">
                              <i className="fas fa-chart-line text-white"></i>
                            </div>
                            <h6 className="mb-0">Login Frequency</h6>
                          </div>
                          <h3 className="mb-1">
                            {selectedUser.loginHistory.length > 0
                              ? (
                                  selectedUser.loginHistory.length /
                                  Math.max(
                                    1,
                                    Math.ceil(
                                      (new Date() -
                                        new Date(selectedUser.createdAt)) /
                                        (1000 * 60 * 60 * 24 * 30)
                                    )
                                  )
                                ).toFixed(1)
                              : "0"}
                          </h3>
                          <p className="text-muted small mb-0">
                            logins per month
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

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
                      No chat activity data available for this user in the last
                      30 days.
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
                        <div className="p-3 bg-light rounded-3 border h-100 d-flex" style={{flexDirection: "column", gap: "1rem", alignItems: "center"}}>
                          <div className="d-flex align-items-center mb-2">
                            <div className="rounded-circle bg-primary p-2 me-2">
                              <i className="fas fa-calculator text-white"></i>
                            </div>
                            <h6 className="mb-0">Daily Average</h6>
                          </div>
                          <h3 className="mb-1">
                            {(
                              userActivity.totalMessages /
                              (userActivity.days.length || 1)
                            ).toFixed(1)}
                          </h3>
                          <p className="text-muted small mb-0">
                            messages per day
                          </p>
                        </div>
                      </div>

                      {/* Peak Activity */}
                      <div className="col-md-6 col-lg-3 mb-3">
                        <div className="p-3 bg-light rounded-3 border h-100 d-flex" style={{flexDirection: "column", gap: "1rem", alignItems: "center"}}>
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
                            {userActivity.messageCounts.indexOf(
                              Math.max(...userActivity.messageCounts)
                            ) !== -1
                              ? `on ${
                                  userActivity.days[
                                    userActivity.messageCounts.indexOf(
                                      Math.max(...userActivity.messageCounts)
                                    )
                                  ]
                                }`
                              : "messages (max)"}
                          </p>
                        </div>
                      </div>

                      {/* Active Days */}
                      <div className="col-md-6 col-lg-3 mb-3">
                        <div className="p-3 bg-light rounded-3 border h-100 d-flex" style={{flexDirection: "column", gap: "1rem", alignItems: "center"}}>
                          <div className="d-flex align-items-center mb-2">
                            <div className="rounded-circle bg-info p-2 me-2">
                              <i className="fas fa-calendar-check text-white"></i>
                            </div>
                            <h6 className="mb-0">Active Days</h6>
                          </div>
                          <h3 className="mb-1">
                            {
                              userActivity.messageCounts.filter(
                                (count) => count > 0
                              ).length
                            }
                          </h3>
                          <p className="text-muted small mb-0">
                            out of {userActivity.days.length} days
                          </p>
                        </div>
                      </div>

                      {/* Activity Trend */}
                      <div className="col-md-6 col-lg-3 mb-3">
                        <div className="p-3 bg-light rounded-3 border h-100 d-flex" style={{flexDirection: "column", gap: "1rem", alignItems: "center"}}>
                          <div className="d-flex align-items-center mb-2">
                            <div className="rounded-circle bg-warning p-2 me-2">
                              <i className="fas fa-chart-line text-white"></i>
                            </div>
                            <h6 className="mb-0">Activity Trend</h6>
                          </div>
                          {(() => {
                            // Calculate trend by comparing first half to second half
                            const half = Math.floor(
                              userActivity.messageCounts.length / 2
                            );
                            const firstHalf = userActivity.messageCounts
                              .slice(0, half)
                              .reduce((a, b) => a + b, 0);
                            const secondHalf = userActivity.messageCounts
                              .slice(half)
                              .reduce((a, b) => a + b, 0);
                            const trend = secondHalf - firstHalf;
                            const trendPercent =
                              firstHalf === 0
                                ? secondHalf > 0
                                  ? 100
                                  : 0
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
                                  {trend > 0
                                    ? "increasing"
                                    : trend < 0
                                    ? "decreasing"
                                    : "stable"}{" "}
                                  activity
                                </p>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Insights Section */}
                    <div className="mt-3 p-3 border rounded-3 bg-white">
                      <h6 className="mb-3 d-flex" style={{gap: "0.5rem"}}>
                        <i className="fas fa-lightbulb text-warning me-2"></i>
                        <span>

                        Communication Insights
                        </span>
                      </h6>
                      <div className="d-flex flex-wrap" style={{gap: "0.5rem", color: "white"}}>
                        {userActivity.messageCounts.filter((count) => count > 0)
                          .length <
                          userActivity.days.length / 3 && (
                          <div className="badge bg-danger p-2 d-flex" style={{gap: "0.5rem"}}>
                            <i className="fas fa-exclamation-circle me-1"></i>
                            <span>
                            Low Engagement

                            </span>
                          </div>
                        )}

                        {userActivity.messageCounts.filter(
                          (count) => count === 0
                        ).length >= 7 && (
                          <div className="badge bg-warning text-white p-2 d-flex" style={{gap: "0.5rem"}}>
                            <i className="fas fa-pause-circle me-1"></i>
                            <span>
                            Extended Inactivity

                            </span>
                          </div>
                        )}

                        {Math.max(...userActivity.messageCounts) > 50 && (
                          <div className="badge bg-primary p-2 d-flex" style={{gap: "0.5rem"}}>
                            <i className="fas fa-comment-dots me-1"></i>
                            <span>
                            High Volume

                            </span>
                          </div>
                        )}

                        {userActivity.messageCounts.filter((count) => count > 0)
                          .length >
                          userActivity.days.length * 0.7 && (
                          <div className="badge bg-success p-2 d-flex" style={{gap: "0.5rem"}}>
                            <i className="fas fa-users me-1"></i>
                            <span>
                            Consistent Contributor

                            </span>
                          </div>
                        )}
                      </div>

                      <p className="mt-3 mb-0 text-muted">
                        {(() => {
                          const activeDays = userActivity.messageCounts.filter(
                            (count) => count > 0
                          ).length;
                          const avgMessages = (
                            userActivity.totalMessages /
                            (userActivity.days.length || 1)
                          ).toFixed(1);

                          if (activeDays < userActivity.days.length / 3) {
                            return `This user has been active only ${activeDays} days in the last month with an average of ${avgMessages} messages per day. Consider increasing engagement.`;
                          } else if (
                            userActivity.messageCounts.filter(
                              (count) => count === 0
                            ).length >= 7
                          ) {
                            return `Despite periods of inactivity, this user maintains an average of ${avgMessages} messages when active. There may be opportunity to improve consistency.`;
                          } else if (
                            activeDays >
                            userActivity.days.length * 0.7
                          ) {
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
        <button className="btn btn-secondary" onClick={onHide}>
          Close
        </button>
        {selectedUser && !selectedUser.isDisable ? (
          <button
            className="btn btn-danger"
            onClick={() => toggleUserStatus(selectedUser._id, false)}
            disabled={selectedUser.isAdmin}
          >
            Disable User
          </button>
        ) : (
          selectedUser && (
            <button
              className="btn btn-success"
              onClick={() => toggleUserStatus(selectedUser._id, true)}
            >
              Enable User
            </button>
          )
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default UserDetailsModal;
