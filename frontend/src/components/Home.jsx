import React from "react";
import { useNavigate } from "react-router-dom"; 
import "../index.css"; 

const Home = () => {
  const navigate = useNavigate(); 

  return (
    <div className="landing-page">
      <main className="main-content">
        <div className="text-section">
          <h1 style={{}}>
            Streamline <br />
            <span>Team Collaboration and Project Management Platform</span>
          </h1>
          <p>for Maximum Efficiency.</p>
          <div className="cta-buttons">
            <button
              className="login-button"
              onClick={() => navigate("/features")}
            >
              Learn More!
            </button>
          </div>
        </div>

        <div className="illustration-section">
          <div className="video-container">
            <video
              src="/images/logo-animation.mp4" 
              className="illustration-video"
              autoPlay
              loop
              muted
            />
          </div>
        </div>

        <div className="decorative-elements">
          <div className="green-circle"></div>
          <div className="green-circle small"></div>
          <div className="green-circle top-left"></div>
          <div className="green-circle top-center"></div>
          <div className="green-circle bottom-right"></div>
          <div className="green-circle center"></div>
        </div>
      </main>
    </div>
  );
};

export default Home;
