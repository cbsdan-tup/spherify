import React, { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import {
  errMsg,
  getUser,
  handleAvatarChange,
  succesMsg,
} from "../../utils/helper";
import { updateUser } from "../../redux/authSlice";

function Settings() {
  const authState = useSelector((state) => state.auth);
  const user = getUser(authState);
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(user.avatar.url);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isUserUpdating, setIsUserUpdating] = useState(false);

  const [enableUpdateProfile, setEnableUpdateProfile] = useState(false);
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);

  const handleEnableUpdate = (e) => {
    e.preventDefault();
    setEnableUpdateProfile(!enableUpdateProfile);
  };

  let dispatch = useDispatch();

  const handleEditClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];

    if (file && (file.type === "image/jpeg" || file.type === "image/png")) {
      setSelectedFile(file);

      // Get the preview URL
      const newAvatarUrl = await handleAvatarChange(event);
      setPreviewUrl(newAvatarUrl);

      document.querySelector(".save").classList.remove("d-none");
    }
  };

  const handleSaveClick = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("avatar", selectedFile);

    try {
      setIsProfileSaving(true);
      const result = await axios.put(
        `${import.meta.env.VITE_API}/updateAvatar/${authState.user._id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${authState.token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log("Avatar updated successfully", result.data);
      succesMsg("Avatar updated successfully");

      dispatch(updateUser(result.data.user));
      document.querySelector(".save").classList.add("d-none");
    } catch (error) {
      console.error("Failed to update avatar", error);
      errMsg("Failed to update avatar", error);
    } finally {
      setIsProfileSaving(false);
    }
  };

  const handleProfileSaveClick = async () => {
    try {
      setIsUserUpdating(true);
      const result = await axios.put(
        `${import.meta.env.VITE_API}/updateUser/${authState.user._id}`,
        { firstName, lastName },
        {
          headers: {
            Authorization: `Bearer ${authState.token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Profile updated successfully", result.data);
      succesMsg("Profile updated successfully");

      dispatch(updateUser(result.data.user));
      setEnableUpdateProfile(false);
    } catch (error) {
      console.error("Failed to update profile", error);
      errMsg("Failed to update profile", error);
    } finally {
      setIsUserUpdating(false);
    }
  };

  return (
    <div className="settings">
      <h1 className="title">Settings</h1>
      <hr className="divider" />
      <div className="account">
        <div className="card mb-3">
          <div className="row g-0 profile-card">
            <div className="col-md-4 profile">
              <div className="profile-image">
                {previewUrl || user?.avatar?.url ? (
                  <img
                    src={previewUrl || user?.avatar?.url}
                    className="img-fluid rounded-start"
                    alt="User Avatar"
                  />
                ) : (
                  <i className="fa-solid fa-user default-profile"></i>
                )}
                <button className="edit" onClick={handleEditClick}>
                  <i className="fa-solid fa-pen"></i>
                </button>
                <button
                  className="save d-none"
                  onClick={handleSaveClick}
                  disabled={isProfileSaving}
                >
                  {isProfileSaving ? "Saving..." : "Save"}
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg, image/png"
                  className="d-none"
                  onChange={handleFileChange}
                />
              </div>
            </div>
            <div className="col-md-8">
              <div className="card-body">
                <h5 className="card-title fw-bold">
                  {user.firstName} {user.lastName}
                </h5>
                <p className="card-text m-0 mb-1">
                  <small className="text-muted">{user.email}</small>
                </p>
                <p className="card-text m-0">
                  <small className="text-muted">
                    Joined since {" "}
                    {new Date(user.createdAt).toLocaleString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}{" "}
                  </small>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="settings-form">
        <div className="card">
          <div className="card-body">
            <h5 className="card-title">Account Settings</h5>
            <form>
              <div className="mb-3">
                <label htmlFor="firstName" className="form-label">
                  First Name
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={!enableUpdateProfile}
                />
              </div>
              <div className="mb-3">
                <label htmlFor="lastName" className="form-label">
                  Last Name
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={!enableUpdateProfile}
                />
              </div>
              <button className="edit" onClick={handleEnableUpdate}>
                {enableUpdateProfile ? (
                  "Cancel"
                ) : (
                  <i className="fa-solid fa-pen"></i>
                )}
              </button>
            </form>
            <div className="button-group">
              {enableUpdateProfile && (
                <button
                  className="save"
                  onClick={handleProfileSaveClick}
                  disabled={!enableUpdateProfile || isUserUpdating}
                >
                  {isUserUpdating ? "Saving..." : "Save"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
