import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { logout } from "../../utils/helper";
import AddTeamForm from "../main/AddTeamForm";
import { getToken } from "../../utils/helper";

const LeftPanel = () => {
  const [showPopup, setShowPopup] = useState(false);
  const navigate = useNavigate();

  const initialData = {
    nickname: "",
    role: "member",
    isAdmin: false,
  };

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

  const handleShow = () => setShowPopup(true);
  const handleClose = () => setShowPopup(false);

  const handleSubmit = (data) => {
    console.log("Form Data:", data);
    const handleSubmit = async (data) => {
      try {
        const token = getToken(); // Assuming getToken() retrieves the auth token

        const formData = new FormData();
        formData.append("name", data.teamName);
        formData.append("description", data.description);
        formData.append("nickname", data.nickname);
        if (data.logo) {
          formData.append("logo", data.logo); 
        }

        if (data.membersEmail)  {
          formData.append("members", JSON.stringify(data.membersEmail));
        }

        const response = await fetch("http://localhost:4000/api/v1/addTeam", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`, 
            "Content-Type": "multipart/form-data",
          },
          body: formData, 
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Failed to create team");
        }

        console.log("Team created successfully:", result);
        alert("Team created successfully!");

        handleClose();
      } catch (error) {
        console.error("Error submitting form:", error);
        alert(`Error: ${error.message}`);
      }
    };

    handleClose();
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
      <button className="add-button" onClick={handleShow}>
        <i className="fa-solid fa-plus plus-icon"></i>
      </button>
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
      <AddTeamForm
        show={showPopup}
        handleClose={handleClose}
        handleSubmit={handleSubmit}
        initialData={initialData}
      />
    </div>
  );
};

export default LeftPanel;
