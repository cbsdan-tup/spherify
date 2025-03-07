import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { errMsg, logout } from "../utils/helper";
import { clearTeamId, clearMsgGroupId } from "../redux/teamSlice";
import axios from "axios";

const Header = ({ setIsLoading, setTeams }) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const systemLogoSrc = useSelector((state) => state.configurations.site?.logo);
  const systemTitle =
    useSelector((state) => state.configurations.site?.title) || "Spherify";
  const token = useSelector((state) => state.auth.token);

  const navigate = useNavigate();
  const location = useLocation(); // Get the current location

  const [searchTeam, setSearchTeam] = useState("");
  const [searchTimeout, setSearchTimeout] = useState(null);

  // Handle search input change
  const handleSearchTeam = (e) => {
    const value = e.target.value;
    setSearchTeam(value);

    // Clear the previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Set a new timeout to trigger the search after 1 second
    setSearchTimeout(
      setTimeout(() => {
        performSearch(value);
      }, 500)
    );
  };

  // Perform the search
  const performSearch = async (query) => {
    try {
      setIsLoading(true)
      // Encode query parameters to handle special characters
      const encodedQuery = encodeURIComponent(query);
      const encodedUserId = encodeURIComponent(user._id);

      if (query.trim() !== "") {
        // Make the GET request
        let{ data } = await axios.get(
          `${
            import.meta.env.VITE_API
          }/fetchTeamsByName?name=${encodedQuery}&userId=${encodedUserId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log("Filtered teams: ", data);
        data = data?.teams || [];

        setTeams(
          data.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        );

      } else {
        const { data } = await axios.get(
          `${import.meta.env.VITE_API}/getTeamByUser/${user._id}`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        setTeams(
          data.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        );
      }
    } catch (error) {
      console.error("Error searching teams:", error);
      errMsg("Error searching teams");
    } finally {
      setIsLoading(false)
    }
  };
  // Clear the timeout when the component unmounts
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

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
    <div className="header-container">
      <div className="header">
        <div className="brand content">
          <img
            src={`${
              systemLogoSrc ? systemLogoSrc : "/images/default-team-logo.png"
            }`}
            alt="Team Logo"
            className="logo"
          />
          <span className="name">{systemTitle}</span>
        </div>
        <div className="go-to-main content">
          {location.pathname === "/main" ? (
            // Show search input field on /main
            <>
              <input
                type="text"
                className="search-team"
                placeholder="Search a Team"
                value={searchTeam}
                onChange={handleSearchTeam}
              />
              <i className="fa-solid fa-magnifying-glass search-icon"></i>
            </>
          ) : (
            // Show button on /main/{id}
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
          )}
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
