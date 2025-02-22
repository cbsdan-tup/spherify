import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { errMsg, getUser, logout, succesMsg } from "../../utils/helper";
import AddTeamForm from "../main/AddTeamForm";
import { getToken } from "../../utils/helper";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { setTeamId, clearTeamId, clearMsgGroupId } from "../../redux/teamSlice";

const LeftPanel = () => {
  const [showPopup, setShowPopup] = useState(false);
  const navigate = useNavigate();

  const [teams, setTeams] = useState([]);

  const initialData = {
    nickname: "",
    role: "member",
    isAdmin: false,
  };

  const dispatch = useDispatch();
  const authState = useSelector((state) => state.auth);
  const currentTeamId = useSelector((state) => state.team.currentTeamId);

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

  const handleShow = () => setShowPopup(true);
  const handleClose = () => setShowPopup(false);

  const handleSubmit = async (data) => {
    console.log("Form Data:", data);

    try {
      const token = getToken(authState);
      const userId = getUser(authState)?._id;

      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("description", data.description);
      formData.append("nickname", data.nickname);
      formData.append("createdBy", userId);

      if (data.logo) {
        formData.append("logo", data.logo);
      }

      if (data.membersEmail) {
        formData.append("members", JSON.stringify(data.membersEmail));
      }

      const response = await axios.post(
        `${import.meta.env.VITE_API}/addTeam`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log("Team created successfully:", response);
      const newTeamId = response.data.team?._id;
      const createTeamFolder = await axios.post(
        `${import.meta.env.VITE_API}/createTeamFolder/${newTeamId}`,
        {
          createdBy: userId,
          owner: userId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("Team folder created successfully:", createTeamFolder);

      succesMsg("Team created successfully!");
      fetchTeams();

      handleClose();
    } catch (error) {
      console.error("Error submitting form:", error);
      errMsg(`Error: ${error.message}`);
    }

    handleClose();
  };
  const fetchTeams = async () => {
    try {
      console.log(getUser(authState));
      const userId = getUser(authState)._id;
      console.log(userId);
      const { data } = await axios.get(
        `${import.meta.env.VITE_API}/getTeamByUser/${userId}`
      );
      console.log(data);
      setTeams(data);
    } catch (error) {
      console.log(`Error fetching teams: ${error}`);
    }
  };
  useEffect(() => {
    fetchTeams();
  }, []);

  return (
    <div className="left-panel-container">
      <Link
        className="spherify-logo-container"
        to="/main"
        onClick={() => {
          dispatch(clearTeamId());
          dispatch(clearMsgGroupId());
        }}
      >
        <img
          src="/images/white-logo.png"
          alt="Spherify"
          className="spherify-logo"
        />
      </Link>
      <hr className="divider" />
      <div className="teams-container">
        <div className="teams">
          <div className="team-link">
            <button className="add-button" onClick={handleShow}>
              <i className="fa-solid fa-plus plus-icon"></i>
            </button>
          </div>
          {teams &&
            Array.isArray(teams) &&
            teams.map((team) => (
              <Link
                to={`/main/${team._id}`}
                className={`team-link ${
                  team._id === currentTeamId ? "active" : ""
                }`}
                key={team._id}
                onClick={() => dispatch(setTeamId(team._id))}
              >
                <div key={team._id} className="team">
                  {team.logo.url !== "" ? (
                    <img
                      src={team.logo.url || "/images/default-team-logo.png"}
                      alt="Team Logo"
                      className="team-logo"
                    />
                  ) : (
                    <span className="team-name">{team?.name[0]}</span>
                  )}
                </div>
              </Link>
            ))}
        </div>
      </div>
      <hr className="divider" />
      <div className="bottom-section">
        <Link
          className="button settings-button mb-0"
          to="/main/settings"
          onClick={() => {
            dispatch(clearTeamId());
            dispatch(clearMsgGroupId());
          }}
        >
          <img className="icon" src="/images/settings-icon.png" />
          Settings
        </Link>
        <button
          className="button logout-button mb-0"
          onClick={() => {
            logoutHandler();
            dispatch(clearTeamId());
            dispatch(clearMsgGroupId());
          }}
        >
          <img className="icon" src="/images/logout-icon.png" />
          Logout
        </button>
      </div>
      <AddTeamForm
        show={showPopup}
        handleClose={handleClose}
        handleSubmit={handleSubmit}
        initialData={initialData}
        authState={authState}
      />
    </div>
  );
};

export default LeftPanel;
