import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { errMsg, getUser, succesMsg } from "../../utils/helper";
import AddTeamForm from "./AddTeamForm";
import { getToken } from "../../utils/helper";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { setTeamId } from "../../redux/teamSlice";
import "../../styles/Home.css";
import moment from "moment";
import Swal from "sweetalert2";
import InviteMemberPopUp from "./InviteMemberPopUp";

function Home({ refresh, setRefresh }) {
  const [showPopup, setShowPopup] = useState(false);
  const [teams, setTeams] = useState([]);
  const [activeMenu, setActiveMenu] = useState(null);
  const [showInvitePopup, setShowInvitePopup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const initialData = {
    nickname: "",
    role: "member",
    isAdmin: false,
  };

  const dispatch = useDispatch();
  const authState = useSelector((state) => state.auth);
  const user = useSelector((state) => state.auth.user);

  const handleShow = () => setShowPopup(true);
  const handleClose = () => setShowPopup(false);

  const handleInviteShow = () => setShowInvitePopup(true);
  const handleInviteClose = () => setShowInvitePopup(false);

  const handleSubmit = async (data) => {
    console.log("Form Data:", data);

    try {
      setIsLoading(true);

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

      const createMessageGroup = await axios.post(
        `${import.meta.env.VITE_API}/createMessageGroup`,
        {
          teamId: newTeamId,
          name: "General",
          members: [],
          createdBy: userId,
          isGeneral: true,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Message group created successfully:", createMessageGroup);

      succesMsg("Team created successfully!");
      fetchTeams();

      handleClose();
    } catch (error) {
      console.error("Error submitting form:", error);
      errMsg(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
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
      setTeams(
        data.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      );
    } catch (error) {
      console.log(`Error fetching teams: ${error}`);
    }
  };

  const leaveteam = async (teamId, userId) => {
    const confirmLeave = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to access this team after leaving!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, leave team",
    });

    if (confirmLeave.isConfirmed) {
      try {
        const token = getToken(authState);
        const response = await axios.post(
          `${import.meta.env.VITE_API}/leaveTeam/${teamId}/${userId}`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log("Leave Team Response:", response);
        succesMsg("Left team successfully!");
      } catch (error) {
        console.error("Error leaving team:", error);
        errMsg(`Error: ${error.message}`);
      } finally {
        setRefresh(!refresh);
      }
    }
  };

  useEffect(() => {
    fetchTeams();
  }, [showPopup, refresh]);

  return (
    <div className="home">
      <div className="team-container">
        <div className="createNewTeam" onClick={handleShow}>
          <div className="left">
            <i className="fa-solid fa-plus"></i>
          </div>
          <div className="right">
            <div className="title">Create New Team</div>
            <div className="description">Invite members by their email</div>
          </div>
        </div>
        {teams &&
          teams.length > 0 &&
          teams.map((team) => (
            <Link
              to={!team.isDisabled ? `/main/${team._id}` : "/main"}
              className="team"
              key={team._id}
              onClick={
                !team.isDisabled
                  ? () => dispatch(setTeamId(team._id))
                  : () =>
                      Swal.fire(
                        "Team is disabled",
                        "Please contact the team admin to enable the team",
                        "warning"
                      )
              }
            >
              <div
                className="menu"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setActiveMenu(activeMenu === team._id ? null : team._id); // Toggle only the clicked team menu
                }}
              >
                <i className="fa-solid fa-ellipsis-vertical"></i>
                {activeMenu === team._id && ( // Show menu only for the active team
                  <div className="buttons">
                    <button
                      className="invite-user"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleInviteShow();
                      }}
                    >
                      <i className="fa-solid fa-user-plus"></i>
                      <span className="label">Invite User</span>
                    </button>
                    <button
                      className="leave-team"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        leaveteam(team._id, user._id);
                      }}
                    >
                      <i className="fa-solid fa-right-from-bracket"></i>
                      <span className="label">Leave</span>
                    </button>
                  </div>
                )}
              </div>
              <div className="top">
                <div className="left">
                  {team.logo.url !== "" ? (
                    <img
                      src={team.logo.url || "/images/default-team-logo.png"}
                      alt="Team Logo"
                      className="team-logo"
                    />
                  ) : (
                    <span className="team-logo">{team?.name[0]}</span>
                  )}
                </div>
                <div className="right">
                  <div className="team-name">
                    <div className="title">{team?.name}</div>
                  </div>
                  <div className="team-details">
                    <div className="team-detail">
                      <i className="fa-solid fa-user"></i>
                      {
                        team?.members?.filter((member) => !member.leaveAt)
                          .length
                      }
                    </div>
                    {team?.isDisabled ? (
                      <div className="team-detail">
                        <i class="fa-solid fa-triangle-exclamation inactive"></i>
                        <span className="disabled">This team has been Disabled</span>
                      </div>
                    ) : (
                      <div className="team-detail">
                        <i
                          className={`fa-solid fa-circle-dot ${
                            team?.isActive ? "active" : "inactive"
                          }`}
                        ></i>
                        <span className="active-status">
                          {team?.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="bottom">
                <div className="created-at">
                  Last Modified {moment(team?.updatedAt).fromNow()}
                </div>
              </div>
            </Link>
          ))}
      </div>
      <AddTeamForm
        show={showPopup}
        handleClose={handleClose}
        handleSubmit={handleSubmit}
        initialData={initialData}
        authState={authState}
        isLoading={isLoading}
      />
      <InviteMemberPopUp
        show={showInvitePopup}
        handleClose={handleInviteClose}
        authState={authState}
        currentTeamId={activeMenu}
      />
    </div>
  );
}

export default Home;
