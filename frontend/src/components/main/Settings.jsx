import React from "react";
import { getUser } from "../../utils/helper";

function Settings() {
  const user = getUser();

  return (
    <>
      <div className="settings">
        <h1 className="title">Settings</h1>
        <hr className="divider" />
        <div className="account">
          <div className="card mb-3">
            <div className="row g-0 profile-card">
              <div className="col-md-4 profile">
                <div className="profile-image">
                {user.avatar.url ? (
                  <img src={user.avatar.url} className="img-fluid rounded-start" alt="User Avatar" />
                ) : (
                  <i className="fa-solid fa-user default-profile"></i>
                )} 
                </div>
              </div>
              <div className="col-md-8">
                <div className="card-body">
                  <h5 className="card-title">{user.firstName} {user.lastName}</h5>
                  <p className="card-text"><small className="text-muted">Email: {user.email}</small></p>
                  <p className="card-text"><small className="text-muted">Joined: {new Date(user.createdAt).toLocaleDateString()}</small></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Settings;