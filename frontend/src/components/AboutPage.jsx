import React from "react";
import "../index.css"; 

const AboutPage = () => {
  return (
    <div className="about-page">
      <section className="about-section">
          <div className="about-content mt-5">
          <div className="about-image">
            <img
              src="/images/about us.png" 
              alt="About Us"
              className="about-img"
            />
          </div>

    <div className="about-text">
      <h2>About Us</h2>
      <h3>
        Spherify is a dynamic team planning and collaboration platform designed
        for software developers.
      </h3>
      <p>
        Streamlines communication, task management, and workflow tracking in
        one centralized platform. With real-time collaboration, task
        coordination, and integrated tools for scheduling and productivity, it
        empowers development teams to boost efficiency, reduce delays, and
        enhance accountability.
      </p>
    </div>
  </div>
</section>

      <section className="developers-section">
        <h2>Developers</h2>
        <div className="developers-grid">
          <div className="developer-card">
            <img
              src="/images/cabasa.png"
              alt="Daniel Cabasa"
              className="developer-img"
            />
            <p>Cabasa, Daniel</p>
          </div>
          <div className="developer-card">
            <img
              src="/images/diaz.png"
              alt="Romel Diaz"
              className="developer-img"
            />
            <p>Diaz, Romel</p>
          </div>
          <div className="developer-card">
            <img
              src="/images/lebosada.png"
              alt="Jury Lebosada"
              className="developer-img"
            />
            <p>Lebosada, Jury</p>
          </div>
          <div className="developer-card">
            <img
              src="/images/esquivel.png"
              alt="Cassley Esquivel"
              className="developer-img"
            />
            <p>Esquivel, Cassley</p>
          </div>
        </div>
      </section>

    </div>
  );
};

export default AboutPage;
