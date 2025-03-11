import React, { useState, useEffect } from "react";
import { Modal, Button, Tabs, Tab, Pagination } from "react-bootstrap";
import { Pie } from "react-chartjs-2";
import { useSelector } from "react-redux";
import axios from "axios";
import moment from "moment";
import { errMsg, succesMsg } from "../../../utils/helper";
import Swal from "sweetalert2"; // Make sure to import SweetAlert2

const TeamHistory = ({ show, onHide, teamId, isCurrentUserAdmin }) => {
  const [loading, setLoading] = useState(true);
  const [requestHistory, setRequestHistory] = useState(null);
  const [applicationHistory, setApplicationHistory] = useState(null);
  const [activeTab, setActiveTab] = useState("requests");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isAdminOrLeader, setIsAdminOrLeader] = useState(
    isCurrentUserAdmin || false
  );
  const [memberHistory, setMemberHistory] = useState(null);
  const [sortField, setSortField] = useState("actionDate");
  const [sortDirection, setSortDirection] = useState("desc"); // "asc" or "desc"
  const [searchTerm, setSearchTerm] = useState("");

  const authState = useSelector((state) => state.auth);

  // Check if current user is admin or leader of the team
  useEffect(() => {
    const checkUserRole = async () => {
      // If already know it's admin, no need to check
      if (isCurrentUserAdmin) {
        setIsAdminOrLeader(true);
        return;
      }

      if (!show || !teamId) return;

      try {
        const token = authState.token;
        const userId = authState.user._id;

        const config = {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        };

        const teamResponse = await axios.get(
          `${import.meta.env.VITE_API}/getTeam/${teamId}`,
          config
        );

        const members = teamResponse.data.team.members;
        const userMember = members.find(
          (m) => m.user._id === userId || m.user === userId
        );

        setIsAdminOrLeader(
          userMember && (userMember.isAdmin || userMember.role === "leader")
        );
      } catch (err) {
        console.error("Error checking user role:", err);
        setIsAdminOrLeader(false);
      }
    };

    checkUserRole();
  }, [teamId, show, authState.token, authState.user._id, isCurrentUserAdmin]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!show || !teamId) return;

        setLoading(true);

        const token = authState.token;
        const config = {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        };

        // Fetch team request history
        const requestResponse = await axios.get(
          `${import.meta.env.VITE_API}/getTeamRequestHistory/${teamId}`,
          config
        );

        // Process the request history data
        if (requestResponse.data) {
          const requests = requestResponse.data.requestHistory || [];
          const accepted = requests.filter(
            (req) => req.status === "accepted"
          ).length;
          const pending = requests.filter(
            (req) => req.status === "pending"
          ).length;
          const declined = requests.filter(
            (req) => req.status === "denied"
          ).length;

          // Sort requests by most recent (updatedAt or invitedAt)
          const sortedRequests = requests.sort((a, b) => {
            const dateA = new Date(a.updatedAt || a.invitedAt);
            const dateB = new Date(a.updatedAt || a.invitedAt);
            return dateB - dateA;
          });

          setRequestHistory({
            accepted,
            pending,
            declined,
            acceptanceRate:
              requests.length > 0
                ? ((accepted / requests.length) * 100).toFixed(1)
                : 0,
            requests: sortedRequests.map((request) => ({
              id: request._id,
              inviterName:
                request.inviter?.firstName && request.inviter?.lastName
                  ? `${request.inviter.firstName} ${request.inviter.lastName}`
                  : "Unknown",
              inviterEmail: request.inviter?.email,
              inviteeName:
                request.invitee?.firstName && request.invitee?.lastName
                  ? `${request.invitee.firstName} ${request.invitee.lastName}`
                  : "Unknown",
              inviteeEmail: request.invitee?.email,
              status: request.status,
              invitedDate: moment(request.invitedAt).format(
                "MMM DD, YYYY, h:mm a"
              ),
              updatedAt: request.updatedAt
                ? moment(request.updatedAt).format("MMM DD, YYYY, h:mm a")
                : null,
              responseTime: request.updatedAt
                ? moment
                    .duration(
                      moment(request.updatedAt).diff(moment(request.invitedAt))
                    )
                    .humanize()
                : null,
            })),
          });
        } else {
          // Fallback if no data is returned
          setRequestHistory({
            accepted: 0,
            pending: 0,
            declined: 0,
            acceptanceRate: 0,
            requests: [],
          });
        }

        // Fetch team applications
        const applicationResponse = await axios.get(
          `${import.meta.env.VITE_API}/getTeamApplications/${teamId}`,
          config
        );

        // Process application data
        if (applicationResponse.data && applicationResponse.data.data) {
          const applications = applicationResponse.data.data || [];
          const accepted = applications.filter(
            (app) => app.status === "accepted"
          ).length;
          const pending = applications.filter(
            (app) => app.status === "pending"
          ).length;
          const denied = applications.filter(
            (app) => app.status === "denied"
          ).length;
          const cancelled = applications.filter(
            (app) => app.status === "cancelled"
          ).length;

          // Sort applications by most recent (updatedAt or appliedAt)
          const sortedApplications = applications.sort((a, b) => {
            const dateA = new Date(a.actionTakenAt || a.appliedAt);
            const dateB = new Date(b.actionTakenAt || b.appliedAt);
            return dateB - dateA;
          });

          setApplicationHistory({
            accepted,
            pending,
            denied,
            cancelled,
            acceptanceRate:
              applications.length > 0
                ? ((accepted / applications.length) * 100).toFixed(1)
                : 0,
            applications: sortedApplications,
          });
        } else {
          // Fallback if no data is returned
          setApplicationHistory({
            accepted: 0,
            pending: 0,
            denied: 0,
            cancelled: 0,
            acceptanceRate: 0,
            applications: [],
          });
        }

        // Fetch team member history
        const memberHistoryResponse = await axios.get(
          `${import.meta.env.VITE_API}/getTeamMemberHistory/${teamId}`,
          config
        );

        if (memberHistoryResponse.data && memberHistoryResponse.data.success) {
          const historyData = memberHistoryResponse.data.memberHistory || [];

          // Sort by most recent activity (join or leave date)
          const sortedHistory = historyData.sort((a, b) => {
            const dateA = new Date(a.actionDate);
            const dateB = new Date(b.actionDate);
            return dateB - dateA;
          });

          setMemberHistory({
            totalJoined: historyData.filter((h) => h.action === "joined")
              .length,
            totalLeft: historyData.filter((h) => h.action === "left").length,
            totalRejoined: historyData.filter((h) => h.action === "rejoined")
              .length,
            history: sortedHistory,
          });
        } else {
          setMemberHistory({
            totalJoined: 0,
            totalLeft: 0,
            totalRejoined: 0,
            history: [],
          });
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        errMsg(
          "Error loading data: " + (err.response?.data?.message || err.message)
        );
        setLoading(false);

        // Fallback if error
        setRequestHistory({
          accepted: 0,
          pending: 0,
          declined: 0,
          acceptanceRate: 0,
          requests: [],
        });

        setApplicationHistory({
          accepted: 0,
          pending: 0,
          denied: 0,
          cancelled: 0,
          acceptanceRate: 0,
          applications: [],
        });

        setMemberHistory({
          totalJoined: 0,
          totalLeft: 0,
          totalRejoined: 0,
          history: [],
        });
      }
    };

    fetchData();
  }, [teamId, show, authState.token]);

  // Enhanced application status update handler with SweetAlert2 confirmation
  const handleUpdateApplicationStatus = async (applicationId, status) => {
    try {
      const token = authState.token;
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      // Show beautiful confirmation for certain actions
      if (status === "denied" || status === "cancelled") {
        const result = await Swal.fire({
          title: `${status === "denied" ? "Deny" : "Cancel"} Application?`,
          text: `Are you sure you want to ${
            status === "denied" ? "deny" : "cancel"
          } this application?`,
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: status === "denied" ? "#d33" : "#3085d6",
          cancelButtonColor: "#6c757d",
          confirmButtonText:
            status === "denied" ? "Yes, deny it!" : "Yes, cancel it!",
          cancelButtonText: "No, keep it",
          backdrop: true,
          allowOutsideClick: () => !Swal.isLoading(),
        });

        if (!result.isConfirmed) {
          return; // User canceled the action
        }
      } else if (status === "accepted") {
        // Confirmation for accepting an application
        const result = await Swal.fire({
          title: "Accept Application?",
          text: "Are you sure you want to accept this application? The user will join your team.",
          icon: "question",
          showCancelButton: true,
          confirmButtonColor: "#28a745",
          cancelButtonColor: "#6c757d",
          confirmButtonText: "Yes, accept!",
          cancelButtonText: "Cancel",
          backdrop: true,
          allowOutsideClick: () => !Swal.isLoading(),
        });

        if (!result.isConfirmed) {
          return; // User canceled the action
        }
      }

      // Show loading state
      Swal.fire({
        title: "Processing...",
        text: "Please wait while we update the application status",
        allowOutsideClick: false,
        allowEscapeKey: false,
        allowEnterKey: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      await axios.patch(
        `${import.meta.env.VITE_API}/updateApplicationStatus/${applicationId}`,
        { status },
        config
      );

      // Close loading and show success
      Swal.fire({
        icon: "success",
        title: "Success!",
        text: `Application ${status} successfully`,
        timer: 2000,
        timerProgressBar: true,
      });

      // Refresh application data
      const response = await axios.get(
        `${import.meta.env.VITE_API}/getTeamApplications/${teamId}`,
        config
      );

      if (response.data && response.data.data) {
        const applications = response.data.data || [];
        const accepted = applications.filter(
          (app) => app.status === "accepted"
        ).length;
        const pending = applications.filter(
          (app) => app.status === "pending"
        ).length;
        const denied = applications.filter(
          (app) => app.status === "denied"
        ).length;
        const cancelled = applications.filter(
          (app) => app.status === "cancelled"
        ).length;

        // Sort applications
        const sortedApplications = applications.sort((a, b) => {
          const dateA = new Date(a.actionTakenAt || a.appliedAt);
          const dateB = new Date(b.actionTakenAt || b.appliedAt);
          return dateB - dateA;
        });

        setApplicationHistory({
          accepted,
          pending,
          denied,
          cancelled,
          acceptanceRate:
            applications.length > 0
              ? ((accepted / applications.length) * 100).toFixed(1)
              : 0,
          applications: sortedApplications,
        });
      }
    } catch (error) {
      console.error("Error updating application status:", error);
      Swal.fire({
        icon: "error",
        title: "Error!",
        text: error.response?.data?.message || "Failed to update application",
      });
    }
  };

  // Handle application deletion with SweetAlert2
  const handleDeleteApplication = async (applicationId) => {
    try {
      const result = await Swal.fire({
        title: "Delete Application?",
        text: "Are you sure you want to permanently delete this application? This action cannot be undone.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Yes, delete it!",
        cancelButtonText: "Cancel",
        focusCancel: true,
      });

      if (!result.isConfirmed) {
        return; // User canceled the deletion
      }

      const token = authState.token;
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      // Show loading state
      Swal.fire({
        title: "Deleting...",
        text: "Please wait while we delete the application",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      await axios.delete(
        `${import.meta.env.VITE_API}/deleteApplication/${applicationId}`,
        config
      );

      // Success message
      Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: "Application has been deleted successfully",
        timer: 2000,
        timerProgressBar: true,
      });

      // Refresh application data
      const response = await axios.get(
        `${import.meta.env.VITE_API}/getTeamApplications/${teamId}`,
        config
      );

      if (response.data && response.data.data) {
        const applications = response.data.data || [];
        const updatedApplicationHistory = { ...applicationHistory };
        updatedApplicationHistory.applications = applications.sort((a, b) => {
          const dateA = new Date(a.actionTakenAt || a.appliedAt);
          const dateB = new Date(b.actionTakenAt || b.appliedAt);
          return dateB - dateA;
        });

        setApplicationHistory(updatedApplicationHistory);
      }
    } catch (error) {
      console.error("Error deleting application:", error);
      Swal.fire({
        icon: "error",
        title: "Error!",
        text: error.response?.data?.message || "Failed to delete application",
      });
    }
  };

  // Handle sort changes when a column header is clicked
  const handleSort = (field) => {
    // If clicking the same field, toggle direction
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // If clicking a new field, set it as the sort field and default to descending
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Sort function for all data types
  const sortData = (data, field, direction) => {
    return [...data].sort((a, b) => {
      let aValue, bValue;

      // Extract the correct values based on the field
      switch (field) {
        case "invitedDate":
          aValue = new Date(a.invitedDate || a.invitedAt);
          bValue = new Date(b.invitedDate || b.invitedAt);
          break;
        case "updatedAt":
          aValue = a.updatedAt
            ? new Date(a.updatedAt)
            : new Date(a.invitedAt || a.invitedDate);
          bValue = b.updatedAt
            ? new Date(b.updatedAt)
            : new Date(b.invitedAt || b.invitedDate);
          break;
        case "appliedAt":
          aValue = new Date(a.appliedAt);
          bValue = new Date(b.appliedAt);
          break;
        case "actionTakenAt":
          aValue = a.actionTakenAt
            ? new Date(a.actionTakenAt)
            : new Date(a.appliedAt);
          bValue = b.actionTakenAt
            ? new Date(b.actionTakenAt)
            : new Date(b.appliedAt);
          break;
        case "actionDate":
          aValue = new Date(a.actionDate);
          bValue = new Date(b.actionDate);
          break;
        case "name":
          aValue =
            a.inviteeName ||
            a.inviterName ||
            a.applicant?.firstName + " " + a.applicant?.lastName ||
            a.user?.firstName + " " + a.user?.lastName ||
            "";
          bValue =
            b.inviteeName ||
            b.inviterName ||
            b.applicant?.firstName + " " + b.applicant?.lastName ||
            b.user?.firstName + " " + b.user?.lastName ||
            "";
          break;
        case "status":
          aValue = a.status || a.action;
          bValue = b.status || b.action;
          break;
        default:
          // Default case - try to access field directly
          aValue = a[field];
          bValue = b[field];
      }

      // Compare based on data type
      if (aValue instanceof Date && bValue instanceof Date) {
        return direction === "asc" ? aValue - bValue : bValue - aValue;
      } else if (typeof aValue === "string" && typeof bValue === "string") {
        return direction === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        // For any other type of comparison
        if (aValue < bValue) return direction === "asc" ? -1 : 1;
        if (aValue > bValue) return direction === "asc" ? 1 : -1;
        return 0;
      }
    });
  };

  // Filter data based on search term
  const filterBySearch = (data) => {
    if (!searchTerm.trim()) return data;
    
    const term = searchTerm.toLowerCase().trim();
    
    if (activeTab === "requests") {
      return data.filter(request => 
        (request.inviteeName?.toLowerCase().includes(term)) ||
        (request.inviteeEmail?.toLowerCase().includes(term)) ||
        (request.inviterName?.toLowerCase().includes(term)) ||
        (request.inviterEmail?.toLowerCase().includes(term))
      );
    } else if (activeTab === "applications") {
      return data.filter(app => 
        (app.applicant?.firstName?.toLowerCase().includes(term)) ||
        (app.applicant?.lastName?.toLowerCase().includes(term)) ||
        (app.applicant?.email?.toLowerCase().includes(term))
      );
    } else if (activeTab === "members") {
      return data.filter(item => 
        (item.user?.firstName?.toLowerCase().includes(term)) ||
        (item.user?.lastName?.toLowerCase().includes(term)) ||
        (item.user?.email?.toLowerCase().includes(term))
      );
    }
    
    return data;
  };

  // Get current items for pagination with sorting and searching applied
  const getCurrentItems = () => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    
    let sortedItems;
    
    if (activeTab === "requests") {
      // First sort then filter by search
      sortedItems = sortData(
        requestHistory?.requests || [],
        sortField === "actionDate" ? "invitedDate" : sortField,
        sortDirection
      );
      
      // Apply search filter
      sortedItems = filterBySearch(sortedItems);
      
      return sortedItems.slice(indexOfFirstItem, indexOfLastItem);
    } else if (activeTab === "applications") {
      sortedItems = sortData(
        applicationHistory?.applications || [],
        sortField === "actionDate" ? "appliedAt" : sortField,
        sortDirection
      );
      
      // Apply search filter
      sortedItems = filterBySearch(sortedItems);
      
      return sortedItems.slice(indexOfFirstItem, indexOfLastItem);
    } else if (activeTab === "members") {
      sortedItems = sortData(
        memberHistory?.history || [],
        sortField,
        sortDirection
      );
      
      // Apply search filter
      sortedItems = filterBySearch(sortedItems);
      
      return sortedItems.slice(indexOfFirstItem, indexOfLastItem);
    }
    
    return [];
  };

  // Reset search term and page when tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSearchTerm("");
  };

  // Calculate total filtered items for pagination
  const totalFilteredItems = () => {
    if (activeTab === "requests") {
      return filterBySearch(requestHistory?.requests || []).length;
    } else if (activeTab === "applications") {
      return filterBySearch(applicationHistory?.applications || []).length;
    } else if (activeTab === "members") {
      return filterBySearch(memberHistory?.history || []).length;
    }
    return 0;
  };

  // Calculate total pages based on filtered items
  const totalPages = Math.ceil(totalFilteredItems() / itemsPerPage);

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page on new search
  };

  // Render search bar
  const renderSearchBar = () => {
    return (
      <div className="mb-3">
        <div className="input-group">
          <span className="input-group-text">
            <i className="fas fa-search"></i>
          </span>
          <input
            type="text"
            className="form-control"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
          {searchTerm && (
            <button 
              className="btn btn-outline-secondary" 
              type="button"
              onClick={() => setSearchTerm("")}
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>
        {searchTerm && (
          <small className="text-muted">
            Found {totalFilteredItems()} results matching "{searchTerm}"
          </small>
        )}
      </div>
    );
  };

  // Function to render sort indicator
  const renderSortIndicator = (field) => {
    if (sortField === field) {
      return (
        <i
          className={`fas fa-sort-${
            sortDirection === "asc" ? "up" : "down"
          } ms-1`}
        ></i>
      );
    }
    return (
      <i className="fas fa-sort ms-1 text-muted" style={{ opacity: 0.3 }}></i>
    );
  };

  // Prepare request history chart data
  const requestChartData = {
    labels: ["Accepted", "Pending", "Declined"],
    datasets: [
      {
        data: [
          requestHistory?.accepted || 0,
          requestHistory?.pending || 0,
          requestHistory?.declined || 0,
        ],
        backgroundColor: [
          "rgba(46, 204, 113, 0.8)", // Green for accepted
          "rgba(241, 196, 15, 0.8)", // Yellow for pending
          "rgba(231, 76, 60, 0.8)", // Red for declined
        ],
        borderColor: [
          "rgba(46, 204, 113, 1)",
          "rgba(241, 196, 15, 1)",
          "rgba(231, 76, 60, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };

  // Prepare application chart data
  const applicationChartData = {
    labels: ["Accepted", "Pending", "Denied", "Cancelled"],
    datasets: [
      {
        data: [
          applicationHistory?.accepted || 0,
          applicationHistory?.pending || 0,
          applicationHistory?.denied || 0,
          applicationHistory?.cancelled || 0,
        ],
        backgroundColor: [
          "rgba(46, 204, 113, 0.8)", // Green for accepted
          "rgba(241, 196, 15, 0.8)", // Yellow for pending
          "rgba(231, 76, 60, 0.8)", // Red for denied
          "rgba(149, 165, 166, 0.8)", // Grey for cancelled
        ],
        borderColor: [
          "rgba(46, 204, 113, 1)",
          "rgba(241, 196, 15, 1)",
          "rgba(231, 76, 60, 1)",
          "rgba(149, 165, 166, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };

  // Prepare member history chart data
  const memberChartData = {
    labels: ["Joined", "Left", "Rejoined"],
    datasets: [
      {
        data: [
          memberHistory?.totalJoined || 0,
          memberHistory?.totalLeft || 0,
          memberHistory?.totalRejoined || 0,
        ],
        backgroundColor: [
          "rgba(46, 204, 113, 0.8)", // Green for joined
          "rgba(231, 76, 60, 0.8)", // Red for left
          "rgba(52, 152, 219, 0.8)", // Blue for rejoined
        ],
        borderColor: [
          "rgba(46, 204, 113, 1)",
          "rgba(231, 76, 60, 1)",
          "rgba(52, 152, 219, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      centered
      className="team-request-history-modal"
    >
      <Modal.Header closeButton>
        <Modal.Title>Team History</Modal.Title>
      </Modal.Header>
      <Modal.Body
        style={{
          flexDirection: "column",
          alignItems: "unset",
          justifyContent: "unset",
          gap: "0.5rem"
        }}
      >
        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="mt-2">Loading history...</p>
          </div>
        ) : (
          <>
            <Tabs
              id="team-history-tabs"
              activeKey={activeTab}
              onSelect={handleTabChange}
              className="mb-3"
              style={{paddingTop: "0.5rem"}}
            >
              <Tab eventKey="requests" title="Team Requests">
                <div className="row">
                  <div className="col-md-12 p-0">
                    <div
                      className="card h-100"
                      style={{ border: "none", outline: "none" }}
                    >
                      <div className="card-body" style={{paddingTop: "0"}}>
                        <h5 className="card-title">Team Requests</h5>
                        {renderSearchBar()}
                        {requestHistory?.requests?.length > 0 ? (
                          <>
                            <div className="table-responsive">
                              <table className="table table-hover">
                                <thead>
                                  <tr>
                                    <th
                                      onClick={() => handleSort("name")}
                                      style={{ cursor: "pointer" }}
                                    >
                                      Invitee {renderSortIndicator("name")}
                                    </th>
                                    <th>Invited By</th>
                                    <th
                                      onClick={() => handleSort("status")}
                                      style={{ cursor: "pointer" }}
                                    >
                                      Status {renderSortIndicator("status")}
                                    </th>
                                    <th
                                      onClick={() => handleSort("invitedDate")}
                                      style={{ cursor: "pointer" }}
                                    >
                                      Date {renderSortIndicator("invitedDate")}
                                    </th>
                                    <th
                                      onClick={() => handleSort("updatedAt")}
                                      style={{ cursor: "pointer" }}
                                    >
                                      Updated {renderSortIndicator("updatedAt")}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {getCurrentItems().map((request) => (
                                    <tr key={request.id}>
                                      <td title={request?.inviteeEmail}>{request.inviteeName}</td>
                                      <td title={request?.inviterEmail}>{request.inviterName}</td>
                                      <td>
                                        <span
                                          className={`badge text-white ${
                                            request.status === "accepted"
                                              ? "bg-success"
                                              : request.status === "pending"
                                              ? "bg-warning"
                                              : "bg-danger"
                                          }`}
                                        >
                                          {request.status}
                                        </span>
                                      </td>
                                      <td>{request.invitedDate}</td>
                                      <td>{request.updatedAt || "-"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {totalPages > 1 && (
                              <div className="d-flex justify-content-center mt-3">
                                <Pagination>
                                  <Pagination.First
                                    onClick={() => paginate(1)}
                                    disabled={currentPage === 1}
                                  />
                                  <Pagination.Prev
                                    onClick={() => paginate(currentPage - 1)}
                                    disabled={currentPage === 1}
                                  />

                                  {[...Array(totalPages).keys()].map(
                                    (number) => (
                                      <Pagination.Item
                                        key={number + 1}
                                        active={number + 1 === currentPage}
                                        onClick={() => paginate(number + 1)}
                                      >
                                        {number + 1}
                                      </Pagination.Item>
                                    )
                                  )}

                                  <Pagination.Next
                                    onClick={() => paginate(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                  />
                                  <Pagination.Last
                                    onClick={() => paginate(totalPages)}
                                    disabled={currentPage === totalPages}
                                  />
                                </Pagination>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-muted mb-0">
                              No request history available
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Tab>

              <Tab eventKey="applications" title="Team Applications">
                <div className="row">
                  <div className="col-md-12 p-0">
                    <div
                      className="card h-100"
                      style={{ border: "none", outline: "none" }}
                    >
                      <div className="card-body" style={{paddingTop: "0"}}>
                        <h5
                          className="card-title"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <span>Team Applications</span>
                          {isAdminOrLeader && (
                            <span className="ms-2 badge bg-primary text-white">
                              Admin Mode
                            </span>
                          )}
                        </h5>
                        {renderSearchBar()}
                        {applicationHistory?.applications?.length > 0 ? (
                          <>
                            <div className="table-responsive">
                              <table className="table table-hover">
                                <thead>
                                  <tr>
                                    <th
                                      onClick={() => handleSort("name")}
                                      style={{ cursor: "pointer" }}
                                    >
                                      Applicant {renderSortIndicator("name")}
                                    </th>
                                    <th
                                      onClick={() => handleSort("status")}
                                      style={{ cursor: "pointer" }}
                                    >
                                      Status {renderSortIndicator("status")}
                                    </th>
                                    <th
                                      onClick={() => handleSort("appliedAt")}
                                      style={{ cursor: "pointer" }}
                                    >
                                      Applied Date{" "}
                                      {renderSortIndicator("appliedAt")}
                                    </th>
                                    <th
                                      onClick={() =>
                                        handleSort("actionTakenAt")
                                      }
                                      style={{ cursor: "pointer" }}
                                    >
                                      Updated{" "}
                                      {renderSortIndicator("actionTakenAt")}
                                    </th>
                                    {isAdminOrLeader && <th>Actions</th>}
                                  </tr>
                                </thead>
                                <tbody>
                                  {getCurrentItems().map((application) => (
                                    <tr key={application._id}>
                                      <td title={application.applicant?.email}>
                                        {application.applicant?.firstName &&
                                        application.applicant?.lastName
                                          ? `${application.applicant.firstName} ${application.applicant.lastName}`
                                          : "Unknown"}
                                      </td>
                                      <td>
                                        <span
                                          className={`badge text-white ${
                                            application.status === "accepted"
                                              ? "bg-success"
                                              : application.status === "pending"
                                              ? "bg-warning"
                                              : application.status ===
                                                "cancelled"
                                              ? "bg-secondary"
                                              : "bg-danger"
                                          }`}
                                        >
                                          {application.status}
                                        </span>
                                      </td>
                                      <td>
                                        {moment(application.appliedAt).format(
                                          "MMM DD, YYYY, h:mm a"
                                        )}
                                      </td>

                                      <td>
                                        {application.actionTakenAt
                                          ? moment(
                                              application.actionTakenAt
                                            ).format("MMM DD, YYYY, h:mm a")
                                          : "-"}
                                      </td>
                                      {isAdminOrLeader && (
                                        <td>
                                          {application.status === "pending" ? (
                                            <div className="btn-group btn-group-sm">
                                              <button
                                                className="btn btn-success"
                                                title="Accept Application"
                                                onClick={() =>
                                                  handleUpdateApplicationStatus(
                                                    application._id,
                                                    "accepted"
                                                  )
                                                }
                                              >
                                                <i className="fas fa-check"></i>
                                              </button>
                                              <button
                                                className="btn btn-danger"
                                                title="Deny Application"
                                                onClick={() =>
                                                  handleUpdateApplicationStatus(
                                                    application._id,
                                                    "denied"
                                                  )
                                                }
                                              >
                                                <i className="fas fa-times"></i>
                                              </button>
                                              <button
                                                className="btn btn-secondary"
                                                title="Mark as Cancelled"
                                                onClick={() =>
                                                  handleUpdateApplicationStatus(
                                                    application._id,
                                                    "cancelled"
                                                  )
                                                }
                                              >
                                                <i className="fas fa-ban"></i>
                                              </button>
                                            </div>
                                          ) : (
                                            <div className="btn-group btn-group-sm">
                                              <button
                                                className="btn btn-outline-danger"
                                                title="Delete Application"
                                                onClick={() =>
                                                  handleDeleteApplication(
                                                    application._id
                                                  )
                                                }
                                              >
                                                <i className="fas fa-trash"></i>
                                              </button>
                                            </div>
                                          )}
                                        </td>
                                      )}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {totalPages > 1 && (
                              <div className="d-flex justify-content-center mt-3">
                                <Pagination>
                                  <Pagination.First
                                    onClick={() => paginate(1)}
                                    disabled={currentPage === 1}
                                  />
                                  <Pagination.Prev
                                    onClick={() => paginate(currentPage - 1)}
                                    disabled={currentPage === 1}
                                  />

                                  {[...Array(totalPages).keys()].map(
                                    (number) => (
                                      <Pagination.Item
                                        key={number + 1}
                                        active={number + 1 === currentPage}
                                        onClick={() => paginate(number + 1)}
                                      >
                                        {number + 1}
                                      </Pagination.Item>
                                    )
                                  )}

                                  <Pagination.Next
                                    onClick={() => paginate(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                  />
                                  <Pagination.Last
                                    onClick={() => paginate(totalPages)}
                                    disabled={currentPage === totalPages}
                                  />
                                </Pagination>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-muted mb-0">
                              No application history available
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Tab>

              <Tab eventKey="members" title="Member History">
                <div className="row">
                  <div className="col-md-12 p-0">
                    <div
                      className="card h-100"
                      style={{ border: "none", outline: "none" }}
                    >
                      <div className="card-body" style={{paddingTop: "0"}}>
                        <h5
                          className="card-title"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <span>Member Join/Leave History</span>
                        </h5>
                        {renderSearchBar()}
                        {memberHistory?.history?.length > 0 ? (
                          <>
                            <div className="table-responsive">
                              <table className="table table-hover">
                                <thead>
                                  <tr>
                                    <th
                                      onClick={() => handleSort("name")}
                                      style={{ cursor: "pointer" }}
                                    >
                                      Member {renderSortIndicator("name")}
                                    </th>
                                    <th
                                      onClick={() => handleSort("action")}
                                      style={{ cursor: "pointer" }}
                                    >
                                      Action {renderSortIndicator("action")}
                                    </th>
                                    <th
                                      onClick={() => handleSort("actionDate")}
                                      style={{ cursor: "pointer" }}
                                    >
                                      Date {renderSortIndicator("actionDate")}
                                    </th>
                                    <th>Role</th>
                                    <th>Details</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {getCurrentItems().map((item, index) => (
                                    <tr key={index}>
                                      <td>
                                        <div className="d-flex align-items-center">
                                          <img
                                            src={
                                              item.user?.avatar?.url ||
                                              "/images/account.png"
                                            }
                                            alt="User Avatar"
                                            className="rounded-circle me-2"
                                            style={{
                                              width: "32px",
                                              height: "32px",
                                            }}
                                          />
                                          <span title={item.user?.email}>
                                            {item.user?.firstName}{" "}
                                            {item.user?.lastName}
                                          </span>
                                        </div>
                                      </td>
                                      <td>
                                        <span
                                          className={`badge text-white ${
                                            item.action === "joined"
                                              ? "bg-success"
                                              : item.action === "rejoined"
                                              ? "bg-info"
                                              : "bg-danger"
                                          }`}
                                        >
                                          {item.action
                                            ?.charAt(0)
                                            .toUpperCase() +
                                            item.action?.slice(1)}
                                        </span>
                                      </td>
                                      <td>
                                        {moment(item.actionDate).format(
                                          "MMM DD, YYYY, h:mm a"
                                        )}
                                      </td>
                                      <td>{item.role}</td>
                                      <td className="d-flex flex-column" style={{gap: "0.2rem"}}>
                                        {item.action === "rejoined" && (
                                          <>
                                            <span className="text-muted">
                                              Joined Through {item.joinThrough}
                                            </span>
                                            <span className="text-muted">
                                              Previously left{" "}
                                              {moment(
                                                item.previousLeave
                                              ).fromNow()}
                                            </span>
                                          </>
                                        )}
                                        {item.action === "left" &&
                                          item.isRejoined && (
                                            <span className="text-muted">
                                              Rejoined later
                                            </span>
                                          )}
                                        {}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {totalPages > 1 && (
                              <div className="d-flex justify-content-center mt-3">
                                <Pagination>
                                  <Pagination.First
                                    onClick={() => paginate(1)}
                                    disabled={currentPage === 1}
                                  />
                                  <Pagination.Prev
                                    onClick={() => paginate(currentPage - 1)}
                                    disabled={currentPage === 1}
                                  />

                                  {[...Array(totalPages).keys()].map(
                                    (number) => (
                                      <Pagination.Item
                                        key={number + 1}
                                        active={number + 1 === currentPage}
                                        onClick={() => paginate(number + 1)}
                                      >
                                        {number + 1}
                                      </Pagination.Item>
                                    )
                                  )}

                                  <Pagination.Next
                                    onClick={() => paginate(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                  />
                                  <Pagination.Last
                                    onClick={() => paginate(totalPages)}
                                    disabled={currentPage === totalPages}
                                  />
                                </Pagination>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-muted mb-0">
                              No member history available
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Tab>
            </Tabs>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default TeamHistory;
