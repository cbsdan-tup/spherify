import React from "react";

function Home() {
  return (
    <div className="home">
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
  );
}

export default Home;
