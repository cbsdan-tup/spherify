import React, {useState, useEffect} from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getUser, logout } from "../../utils/helper";

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
    <header className="header">
      <div className="brand">
        <h1>
          <Link to="/">Spherify</Link>
        </h1>
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
          <>
            <Link to="/login">Login</Link>
            <br />
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;
