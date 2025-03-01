import React, { useState } from 'react';
import "../../index.css";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    number: '',
    subject: '',
    message: ''
  });
  const [formErrors, setFormErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const validateForm = () => {
    let errors = {};
    if (!formData.name) errors.name = 'Name is required';
    if (!formData.email) errors.email = 'Email is required';
    if (!formData.email.includes('@')) errors.email = 'Invalid email address';
    if (!formData.message) errors.message = 'Message is required';
    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const errors = validateForm();
    setFormErrors(errors);

    if (Object.keys(errors).length === 0) {
      // Submit the form data, for example, using an API call or sending an email
      console.log('Form submitted:', formData);
      // Reset form after submission
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: ''
      });
    }
  };

  return (
    <div className="contact-page">
    <form onSubmit={handleSubmit}>
      <div className="form-group">
      <h2>Contact Us</h2>
        <label>Name</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className={formErrors.name ? 'error' : ''}
        />
        {formErrors.name && <span className="error-message">{formErrors.name}</span>}
      </div>
  
      <div className="form-group">
        <label>Email</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className={formErrors.email ? 'error' : ''}
        />
        {formErrors.email && <span className="error-message">{formErrors.email}</span>}
      </div>
  
      <div className="form-group">
        <label>Message</label>
        <textarea
          name="message"
          value={formData.message}
          onChange={handleChange}
          className={formErrors.message ? 'error' : ''}
        ></textarea>
        {formErrors.message && <span className="error-message">{formErrors.message}</span>}
      </div>
  
      <button type="submit" className="submit-button">Send Message</button>

    </form>
  
    {/* Add icon on the right side */}
    <div className="contact-icon">
      <img src="/images/contact-icon.png" alt="Contact Icon" />
    </div>
  </div>

  );
};

export default Contact;
