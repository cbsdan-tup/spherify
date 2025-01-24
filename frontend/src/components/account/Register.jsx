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
    <div>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ setFieldValue, isSubmitting, errors }) => (
          <Form >
            <h1>Create Account</h1>
            <div>
              <Field
                type="text"
                name="firstName"
                placeholder="First Name"
              />
              <ErrorMessage
                name="firstName"
                component="div"
                className="text-danger"
              />
            </div>

            <div>
              <Field
                type="text"
                name="lastName"
                placeholder="Last Name"
              />
              <ErrorMessage
                name="lastName"
                component="div"
                className="text-danger"
              />
            </div>

            <div>
              <Field
                type="email"
                name="email"
                placeholder="Email"
              />
              <ErrorMessage
                name="email"
                component="div"
                className="text-danger"
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
                className="text-danger"
              />
            </div>

            <div>
              <input
                type="file"
                name="avatar"
                accept="image/jpeg, image/jpg, image/png"
                onChange={(event) =>
                  setFieldValue("avatar", event.currentTarget.files[0])
                }
              />
              <ErrorMessage
                name="avatar"
                component="div"
                className="text-danger"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting || loading}
            >
              {loading ? "Loading..." : "Sign Up"}
            </button>
          </Form>
        )}
      </Formik>
      <SignWithGoogle method="Sign Up" />
      <p>
        Have an account? <Link to="/login">Login here</Link>
      </p>
    </div>
  );
};

export default Register;
