import React from "react";

function Footer() {
  return (
    <section className="footer">
      <div className="footer-box-container">
        <div className="footer-box">
          <h3>
            <i className="fas fa-cogs"></i> Spherify
          </h3>
          <p>Uniting Your Team
          In One Sphere.</p>
          
        </div>

        <div className="footer-box">
          <h3>Contact Info</h3>
          <a href="#" className="links">
            <i className="fas fa-phone"></i> 1245-147-2589
          </a>
          <a href="#" className="links">
            <i className="fas fa-phone"></i> 1245-147-2589
          </a>
          <a href="mailto:spherify.unity@gmail.com" className="links">
            <i className="fas fa-envelope"></i> spherify.unity@gmail.com
          </a>
          <a href="#" className="links">
            <i className="fas fa-map-marker-alt"></i> Taguig City, Philippines
          </a>
        </div>

        <div className="footer-box">
          <h3>Quick links</h3>
          <a href="#" className="links">
            <i className="fas fa-arrow-right"></i> Features
          </a>
          <a href="#" className="links">
            <i className="fas fa-arrow-right"></i> About
          </a>
          <a href="#" className="links">
            <i className="fas fa-arrow-right"></i> How to use Spherify
          </a>
          <a href="#" className="links">
            <i className="fas fa-arrow-right"></i> Our Mission and Vision
          </a>
          <a href="#" className="links">
            <i className="fas fa-arrow-right"></i> Developers
          </a>
        </div>

        <div className="footer-box">
          <h3>Newsletter</h3>
          <p>subscribe for latest updates</p>
          <input type="email" placeholder="Your Email" className="email" />
          <a href="#" className="btn">
            subscribe
          </a>
          <div className="share">
            <a href="#" className="fab fa-facebook-f"></a>
            <a href="#" className="fab fa-twitter"></a>
            <a href="#" className="fab fa-instagram"></a>
            <a href="#" className="fab fa-linkedin"></a>
          </div>
        </div>
      </div>

      <div className="credit">
        &copy; 2025 Spherify. All rights reserved by{" "}
        <a href="#" className="link">
          Spherify
        </a>
      </div>
    </section>
  );
}

export default Footer;
