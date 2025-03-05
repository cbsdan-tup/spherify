import React, { useEffect } from 'react';
import "../index.css";
import { Link } from 'react-router-dom';
import { createInfiniteScroll } from '../functions/Homefunctions';
import Contact from './layout/Contact';
import Footer from './layout/Footer';

// import { Canvas } from '@react-three/fiber';
// import { OrbitControls, useGLTF } from '@react-three/drei';


const Home = () => {
  useEffect(() => {
    const carousel = document.querySelector('.features-grid');
    if (carousel) {
      createInfiniteScroll(carousel);
    }
  }, []);

  // const Model = () => {
  //   // Load the GLTF model
  //   const { scene } = useGLTF('/3d-assets/model.glb');  // Path to your GLB model
  
  //   return (
  //     <primitive object={scene} scale={0.5} position={[0, -1, 0]} />
  //   );
  // };

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
        {/* <div className="illustration-section">
      <div className="canvas-container">
        <Canvas style={{ height: '100vh', width: '100%' }}>
          <ambientLight intensity={0.5} />
          <spotLight position={[10, 10, 10]} angle={0.15} intensity={1} />
          
          <Model />
          
          <OrbitControls />
        </Canvas>
      </div>
    </div> */}


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
          <div className="features-carousel">
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
              src="/images/Data Analytics.png"
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

    {/* About Section */}
    <section className="about" id="about">
  <div className="box-container">
  <h2 className="deco-title">Our Story</h2>
    <div className="image">
      <img src="/images/about us.png" alt="About Us" />
    </div>
    <div className="content">
      <h3 className="title">Spherify: Empowering Teams to Collaborate Better</h3>
      <p>
        At Spherify, we believe that effective collaboration is the key to success.
        Our platform was designed with one goal in mind: to simplify the way teams work together,
        no matter where they are. With powerful tools for task management, real-time communication,
        and seamless file sharing, Spherify ensures that your team stays on track and productive from start to finish.
      </p>
      <div className="icons-container">
        <div className="icons">
          <img src="/images/icon-connect.png" alt="We Connect" />
          <h3>We Connect</h3>
        </div>
        <div className="icons">
          <img src="/images/icon-organize.png" alt="We Organize" />
          <h3>We Organize</h3>
        </div>
        <div className="icons">
          <img src="/images/icon-analyze.png" alt="We Analyze" />
          <h3>We Analyze</h3>
        </div>
      </div>
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
            <img src="/images/step 1.png" alt="Icon" className="iconss" /> {/* This is your PNG icon */}
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
            <img src="/images/step 2.png" alt="Icon" className="iconss" /> {/* This is your PNG icon */}
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
            <img src="/images/step 3.png" alt="Icon" className="iconss" /> {/* This is your PNG icon */}
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
            <img src="/images/step 4.png" alt="Icon" className="iconss" /> {/* This is your PNG icon */}
              <h3>Step 4: Analyze Data</h3>
            </div>
          </div>
          <div className="face face2">
            <p>Utilize our built-in data analytics tools to track performance and improve team efficiency. Make informed decisions for your projects.</p>
          </div>
        </div>
      </div>
    </section>

    {/* Mission & Vision Section */}
    <section className="mission-banner">
      <div className="mission-row">
        <div className="mission-content">
          <h3>Our Mission </h3> {/* Focused on Mission */}
          <p>
          Our mission is to simplify the way software developers collaborate and work together, providing powerful tools for task management, 
          real-time communication, and seamless file sharing to ensure success and productivity for teams in universities.
          </p>

          <h3>Our Vision</h3> {/* Focused on Mission */}
          <p>
          To be the top platform for team collaboration,
          making teamwork easier for businesses around the world by 
          constantly improving our tools for communication and productivity.
          </p>
        </div>
        <div className="image">
          <img src="images/banner_1.png" alt="Mission Banner" />
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
                <p className="developer-description">Full Stack Developer</p> {/* Added description */}
            </div>
            <div className="developer-card">
                <img
                    src="/images/diaz.png"
                    alt="Romel Diaz"
                    className="developer-img"
                />
                <p>Diaz, Romel</p>
                <p className="developer-description">Front-End Specialist</p> {/* Added description */}
            </div>
            <div className="developer-card">
                <img
                    src="/images/lebosada.png"
                    alt="Jury Lebosada"
                    className="developer-img"
                />
                <p>Lebosada, Jury</p>
                <p className="developer-description">Back-End Developer</p> {/* Added description */}
            </div>
            <div className="developer-card">
                <img
                    src="/images/esquivel.png"
                    alt="Cassley Esquivel"
                    className="developer-img"
                />
                <p>Esquivel, Cassley</p>
                <p className="developer-description">UI/UX Designer</p> {/* Added description */}
            </div>
        </div>
    </section>

    {/* Contact Section */}
    <Contact />

    {/* Footer Section */}
    <Footer />

    </div>
  );
};

export default Home;
