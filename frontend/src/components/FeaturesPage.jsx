import React from "react";
import "../index.css";

const FeaturesPage = () => {
  return (
    <div className="features-page">

      <section className="features-section">
        <h2 className="features-heading">
          <span className="highlight">Spherify</span> provides the tools
          necessary for your team!
        </h2>
        <hr className="section-divider" />
        <div className="features-grid">
          <div className="feature-item">
            <img
              src="/images/chats.png"
              alt="Chats"
              className="feature-video"
              autoPlay
              loop
              muted
            />
            <p>Chats</p>
          </div>

          <div className="feature-item">
            <img
              src="/images/video call.png"
              alt="Video Calls"
              className="feature-video"
              autoPlay
              loop
              muted
            />
            <p>Video Calls</p>
          </div>

          <div className="feature-item">
            <img
              src="/images/file sharing.png"
              alt="File Sharing"
              className="feature-video"
              autoPlay
              loop
              muted
            />
            <p>File Sharing</p>
          </div>

          <div className="feature-item">
            <img
              src="/images/management tools.png"
              alt="Management Tools"
              className="feature-video"
              autoPlay
              loop
              muted
            />
            <p>Management Tools</p>
          </div>

          <div className="feature-item">
            <img
              src="/images/data analytics.png"
              alt="Data Analytics"
              className="feature-video"
              autoPlay
              loop
              muted
            />
            <p>Data Analytics</p>
          </div>

          <div className="feature-item">
            <img
              src="/images/role managemnet.png"
              alt="Role Assignment"
              className="feature-video"
              autoPlay
              loop
              muted
            />
            <p>Role Assignment</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FeaturesPage;
