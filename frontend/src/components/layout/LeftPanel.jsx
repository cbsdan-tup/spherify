import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { logout } from "../../utils/helper";

const LeftPanel = () => {
  const navigate = useNavigate();

  const logoutHandler = () => {
    console.log("logout");
    toast.success("Log out successfully", {
      position: "bottom-right",
    });
    logout(() => {
      navigate("/");
      window.location.reload();
    });
  };

  return (
    <div className="left-panel-container">
      <Link className="spherify-logo-container" to="/main">
        <img
          src="/images/white-logo.png"
          alt="Spherify"
          className="spherify-logo"
        />
      </Link>
      <hr className="divider" />
      <button className="add-button"><i className="fa-solid fa-plus plus-icon"></i></button>
      <div className="bottom-section">
        <button className="button settings-button">
          <img className="icon" src="images/settings-icon.png" />
          Settings
        </button>
        <button className="button logout-button" onClick={logoutHandler}>
          <img className="icon" src="images/logout-icon.png" />
          Logout
        </button>
      </div>
    </div>
  );
};

export default LeftPanel;
