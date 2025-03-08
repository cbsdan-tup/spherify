import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../config/firebase-config";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import axios from "axios";
import { authenticate, errMsg, succesMsg, socket } from "../../utils/helper";
import { Link } from "react-router-dom";
import SignInwithGoogle from "./SignWithGoogle";
import { toast } from "react-toastify";
import "../../index.css";
import { useDispatch } from "react-redux";
import Swal from "sweetalert2";

const Login = () => {
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();

  const initialValues = {
    email: "",
    password: "",
  };

  const validationSchema = Yup.object({
    email: Yup.string().email("Invalid email address").required("Required"),
    password: Yup.string().required("Required"),
  });

  const handleSubmit = async (values, { setSubmitting, setErrors }) => {
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );
      const idToken = await result.user.getIdToken();
      const config = {
        headers: {
          "Content-Type": "application/json",
        },
      };
      const url = `${import.meta.env.VITE_API}/getUserInfo`;
      const { data: response } = await axios.post(
        url,
        { uid: result.user.uid },
        config
      );

      if (response.success && !response.user.isDisable) {
        const userInfo = {
          token: idToken,
          user: response.user,
        };
        
        // Log the login activity
        try {
          await axios.post(
            `${import.meta.env.VITE_API}/logLogin/${response.user._id}`,
            {
              deviceInfo: navigator.userAgent,
              location: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            config
          );
        } catch (logError) {
          console.error("Error logging login:", logError);
        }
        
        // Emit login event to update user status 
        // socket.emit("login", response.user._id);
        
        succesMsg("Login Successfully!");
        authenticate(userInfo, dispatch, () => (window.location = "/main"));
      } else {
        errMsg("Login Failed");
        if (response.user.isDisable) {
          const disableEndTime = new Date(
            response.user.disableEndTime
          ).toLocaleString("en-US", {
            month: "2-digit",
            day: "2-digit",
            year: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
          Swal.fire(
            "Account Disabled",
            `Your account has been disabled because ${response.user.disableReason}. You can log in back again until ${disableEndTime}`
          );
          return;
        }
      }
    } catch (error) {
      if (
        error.response &&
        error.response.status >= 400 &&
        error.response.status <= 500
      ) {
        if (
          error.response.data.errors &&
          Array.isArray(error.response.data.errors)
        ) {
          error.response.data.errors.forEach((error) => {
            toast.error(error, {
              position: "bottom-right",
            });
          });
        }
        setErrors({ submit: error.response.data.message });
      } else if (error.message) {
        errMsg("Login Failed");
      }
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-logo-section">
          <img
            src="/images/Logo 1.png"
            alt="Spherify Logo"
            className="login-logo"
          />
        </div>
        <div className="login-form-section">
          <h2>Welcome Back!</h2>
          <p>Connect, Code, Create—Let’s Get Started.</p>

          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting, errors }) => (
              <Form className="login-form">
                <div className="login-input-group">
                  <label htmlFor="email">Email</label>
                  <Field
                    type="email"
                    name="email"
                    placeholder="Example@email.com"
                  />
                  <ErrorMessage
                    name="email"
                    component="div"
                    className="text-danger text-start"
                  />
                </div>

                <div className="login-input-group">
                  <label htmlFor="password">Password</label>
                  <Field
                    type="password"
                    name="password"
                    placeholder="Password"
                  />
                  <ErrorMessage
                    name="password"
                    component="div"
                    className="text-danger text-start"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || loading}
                  className="login-sign-in-button"
                >
                  {loading ? "Loading..." : "Sign in"}
                </button>
              </Form>
            )}
          </Formik>
          <div className="login-divider">
            <span>Or</span>
          </div>

          <SignInwithGoogle method="Sign In" />
          <p className="login-signup-text">
            Don’t have an account? <a href="/register">Sign Up</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
