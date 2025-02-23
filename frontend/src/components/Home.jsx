import React, { useEffect } from 'react';
import "../index.css";
import { Link } from 'react-router-dom';
import { createInfiniteScroll } from '../functions/Homefunctions';


const Home = () => {
  useEffect(() => {
    const carousel = document.querySelector('.features-grid');
    if (carousel) {
      createInfiniteScroll(carousel);
    }
  }, []);

  return (
    <div className="landing-page">
      <main className="main-content">
        {/* Main text section */}
        <div className="text-section">
          <h1>
            Spherify <br />
            <span>Uniting Your Team <br />In One Sphere</span>
          </h1>
          <div className="cta-buttons">
            <Link to="/login">
              <button className="login-button">
                Get Started!
              </button>
            </Link>
          </div>  
        </div>

        {/* Illustration Section */}
        <div className="illustration-section">
          <div className="video-container">
            <video
              
              className="illustration-video"
              autoPlay
              loop
              muted
            />
          </div>
        </div>

        {/* Decorative Circles */}
        <div className="decorative-elements">
          <div className="green-circle"></div>
          <div className="green-circle small"></div>
          <div className="green-circle top-left"></div>
          <div className="green-circle top-center"></div>
          <div className="green-circle bottom-right"></div>
          <div className="green-circle center"></div>
        </div>
      </main>

       {/* Features Section */}
       <section className="features-section">
        <h2 className="features-heading">
          <span className="highlight">Features</span></h2>
          <div class="features-carousel">
        <div className="features-grid">
          <div className="feature-item">
            <img
              src="/images/chats.png"
              alt="Chats"
              className="feature-video"
            />
            <p>Chats</p>
          </div>

          <div className="feature-item">
            <img
              src="/images/video call.png"
              alt="Video Calls"
              className="feature-video"
            />
            <p>Video Calls</p>
          </div>

          <div className="feature-item">
            <img
              src="/images/file sharing.png"
              alt="File Sharing"
              className="feature-video"
            />
            <p>File Sharing</p>
          </div>

          <div className="feature-item">
            <img
              src="/images/management tools.png"
              alt="Management Tools"
              className="feature-video"
            />
            <p>Management Tools</p>
          </div>

          <div className="feature-item">
            <img
              src="/images/data analytics.png"
              alt="Data Analytics"
              className="feature-video"
            />
            <p>Data Analytics</p>
          </div>

          <div className="feature-item">
            <img
              src="/images/role managemnet.png"
              alt="Role Assignment"
              className="feature-video"
            />
            <p>Role Assignment</p>
          </div>
        </div>
      </div>  
      </section>


      {/* About Us Section */}
      <section className="about-section">
        <div className="about-content">
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
              Spherify is a dynamic team planning and collaboration platform
              designed for software developers.
            </h3>
            <p>
              Streamlines communication, task management, and workflow tracking
              in one centralized platform. With real-time collaboration, task
              coordination, and integrated tools for scheduling and productivity,
              it empowers development teams to boost efficiency, reduce delays,
              and enhance accountability.
            </p>
          </div>
        </div>
      </section>

    

    {/* How to Use Section */}
<section className="how-to-use-section">
  <h2 className="how-to-use-heading">
    How to Use <span className="highlight">Spherify</span>
  </h2>
  <div className="how-to-use-content">
    <div className="step">
      <div className="face face1">
        <div className="content">
          <h3>Step 1: Sign Up</h3>
        </div>
      </div>
      <div className="face face2">
        <p>Start by creating an account on our platform. It only takes a few moments to get started!</p>
      </div>
    </div>

    <div className="step">
      <div className="face face1">
        <div className="content">
          <h3>Step 2: Set Up Your Team</h3>
        </div>
      </div>
      <div className="face face2">
        <p>Invite your team members and set up your team workspace. Organize tasks, assign roles, and start collaborating.</p>
      </div>
    </div>

    <div className="step">
      <div className="face face1">
        <div className="content">
          <h3>Step 3: Start Collaborating</h3>
        </div>
      </div>
      <div className="face face2">
        <p>Use our chat, video calls, and file-sharing tools to collaborate in real-time. Stay connected and keep track of your team's progress.</p>
      </div>
    </div>

    <div className="step">
      <div className="face face1">
        <div className="content">
          <h3>Step 4: Analyze Data</h3>
        </div>
      </div>
      <div className="face face2">
        <p>Utilize our built-in data analytics tools to track performance and improve team efficiency. Make informed decisions for your projects.</p>
      </div>
    </div>
  </div>
</section>





      {/* Developers Section */}
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

export default Home;
