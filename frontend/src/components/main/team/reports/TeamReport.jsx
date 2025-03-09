import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "axios";
import { toast } from "react-toastify";
import TeamOverview from "./TeamOverview";
import MemberActivity from "./MemberActivity";
import ChatEngagement from "./ChatEngagement";
import ContributionReport from "./ContributionReport";

const TeamReport = () => {
  const { teamId } = useParams();
  const token = useSelector((state) => state.auth.token);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teamDetails, setTeamDetails] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const fetchTeamDetails = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API}/getTeamBasicDetails/${teamId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        
        setTeamDetails(response.data.team);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching team details:", err);
        setError(err.response?.data?.message || "Failed to load team details");
        toast.error("Failed to load team report data");
        setLoading(false);
      }
    };

    if (teamId && token) {
      fetchTeamDetails();
    }
  }, [teamId, token]);

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return <TeamOverview teamId={teamId} />;
      case "members":
        return <MemberActivity teamId={teamId} />;
      case "chat":
        return <ChatEngagement teamId={teamId} />;
      case "contributions":
        return <ContributionReport teamId={teamId} />;
      default:
        return <TeamOverview teamId={teamId} />;
    }
  };

  if (loading) {
    return (
      <div className="team-report-container p-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading team report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="team-report-container p-4">
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }

  return (
    <div className="team-report-container p-4">
      <div className="team-report-header mb-4">
        <h1>Team Report: {teamDetails?.name}</h1>
        <p className="text-muted">
          Team activities and member engagement
        </p>
      </div>

      <div className="team-report-tabs mb-4">
        <ul className="nav nav-tabs">
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === "overview" ? "active" : ""}`}
              onClick={() => setActiveTab("overview")}
            >
              <i className="fas fa-chart-bar me-2"></i>
              Overview
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === "members" ? "active" : ""}`}
              onClick={() => setActiveTab("members")}
            >
              <i className="fas fa-users me-2"></i>
              Member Activity
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === "chat" ? "active" : ""}`}
              onClick={() => setActiveTab("chat")}
            >
              <i className="fas fa-comments me-2"></i>
              Chat Engagement
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === "contributions" ? "active" : ""}`}
              onClick={() => setActiveTab("contributions")}
            >
              <i className="fas fa-tasks me-2"></i>
              Contributions
            </button>
          </li>
        </ul>
      </div>

      <div className="team-report-content">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default TeamReport;
