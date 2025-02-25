import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getUser, logout } from "../../utils/helper";
import "../../index.css";
import { useDispatch, useSelector } from "react-redux";
import { clearTeamId, clearMsgGroupId } from "../../redux/teamSlice";

const Header = () => {
  const authState = useSelector((state) => state.auth);
  const [user, setUser] = useState({});

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const logoutHandler = () => {
    console.log("logout");
    toast.success("Log out successfully", {
      position: "bottom-right",
    });
    logout(dispatch, () => {
      navigate("/");
      window.location.reload();
    });
  };

  useEffect(() => {
    setUser(getUser(authState));
    if (user) {
      console.log(user);
    }
  }, []);

  return (
    <>
      <header className="navbar">
        <Link className="logo" to="/" style={{ textDecoration: "none" }}>
          Spherify
        </Link>
        <nav className="nav-links">
          {user ? (
            <>
              <Link className="border" to={user?.isAdmin ? "/admin" : "/main"}>
                Go to Spherify
              </Link>
            </>
          ) : (
            <></>
          )}
          {user ? (
            <>
              <Link
                className="text-danger"
                style={{ textDecoration: "none" }}
                to="/"
                onClick={() => {
                  logoutHandler();
                  dispatch(clearTeamId());
                  dispatch(clearMsgGroupId());
                }}
              >
                Logout
              </Link>
            </>
          ) : null}
        </nav>
      </header>
    </>
  );
};

export default Header;
