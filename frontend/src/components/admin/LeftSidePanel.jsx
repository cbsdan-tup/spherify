import React, { useState } from "react";
import { Link } from "react-router-dom";

const LeftSidePanel = ({ isShow = false, setIsShow }) => {

    const [activeNav, setActiveNav] = useState("dashboard");

  const switchActiveNav = (navName) => {
    setActiveNav(navName);
  }

  const toggleShowPanel = () => {
    setIsShow(prev => !prev);
  }
  return (
    <div className={`left-side-panel ${!isShow ? "hide" : ""}`}>
      <div className="content">
        <Link className="top component" to="/admin" onClick={()=>{switchActiveNav("dashboard")}}>
          <div className="logo">
            <img src="/images/default-team-logo.png" alt="logo" />
          </div>
          <div className="name">Spherify</div>
          <hr />
          <div className="label">
            <i className="fa-solid fa-user-tie"></i>
            <span className="text">Administrator</span>
          </div>
        </Link>
        <div className="body component">
          <Link className={`nav ${activeNav === "dashboard" ? 'active' : ''}`} to="/admin" onClick={() => switchActiveNav("dashboard")}>
            <i className="fa-solid fa-tv"></i>
            <span className="text">Dashboard</span>
          </Link>
          <Link className={`nav ${activeNav === "user-management" ? 'active' : ''}`} to="/admin/user-management" onClick={() => switchActiveNav("user-management")}>
            <i className="fa-solid fa-user"></i>
            <span className="text">User Magement</span>
          </Link>
          <Link className={`nav ${activeNav === "team-management" ? 'active' : ''}`} to="/admin/team-management" onClick={() => switchActiveNav("team-management")}>
            <i className="fa-solid fa-users"></i>
            <span className="text">Team Management</span>
          </Link>
          <Link className={`nav ${activeNav === "configurations" ? 'active' : ''}`} to="/admin/configurations" onClick={() => switchActiveNav("configurations")}>
            <i className="fa-solid fa-gear"></i>
            <span className="text">Configurations</span>
          </Link>
        </div>
        <div className="bottom component" onClick={toggleShowPanel}>
            <div className="hide-panel">
            <i className="fa-solid fa-right-left"></i>
            <span className="text">Hide Panel</span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default LeftSidePanel;
