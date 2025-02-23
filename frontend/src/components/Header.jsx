import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import { logout } from "../utils/helper";
import { clearTeamId, clearMsgGroupId } from "../redux/teamSlice";

const Header = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);

  const logoutHandler = () => {
    toast.success("Log out successfully", {
      position: "bottom-right",
    });
    logout(dispatch, () => {
      navigate("/");
      window.location.reload();
    });
  };
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
          <Link
            to="/main"
            className="button"
            onClick={() => {
              dispatch(clearTeamId());
              dispatch(clearMsgGroupId());
            }}
          >
            <i className="fa-solid fa-house icon"></i>
            <span className="label">Go to Main</span>
          </Link>
        </div>
        <div className="right-navigation content">
          <div className="profile">
            <span className="user-name">
              {user?.firstName} {user?.lastName}
            </span>
            <img
              src={user?.avatar?.url ? user.avatar.url : "/images/account.png"}
              alt="Profile"
              className="image"
            />
          </div>

          <Link to="/main/settings" className="settings button">
            <i className="fa-solid fa-gear icon"></i>
          </Link>

          <div
            className="logout button"
            onClick={() => {
              logoutHandler();
              dispatch(clearTeamId());
              dispatch(clearMsgGroupId());
            }}
          >
            <i className="fa-solid fa-right-from-bracket icon"></i>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
