import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { logout } from "../../utils/helper";
import { useNavigate } from "react-router-dom";

const Header = () => {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  let navigate = useNavigate();

  const logoutHandler = () => {
    logout(dispatch, () => {
      navigate("/");
      toast.success("Log out successfully", {
        position: "bottom-right",
      });
      window.location.reload();
    }, user); // Pass the current user to logout function
  };

  return (
    <div className="header-admin-container">
      <div className="content">
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

        <Link to="/admin/profile" className="settings button">
          <i className="fa-solid fa-gear icon"></i>
        </Link>

        <div
          className="logout button"
          onClick={() => {
            logoutHandler();
          }}
        >
          <i className="fa-solid fa-right-from-bracket icon"></i>
        </div>
      </div>
    </div>
  );
};

export default Header;
