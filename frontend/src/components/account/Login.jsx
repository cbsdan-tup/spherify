import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../config/firebase-config";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import axios from "axios";
import { authenticate, errMsg, succesMsg } from "../../utils/helper";
import { Link } from "react-router-dom";
import SignInwithGoogle from "./SignWithGoogle";
import { toast } from "react-toastify";

const Login = () => {
  const [loading, setLoading] = useState(false);

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

      if (response.success) {
        const userInfo = {
          token: idToken,
          user: response.user,
        };
        succesMsg("Login Successfully!");
        authenticate(userInfo, () => (window.location = "/"));
      } else {
        errMsg("Login Failed");
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
    <div>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting, errors }) => (
          <Form>
            <h1 className="py-3">Login to your Account</h1>
            <div>
              <Field
                type="email"
                name="email"
                placeholder="Email"
              />
              <ErrorMessage
                name="email"
                component="div"
                className="text-danger text-start"
              />
            </div>

            <div>
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
              style={{ width: "250px" }}
            >
              {loading ? "Loading..." : "Log In"}
            </button>
            <SignInwithGoogle method="Sign In" />
          </Form>
        )}
      </Formik>
      <p>
        Not yet have an account? <Link to="/register">Register here</Link>
      </p>
    </div>
  );
};

export default Login;
