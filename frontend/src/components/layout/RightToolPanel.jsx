import React, { useEffect } from "react";
import TextChatTool from "../main/textchats/TextChatTool";
import { useSelector } from "react-redux";
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
      <h5 className="tool-title custom-text-white">
        {" "}
        <i className="fa-solid fa-arrow-right arrow"></i>
        <span className="title">Conferencing</span>
      </h5>
      <h5 className="tool-title custom-text-white">
        <i className="fa-solid fa-arrow-right arrow"></i>

        <span className="title">File Sharing</span>
      </h5>
      <h5 className="tool-title custom-text-white">
        <i className="fa-solid fa-arrow-right arrow"></i>

        <span className="title">Project Management</span>
      </h5>
      <h5 className="tool-title custom-text-white">
        <i className="fa-solid fa-arrow-right arrow"></i>

        <span className="title">Live Editing</span>
      </h5>
    </div>
  );
}

export default RightToolPanel;
