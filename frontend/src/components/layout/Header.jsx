import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getUser, logout } from "../../utils/helper";
import "../../index.css";

const Header = () => {
  const [user, setUser] = useState({});

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

  useEffect(() => {
    setUser(getUser());
    if (user) {
      console.log(user);
    }
  }, []);

  return (
    <>
      <header className="navbar">
        <Link className="logo" to="/" style={{textDecoration: 'none'}}>Spherify</Link>
        <nav className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/features">Features</Link>
          <Link to="/about">About</Link>
          {user ? (
            <Link
              className="text-danger"
              style={{ textDecoration: "none" }}
              to="/"
              onClick={logoutHandler}
            >
              Logout
            </Link>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </nav>
      </header>
    </>
  );
};

export default Header;
