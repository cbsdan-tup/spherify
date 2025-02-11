import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const ProjectManagementTool = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();

  const handleToolClick = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="tool-container custom-text-white">
      <div className="header" onClick={handleToolClick}>
        <i
          className={
            isExpanded
              ? "fa-solid arrow fa-arrow-down"
              : "fa-solid arrow fa-arrow-right"
          }
        ></i>
        <span className="tool-title">Project Management</span>
      </div>
      {isExpanded && (
        <div className="tool-content">
          <div className="chat" onClick={() => navigate("/main/projectmanagement/calendar")}>
            <i className="fa-solid fa-calendar icon"></i>
            <span className="label">Calendar</span>
          </div>
          <div className="chat" onClick={() => navigate("/main/projectmanagement/kanban")}>
            <i className="fa-solid fa-columns icon"></i>
            <span className="label">Kanban Board</span>
          </div>
          <div className="chat" onClick={() => navigate("/main/projectmanagement/gantt")}>
            <i className="fa-solid fa-chart-gantt icon"></i>
            <span className="label">Gantt Chart</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectManagementTool;
