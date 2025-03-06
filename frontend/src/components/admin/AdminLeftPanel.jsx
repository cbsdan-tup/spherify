import React from "react";
import { Link, useLocation } from "react-router-dom";

const AdminLeftPanel = () => {
  const location = useLocation();
  const path = location.pathname;

  // Menu items array with icons and paths
  const menuItems = [
    { id: 1, name: "Dashboard", icon: "fa-tachometer-alt", path: "/admin/dashboard" },
    { id: 2, name: "User Management", icon: "fa-users", path: "/admin/user-management" },
    { id: 3, name: "Team Management", icon: "fa-user-friends", path: "/admin/team-management" },
    { id: 4, name: "File Management", icon: "fa-file-alt", path: "/admin/file-management" },
    { id: 5, name: "Site Settings", icon: "fa-cog", path: "/admin/settings" },
    // Add more menu items as needed
  ];

  return (
    <div className="admin-left-panel">
      <div className="admin-logo">
        <img src="/images/white-logo.png" alt="Spherify Admin" />
      </div>
      <div className="admin-menu">
        {menuItems.map((item) => (
          <Link
            key={item.id}
            to={item.path}
            className={`admin-menu-item ${path === item.path ? "active" : ""}`}
          >
            <i className={`fas ${item.icon}`}></i>
            <span>{item.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AdminLeftPanel;
