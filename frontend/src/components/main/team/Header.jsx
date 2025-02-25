import React from "react";
import ActiveStatus from "./ActiveStatus";
import { Link } from "react-router-dom";

function Header({
  showRightPanel,
  setShowRightPanel,
  showChats,
  handleToggleChats,
  ...teamInfo
}) {
  const currentTeamId = teamInfo._id;
  return (
    <div className={`header ${!showRightPanel ? "full" : ""}`}>
      <div className="logo-name">
        <div key={teamInfo._id} className="team">
          {teamInfo.logo.url !== "" ? (
            <img
              src={teamInfo.logo.url || "/images/default-team-logo.png"}
              alt="Team Logo"
              className="team-logo"
            />
          ) : (
            <span className="team-logo-char">{teamInfo?.name[0]}</span>
          )}
        </div>
        <div className="team-name">{teamInfo.name}</div>
      </div>
      <div
        className="nav-button"
        onClick={()=>{handleToggleChats(); setShowRightPanel(true)}}
      >
        {showChats ? (
          <>
            <i className="fa-solid fa-wrench"></i>
            <span>Show Tools</span>
          </>
        ) : (
          <>
            <i className="fa-solid fa-comments"></i>
            <span>Show Chats</span>
          </>
        )}
      </div>
    </div>
  );
}

export default Header;
