import React from "react";

function RightToolPanel() {
  return (
    <div className="right-tool-panel d-lg-block d-none">
      <h3>Tools</h3>
      <hr className="divider" />
      <h5 className="tool-title custom-text-white">
        <i className="fa-solid fa-arrow-right arrow"></i>
        <span className="title">Text Chats</span>
      </h5>
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
