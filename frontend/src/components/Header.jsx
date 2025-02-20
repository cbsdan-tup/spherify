import React from "react";
import {Link} from "react-router-dom";
const Header = () => {
  return (
    <div className="header-container">
      <div className="header">
        <div className="brand content">
            <img
              src="/images/default-team-logo.png"
              alt="Team Logo"
              className="logo"
            />
            <span className="name">Spherify</span>
        </div>
        <div className="go-to-main content">
          <Link to="/main" className="button">
            <i className="fa-solid fa-house icon"></i>
            <span className="label">Go to Main</span>
          </Link>
        </div>
        <div className="right-navigation content">
          <div className="profile">
            <span className="user-name">Daniel Cabasa</span>
            <img
              src="/images/cabasa.png"
              alt="Profile"
              className="image"
            />
          </div>

          <Link to="/main/settings" className="settings button">
            <i className="fa-solid fa-gear icon"></i>
          </Link>

          <div className="logout button">
            <i class="fa-solid fa-right-from-bracket icon"></i>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
