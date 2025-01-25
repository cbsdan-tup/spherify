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
            <video
              src="/images/chats.mp4"
              alt="Chats"
              className="feature-video"
              autoPlay
              loop
              muted
            ></video>
            <p>Chats</p>
          </div>

          <div className="feature-item">
            <video
              src="/images/video call.mp4"
              alt="Video Calls"
              className="feature-video"
              autoPlay
              loop
              muted
            ></video>
            <p>Video Calls</p>
          </div>

          <div className="feature-item">
            <video
              src="/images/file transfer.mp4"
              alt="File Sharing"
              className="feature-video"
              autoPlay
              loop
              muted
            ></video>
            <p>File Sharing</p>
          </div>

          <div className="feature-item">
            <video
              src="/images/management tools.mp4"
              alt="Management Tools"
              className="feature-video"
              autoPlay
              loop
              muted
            ></video>
            <p>Management Tools</p>
          </div>

          <div className="feature-item">
            <video
              src="/images/data analytics.mp4"
              alt="Data Analytics"
              className="feature-video"
              autoPlay
              loop
              muted
            ></video>
            <p>Data Analytics</p>
          </div>

          <div className="feature-item">
            <video
              src="/images/role management.mp4"
              alt="Role Assignment"
              className="feature-video"
              autoPlay
              loop
              muted
            ></video>
            <p>Role Assignment</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FeaturesPage;
