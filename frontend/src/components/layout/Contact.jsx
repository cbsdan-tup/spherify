import React, { useState } from 'react';
import axios from 'axios';
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
  const [submitStatus, setSubmitStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const errors = validateForm();
    setFormErrors(errors);

    if (Object.keys(errors).length === 0) {
      setIsSubmitting(true);
      setSubmitStatus(null);
      
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_API}/contact/submit`, 
          formData
        );
        
        const data = response.data;
        
        if (data.success) {
          setSubmitStatus({
            type: 'success',
            message: data.message || 'Thank you! Your message has been sent successfully.'
          });
          
          // Reset form after submission
          setFormData({
            name: '',
            email: '',
            number: '',
            subject: '',
            message: ''
          });
        } else {
          setSubmitStatus({
            type: 'error',
            message: data.message || 'Failed to send message. Please try again.'
          });
        }
      } catch (error) {
        console.error('Error submitting form:', error);
        setSubmitStatus({
          type: 'error',
          message: error.response?.data?.message || 'Network error. Please check your connection and try again.'
        });
      } finally {
        setIsSubmitting(false);
      }
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
            disabled={isSubmitting}
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
            disabled={isSubmitting}
          />
          {formErrors.email && <span className="error-message">{formErrors.email}</span>}
        </div>
        
        <div className="form-group">
          <label>Subject (Optional)</label>
          <input
            type="text"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            disabled={isSubmitting}
          />
        </div>
    
        <div className="form-group">
          <label>Message</label>
          <textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            className={formErrors.message ? 'error' : ''}
            disabled={isSubmitting}
          ></textarea>
          {formErrors.message && <span className="error-message">{formErrors.message}</span>}
        </div>
    
        {submitStatus && (
          <div className={`submit-status ${submitStatus.type}`}>
            {submitStatus.message}
          </div>
        )}
    
        <button type="submit" className="submit-button" disabled={isSubmitting}>
          {isSubmitting ? 'Sending...' : 'Send Message'}
        </button>
      </form>
    
      {/* Add icon on the right side */}
      <div className="contact-icon">
        <img src="/images/contact-icon.png" alt="Contact Icon" />
      </div>
    </div>
  );
};

export default Contact;
