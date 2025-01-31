import React from "react";
import LeftPanel from "./layout/LeftPanel";
import RightMainPanel from "./layout/RightMainPanel";

function Main() {
  return (
    <>
      <LeftPanel />
      <div className="main-container">
        <div className="main">
          <h1 className="title">Welcome to Spherify!</h1>
          <span className="text">
            Open a team on the left side panel
            <br />
            or
            <br />
            Create a new team
          </span>
          <img className="spherify-logo" src="images/kamay.png" />
        </div>
      </div>
      <RightMainPanel />
    </>
  );
}

export default Main;
