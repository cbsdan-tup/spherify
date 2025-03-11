import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import { errMsg, succesMsg } from "../../utils/helper";
import LoadingSpinner from "./LoadingSpinner";
import moment from "moment";
import "../../styles/RightMainPanel.css"; // Import specific CSS for this component

const RightMainPanel = ({ refresh, setRefresh }) => {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState("currentRequests");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const token = useSelector((state) => state.auth.token);
  const user = useSelector((state) => state.auth.user);

  // Fetch team requests (invitations)
  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API}/getTeamRequests/${user._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("Current Requests:", response.data?.pendingRequests);
      setRequests(response.data?.pendingRequests || []);
    } catch (error) {
      console.error("Error fetching requests:", error);
      errMsg("Error fetching requests");
    } finally {
      setIsLoading(false);
    }
  };

  // Add a sorting function for past requests
  const sortByMostRecent = (requestA, requestB) => {
    const dateA = requestA.updatedAt || requestA.invitedAt;
    const dateB = requestB.updatedAt || requestB.invitedAt;
    return new Date(dateB) - new Date(dateA);
  };

  // Fetch past team requests (handled invitations)
  const fetchPastRequests = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API}/getPastTeamRequests/${user._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("Past Requests:", response.data?.pastRequests);

      // Sort past requests by updatedAt or invitedAt
      const sortedRequests = [...(response.data?.pastRequests || [])].sort(
        sortByMostRecent
      );
      setRequests(sortedRequests);
    } catch (error) {
      console.error("Error fetching past requests:", error);
      errMsg("Error fetching past requests");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch current applications (user has applied to teams)
  const fetchCurrentApplications = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API}/getUserApplications`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("Current Applications:", response.data?.data);

      // Filter to only pending applications
      const pendingApps =
        response.data?.data?.filter((app) => app.status === "pending") || [];
      setRequests(pendingApps);
    } catch (error) {
      console.error("Error fetching applications:", error);
      errMsg("Error fetching applications");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch past applications (processed applications)
  const fetchPastApplications = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API}/getUserApplications`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("Past Applications:", response.data?.data);

      // Filter to only processed applications (accepted or denied)
      const processedApps =
        response.data?.data?.filter((app) => app.status !== "pending") || [];
      setRequests(processedApps);
    } catch (error) {
      console.error("Error fetching past applications:", error);
      errMsg("Error fetching past applications");
    } finally {
      setIsLoading(false);
    }
  };

  const updateRequestStatus = async (requestId, status) => {
    try {
      const response = await axios.put(
        `${import.meta.env.VITE_API}/updateRequestStatus/${requestId}`,
        {
          status,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("Update Requests Response: ", response.data);
      succesMsg("Request status updated successfully");
    } catch (error) {
      console.error("Error updating requests status:", error);
      errMsg("Error updating requests status");
    } finally {
      setRefresh(!refresh);
    }
  };

  const handleRequest = (requestId, status) => {
    updateRequestStatus(requestId, status);
  };

  // Cancel an application - updated to change status instead of deleting
  const handleCancelApplication = async (applicationId) => {
    try {
      await axios.patch(
        `${import.meta.env.VITE_API}/updateApplicationStatus/${applicationId}`,
        {
          status: "cancelled",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      succesMsg("Application cancelled successfully");
      // Refresh the data
      setRefresh(!refresh);
    } catch (error) {
      console.error("Error cancelling application:", error);
      errMsg(error.response?.data?.message || "Failed to cancel application");
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Update data when filter changes
  useEffect(() => {
    switch (filterType) {
      case "currentRequests":
        fetchRequests();
        break;
      case "pastRequests":
        fetchPastRequests();
        break;
      case "currentApplications":
        fetchCurrentApplications();
        break;
      case "pastApplications":
        fetchPastApplications();
        break;
      default:
        fetchRequests();
    }
  }, [filterType, refresh]);

  // Render different content based on filter type
  const renderContent = () => {
    if (isLoading) {
      return (
        <LoadingSpinner
          message={`Loading ${filterType
            .replace(/([A-Z])/g, " $1")
            .toLowerCase()}`}
        />
      );
    }

    if (requests.length === 0) {
      return (
        <div className="rmp-no-requests">
          No {filterType.replace(/([A-Z])/g, " $1").toLowerCase()} to display
        </div>
      );
    }

    switch (filterType) {
      case "currentRequests":
        return requests.map((request) => (
          <div className="rmp-request" key={request._id}>
            <div className="rmp-request-info">
              <div className="rmp-inviter-avatar">
                <img
                  src={request?.inviter?.avatar?.url || "/images/account.png"}
                  alt="User Avatar"
                />
              </div>
              <div className="rmp-request-team">
                <div className="rmp-invite-info">
                  <strong>
                    {request.inviter?.firstName} {request.inviter?.lastName}
                  </strong>{" "}
                  is inviting you to team <strong>"{request.team.name}"</strong>
                </div>
                <div className="rmp-invited-at">
                  {moment(request?.invitedAt).fromNow()}
                </div>
              </div>
            </div>
            <div className="rmp-request-actions">
              <button
                className="rmp-accept"
                onClick={() => handleRequest(request._id, "accepted")}
              >
                Accept
              </button>
              <button
                className="rmp-deny"
                onClick={() => handleRequest(request._id, "denied")}
              >
                Deny
              </button>
            </div>
          </div>
        ));

      case "pastRequests":
        return requests.map((request) => (
          <div
            className={`rmp-request rmp-past-request rmp-${request.status}`}
            key={request._id}
          >
            <div className="rmp-request-info">
              <div className="rmp-inviter-avatar">
                <img
                  src={request.inviter?.avatar?.url || "/images/account.png"}
                  alt="User Avatar"
                />
              </div>
              <div className="rmp-request-team">
                <div className="rmp-invite-info">
                  <strong>
                    {request.inviter?.firstName} {request.inviter?.lastName}
                  </strong>{" "}
                  invited you to team <strong>"{request.team?.name}"</strong>
                </div>
                <div className="rmp-status-info">
                  <span className={`rmp-status rmp-${request.status}`}>
                    {request.status.charAt(0).toUpperCase() +
                      request.status.slice(1)}
                  </span>
                  <span className="rmp-time-ago">
                    {moment(request?.updatedAt || request?.invitedAt).fromNow()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ));

      case "currentApplications":
        return requests.map((application) => (
          <div className="rmp-request rmp-application" key={application._id}>
            <div className="rmp-request-info">
              <div className="rmp-team-avatar">
                <img
                  src={application.team.logo?.url || "/images/white-logo.png"}
                  alt="Team Logo"
                />
              </div>
              <div className="rmp-application-info">
                <div className="rmp-team-name">
                  <strong>{application.team.name}</strong>
                </div>
                <div className="rmp-application-date">
                  Applied {moment(application?.appliedAt).fromNow()}
                </div>
              </div>
            </div>
            <div className="rmp-request-actions">
              <button
                className="rmp-cancel"
                onClick={() => handleCancelApplication(application._id)}
              >
                Cancel
              </button>
            </div>
          </div>
        ));

      case "pastApplications":
        // Sort past applications by updatedAt or invitedAt
        return [...requests].sort(sortByMostRecent).map((application) => (
          <div
            className={`rmp-request rmp-past-application rmp-${application.status}`}
            key={application._id}
          >
            <div className="rmp-request-info">
              <div className="rmp-team-avatar">
                <img
                  src={application.team.logo?.url || "/images/white-logo.png"}
                  alt="Team Logo"
                />
              </div>
              <div className="rmp-application-info">
                <div className="rmp-team-name">
                  <strong>{application.team.name}</strong>
                </div>
                <div className="rmp-application-result">
                  <span className={`rmp-status rmp-${application.status}`}>
                    {application.actionTakenBy &&
                      (application.actionTakenBy._id === user._id
                        ? "You"
                        : `${application.actionTakenBy?.firstName}` + " " + `${application.actionTakenBy?.lastName}`)}{" "}
                    {application?.status} your application
                  </span>
                  <span className="rmp-time-ago">
                    {moment(
                      application?.updatedAt ||
                        application?.actionTakenAt ||
                        application?.invitedAt
                    ).fromNow()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ));

      default:
        return <div className="rmp-no-requests">No data to display</div>;
    }
  };

  return (
    <div className="right-main-panel">
      <div className="rmp-header">
        <h3>
          <i className="fas fa-envelope"></i>
          <span>Team Invitations & Applications</span>
        </h3>
        <div className="rmp-filter-dropdown" ref={dropdownRef}>
          <button
            className="rmp-dropdown-toggle"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            {filterType === "currentRequests" && "Current Requests"}
            {filterType === "pastRequests" && "Past Requests"}
            {filterType === "currentApplications" && "My Applications"}
            {filterType === "pastApplications" && "Past Applications"}
            <i
              className={`fa-solid fa-chevron-${dropdownOpen ? "up" : "down"}`}
            ></i>
          </button>

          {dropdownOpen && (
            <div className="rmp-dropdown-menu">
              <div
                className={`rmp-dropdown-item ${
                  filterType === "currentRequests" ? "active" : ""
                }`}
                onClick={() => {
                  setFilterType("currentRequests");
                  setDropdownOpen(false);
                }}
              >
                <i className="fa-solid fa-envelope"></i>
                Current Requests
              </div>
              <div
                className={`rmp-dropdown-item ${
                  filterType === "pastRequests" ? "active" : ""
                }`}
                onClick={() => {
                  setFilterType("pastRequests");
                  setDropdownOpen(false);
                }}
              >
                <i className="fa-solid fa-history"></i>
                Past Requests
              </div>
              <div
                className={`rmp-dropdown-item ${
                  filterType === "currentApplications" ? "active" : ""
                }`}
                onClick={() => {
                  setFilterType("currentApplications");
                  setDropdownOpen(false);
                }}
              >
                <i className="fa-solid fa-paper-plane"></i>
                My Applications
              </div>
              <div
                className={`rmp-dropdown-item ${
                  filterType === "pastApplications" ? "active" : ""
                }`}
                onClick={() => {
                  setFilterType("pastApplications");
                  setDropdownOpen(false);
                }}
              >
                <i className="fa-solid fa-clipboard-list"></i>
                Past Applications
              </div>
            </div>
          )}
        </div>
      </div>

      <hr className="rmp-divider" />

      <div className="rmp-content">{renderContent()}</div>
    </div>
  );
};

export default RightMainPanel;
