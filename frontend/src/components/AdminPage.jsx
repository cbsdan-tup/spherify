import React, { useState } from "react";
import Header from "./admin/Header";
import LeftSidePanel from "./admin/LeftSidePanel";
import "./admin/Admin.css";
import Dashboard from "./admin/Dashboard";
import { Routes, Route } from "react-router-dom";
import Settings from "./main/Settings";
import UserManagement from "./admin/UserManagement";
import TeamManagement from "./admin/TeamManagement";
import Configurations from "./admin/Configurations";

const AdminPage = () => {
  const [isShowLeftPanel, setIsShowLeftPanel] = useState(true);

  return (
    <>
      <Header />
      <LeftSidePanel isShow={isShowLeftPanel} setIsShow={setIsShowLeftPanel} />
      <div className={`admin-page-content container ${!isShowLeftPanel ? "full" : ""}`}>
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="profile" element={<Settings />} />
          <Route path="user-management" element={<UserManagement />} />
          <Route path="team-management" element={<TeamManagement />} />
          <Route path="configurations" element={<Configurations />} />
        </Routes>
      </div>
      <div className={`show-panel ${isShowLeftPanel ? "hide" : ""}`} onClick={() => setIsShowLeftPanel(prev => !prev)}>
        <i className="fa-solid fa-right-left"></i>
        <span className="text">Show Panel</span>
      </div>
    </>
  );
};

export default AdminPage;
