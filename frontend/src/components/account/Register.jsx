import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../config/firebase-config";
import { toast } from "react-toastify";
import { errMsg } from "../../utils/helper";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import SignWithGoogle from "./SignWithGoogle";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import "../../index.css";

const Register = () => {
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const initialValues = {
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    avatar: null,
  };

  const validationSchema = Yup.object({
    firstName: Yup.string().required("First Name is required"),
    lastName: Yup.string().required("Last Name is required"),
    email: Yup.string()
      .email("Invalid email address")
      .required("Email is required"),
    password: Yup.string()
      .min(6, "Password must be at least 6 characters")
      .required("Password is required"),
    avatar: Yup.mixed().nullable(),
  });

  const handleSubmit = async (values, { setSubmitting, setErrors }) => {
    setLoading(true);
    try {
      const { firstName, lastName, email, password, avatar } = values;
      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = auth.currentUser;

      const formData = new FormData();
      formData.append("uid", user.uid);
      formData.append("firstName", firstName);
      formData.append("lastName", lastName);
      formData.append("email", email);
      formData.append("password", password);
      if (avatar) formData.append("avatar", avatar);

      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      };

      // Send the form data to the backend
      await axios.post(
        `${import.meta.env.VITE_API}/register`,
        formData,
        config
      );

      toast.success("User Registered Successfully!", {
        position: "bottom-right",
      });

      navigate("/login");
    } catch (error) {
      if (
        error.response &&
        error.response.status >= 400 &&
        error.response.status <= 500
      ) {
        const { errors, message } = error.response.data;
        if (errors) {
          errors.forEach((err) => {
            toast.error(err, {
              position: "bottom-right",
            });
          });
        }
        setErrors({ submit: message });
      }
      if (error.message) {
        errMsg("Error " + error.message);
      }
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-form-section">
          <h2>Register your account!</h2>
          <p>Together We Build, Together We Innovate.</p>
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ setFieldValue, isSubmitting, errors }) => (
              <Form className="register-form">
                <div className="register-input-group">
                  <label htmlFor="name">Name</label>
                  <div className="input-icon">
                    <i className="fas fa-user"></i> {/* User Icon */}
                    <Field
                      type="text"
                      name="firstName"
                      placeholder="First Name"
                    />
                    <Field
                      type="text"
                      name="lastName"
                      placeholder="Last Name"
                    />
                  </div>
                  <div className="user-name-error">
                    <ErrorMessage
                      name="firstName"
                      component="div"
                      className="text-danger"
                    />
                    <ErrorMessage
                      name="lastName"
                      component="div"
                      className="text-danger"
                    />
                  </div>
                </div>

                <div className="register-input-group">
                  <label htmlFor="email">Email</label>
                  <div className="input-icon">
                    <i className="fas fa-envelope"></i>
                    <Field
                      type="email"
                      name="email"
                      placeholder="Example@email.com"
                    />
                  </div>
                  <ErrorMessage
                    name="email"
                    component="div"
                    className="text-danger"
                  />
                </div>

                <div className="register-input-group">
                  <label htmlFor="password">Password</label>
                  <div className="input-icon">
                    <i className="fas fa-lock"></i>
                    <Field
                      type="password"
                      name="password"
                      placeholder="Password"
                    />
                  </div>
                  <ErrorMessage
                    name="password"
                    component="div"
                    className="text-danger"
                  />
                </div>

                <button
                  type="submit"
                  className="register-sign-up-button"
                  disabled={isSubmitting || loading}
                >
                  {loading ? "Loading..." : "Sign Up"}
                </button>
              </Form>
            )}
          </Formik>

          <div className="register-divider">
            <span>Or</span>
          </div>
          <SignWithGoogle method="Sign Up" />
          <p className="register-login-text">
            Already have an account? <Link to="/login">Sign In</Link>
          </p>
        </div>
        <div className="register-logo-section">
          <img
            src="/images/Logo 1.png"
            alt="Spherify Logo"
            className="register-logo"
          />
        </div>
      </div>
    </div>
  );
};

export default Register;
