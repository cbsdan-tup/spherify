import React, { useEffect } from "react";
import TextChatTool from "../main/textchats/TextChatTool";
import ProjectManagementTool from "../main/projectmanagement/ProjectManagementTool";
import { useSelector } from "react-redux";


// import { useSelector } from "react-redux";
import Conferencing from "../main/conferencing/Conferencing";
function RightToolPanel() {
  const currentTeamId = useSelector((state) => state.team.currentTeamId);

  useEffect(() => {
    console.log("Current team ID:", currentTeamId);
  }, [currentTeamId]);
  return (
    <div className="right-tool-panel d-lg-block d-none">
      <h3>Tools</h3>
      <hr className="divider" />
      <TextChatTool />
      <Conferencing />
      <h5 className="tool-title custom-text-white">
        <i className="fa-solid fa-arrow-right arrow"></i>

        <span className="title">File Sharing</span>
      </h5>
      <ProjectManagementTool />
      <h5 className="tool-title custom-text-white">
        <i className="fa-solid fa-arrow-right arrow"></i>

        <span className="title">Live Editing</span>
      </h5>
    </div>
  );
}

export default RightToolPanel;
