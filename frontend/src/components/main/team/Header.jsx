import React, { useState, useRef, useEffect } from "react";
import ActiveStatus from "./ActiveStatus";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { useSelector } from "react-redux";
import { errMsg, succesMsg } from "../../../utils/helper";
import TeamConfigurationModal from "./TeamConfigurationModal";

function Header({
  setRefresh,
  showRightPanel,
  setShowRightPanel,
  showChats,
  handleToggleChats,
  ...teamInfo
}) {
  const currentTeamId = teamInfo._id;
  const [isHoveringLogo, setIsHoveringLogo] = useState(false);
  const [isHoveringName, setIsHoveringName] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newTeamName, setNewTeamName] = useState(teamInfo.name);
  const [canEdit, setCanEdit] = useState(false);
  const [isConfigAdmin, setIsConfigAdmin] = useState(false); // New state for config permissions
  const [showConfigModal, setShowConfigModal] = useState(false); // New state for modal
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const currentUser = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);

  useEffect(() => {
    if (teamInfo.members && currentUser) {
      const userMember = teamInfo.members.find(
        (member) =>
          member.user._id === currentUser._id && member.leaveAt === null
      );

      // Check for general edit permissions (includes moderator)
      setCanEdit(
        userMember &&
          (userMember.isAdmin ||
            userMember.role === "leader" ||
            userMember.role === "moderator")
      );
      
      // Specific check for configuration admin permissions (leader or admin only)
      setIsConfigAdmin(
        userMember && 
        (userMember.isAdmin || userMember.role === "leader")
      );
    }
  }, [teamInfo.members, currentUser]);

  // Handle opening the configuration modal
  const handleOpenConfigModal = () => {
    setShowConfigModal(true);
  };

  // Handle closing the configuration modal
  const handleCloseConfigModal = () => {
    setShowConfigModal(false);
  };
  
  // Navigate to team reports page
  const navigateToReports = () => {
    navigate(`/main/${currentTeamId}/reports`);
  };

  const handleLogoUpload = (e) => {
    if (!canEdit) return;

    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("logo", file);

    axios
      .put(
        `${import.meta.env.VITE_API}/updateTeam/${currentTeamId}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      )
      .then((response) => {
        if (response.data.success) {
          setRefresh((prev) => !prev);
          succesMsg("Team logo updated successfully");
        }
      })
      .catch((error) => {
        console.error("Error updating logo:", error);
        errMsg("Failed to update team logo");
      });
  };

  const handleNameUpdate = () => {
    if (!canEdit || !newTeamName.trim()) return;

    axios
      .put(
        `${import.meta.env.VITE_API}/updateTeam/${currentTeamId}`,
        {
          name: newTeamName,
        },
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      )
      .then((response) => {
        if (response.data.success) {
          setIsEditing(false);
          setRefresh((prev) => !prev);
          succesMsg("Team name updated successfully");
        }
      })
      .catch((error) => {
        console.error("Error updating team name:", error);
        errMsg("Failed to update team name");
      });
  };

  const location = useLocation();
  const isMainTeamPage = location.pathname === `/main/${currentTeamId}`;

  return (
    <div className={`header ${!showRightPanel ? "full" : ""}`}>
      <div className="logo-name">
        {!isMainTeamPage && (
          <Link
            to={`/main/${currentTeamId}`}
            className="back-button d-flex align-items-center"
            style={{ gap: "0.3rem", fontSize: "1.2rem" }}
          >
            <i className="fa-solid fa-arrow-left"></i>
            <span style={{ fontSize: "1.2rem" }}>Back</span>
          </Link>
        )}
        <div
          key={teamInfo._id}
          className="team"
          onMouseEnter={() => setIsHoveringLogo(true)}
          onMouseLeave={() => setIsHoveringLogo(false)}
          style={{ position: "relative" }}
        >
          {teamInfo.logo.url !== "" ? (
            <>
              <img
                src={teamInfo.logo.url || "/images/default-team-logo.png"}
                alt="Team Logo"
                className="team-logo"
              />
              {canEdit && isHoveringLogo && (
                <div
                  className="logo-upload-overlay"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(0,0,0,0.5)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                  onClick={() => fileInputRef.current.click()}
                >
                  <i
                    className="fa-solid fa-upload"
                    style={{ color: "white" }}
                  ></i>
                </div>
              )}
            </>
          ) : (
            <>
              <span className="team-logo-char">{teamInfo?.name[0]}</span>
              {canEdit && isHoveringLogo && (
                <div
                  className="logo-upload-overlay"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(0,0,0,0.5)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                  onClick={() => fileInputRef.current.click()}
                >
                  <i
                    className="fa-solid fa-upload"
                    style={{ color: "white" }}
                  ></i>
                </div>
              )}
            </>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleLogoUpload}
            accept="image/*"
            style={{ display: "none" }}
          />
        </div>
        <div
          className="team-name-container"
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
          }}
          onMouseEnter={() => setIsHoveringName(true)}
          onMouseLeave={() => setIsHoveringName(false)}
        >
          {isEditing ? (
            <div style={{ display: "flex", alignItems: "center" }}>
              <input
                type="text"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                onBlur={handleNameUpdate}
                onKeyPress={(e) => e.key === "Enter" && handleNameUpdate()}
                autoFocus
                style={{
                  border: "none",
                  borderBottom: "1px solid #ddd",
                  background: "transparent",
                  fontSize: "inherit",
                  color: "inherit",
                  outline: "none",
                }}
              />
              <button
                onClick={handleNameUpdate}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  marginLeft: "5px",
                }}
              >
                <i className="fa-solid fa-check"></i>
              </button>
            </div>
          ) : (
            <>
              <div className="team-name">{teamInfo.name}</div>
              {canEdit && isHoveringName && (
                <button
                  style={{
                    background: "none",
                    border: "none",
                    marginLeft: "5px",
                    cursor: "pointer",
                    color: "#777",
                  }}
                  onClick={() => setIsEditing(true)}
                  title="Edit team name"
                >
                  <i className="fa-solid fa-pen text-white"></i>
                </button>
              )}
            </>
          )}
        </div>
      </div>
      <div className="d-flex align-items-center " style={{ gap: "0.6rem" }}>
        <div 
          onClick={navigateToReports} 
          className="report-button" 
          role="button"
          style={{ 
            cursor: "pointer", 
            display: "flex", 
            alignItems: "center", 
            gap: "0.5rem",
            backgroundColor: "#5a78a5",
            color: "white",
            borderRadius: "4px",
            padding: "6px 12px",
            transition: "background-color 0.2s ease"
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#496792"} 
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#5a78a5"}
        >
          <i className="fas fa-chart-bar"></i>
          <span>REPORTS</span>
        </div>
        {/* Only show configuration button for admins and leaders */}
        {isConfigAdmin && (
          <div 
            className="set-team-configuration" 
            style={{
              cursor: "pointer", 
              display: "flex", 
              alignItems: "center", 
              gap: "0.5rem", 
              backgroundColor: "rgb(90, 120, 165)", 
              color: "white", 
              borderRadius: "4px", 
              padding: "10px 12px", 
              transition: "background-color 0.2s"
            }}
            onClick={handleOpenConfigModal}
            title="Team Configuration"
          >
            <i className="fa-solid fa-gear"></i>
          </div>
        )}

        <div
          className="nav-button"
          style={{
            cursor: "pointer", 
            display: "flex", 
            alignItems: "center", 
            gap: "0.5rem", 
            backgroundColor: "rgb(90, 120, 165)", 
            color: "white", 
            borderRadius: "4px", 
            padding: "6px 12px", 
            transition: "background-color 0.2s"
          }}
          onClick={() => {
            handleToggleChats();
            setShowRightPanel(true);
          }}
        >
          {showChats ? (
            <>
              <i className="fa-solid fa-wrench"></i>
              <span>MENU</span>
            </>
          ) : (
            <>
              <i className="fa-solid fa-comments"></i>
              <span>CHATS</span>
            </>
          )}
        </div>
      </div>
      
      {/* Add the Team Configuration Modal */}
      <TeamConfigurationModal 
        show={showConfigModal} 
        onHide={handleCloseConfigModal} 
        teamId={currentTeamId}
        setRefresh={setRefresh}
      />
    </div>
  );
}

export default Header;
