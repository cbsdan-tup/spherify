import React from "react";
import ActiveStatus from "./ActiveStatus";
import { Link } from "react-router-dom";

function Header(teamInfo) {
  const currentTeamId = teamInfo._id;
  return (
    <div className="header">
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
      <ActiveStatus />
      <Link className="dashboard active" to={`/main/${currentTeamId}`}>
          Dashboard
      </Link>
    </div>
  );
}

export default Header;
