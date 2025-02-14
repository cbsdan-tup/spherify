import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

const ProjectManagementTool = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const teamId = useSelector((state) => state.team?.currentTeamId);

  const handleToolClick = () => {
    setIsExpanded(!isExpanded);
  };

  const navigateTo = (path) => {
    if (teamId) {
      navigate(`/main/${teamId}/${path}`);
    } else {
      console.error('Team ID not found');
    }
  };

  return (
    <div className="tool-container custom-text-white">
      <div className="header" onClick={handleToolClick}>
        <i className={`fa-solid arrow fa-arrow-${isExpanded ? 'down' : 'right'}`}></i>
        <span className="tool-title">Project Management</span>
      </div>
      {isExpanded && (
        <div className="tool-content">
          <div className="chat" onClick={() => navigateTo('calendar')}>
            <i className="fa-solid fa-calendar icon"></i>
            <span className="label">Calendar</span>
          </div>
          <div className="chat" onClick={() => navigateTo('kanban')}>
            <i className="fa-solid fa-columns icon"></i>
            <span className="label">Kanban Board</span>
          </div>
          <div className="chat" onClick={() => navigateTo('gantt')}>
            <i className="fa-solid fa-chart-gantt icon"></i>
            <span className="label">Gantt Chart</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectManagementTool;
