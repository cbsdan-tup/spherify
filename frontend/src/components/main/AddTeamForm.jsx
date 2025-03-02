import React, { useEffect } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import axios from "axios";
import { getUser } from "../../utils/helper";

const PopupForm = ({ show, handleClose, handleSubmit, authState, isLoading }) => {
  const [isEmailValid, setIsEmailValid] = React.useState(false);
  const [isSearching, setIsSearching] = React.useState(false);
  const [isTyping, setIsTyping] = React.useState(false);
  const [memberInfo, setMemberInfo] = React.useState(null);

  if (!show) return null;

  const validationSchema = Yup.object({
    name: Yup.string().required("Team name is required"),
    // description: Yup.string(),
    logo: Yup.mixed().nullable(),
    membersEmail: Yup.array().of(
      Yup.object().shape({
        user: Yup.string().required(),
        nickname: Yup.string().required(),
      })
    ),
  });

  const searchUser = async (email) => {
    try {
      setIsSearching(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API}/getUserByEmail/${email}`
      );
      return response.data;
    } catch (error) {
      console.error("Error searching user:", error);
      return false;
    } finally {
      setIsSearching(false);
      setIsTyping(false);
    }
  };

  const currentUser = getUser(authState);

  return (
    <div
      className="modal d-block"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header custom-primary-bg custom-text-white">
            <h5 className="modal-title fw-bold">Add Your Team</h5>
            <button
              type="button"
              className="btn-close"
              onClick={handleClose}
              aria-label="Close"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          <Formik
            initialValues={{
              name: "",
              // description: "",
              logo: null,
              emailInput: "",
              membersEmail: [
                {
                  user: currentUser?._id,
                  nickname: `${currentUser?.firstName} ${currentUser?.lastName}`,
                  email: `${currentUser?.email}`,
                  avatar: currentUser.avatar.url
                    ? currentUser.avatar.url
                    : "/images/account.png",
                },
              ],
            }}
            validationSchema={validationSchema}
            onSubmit={(values, { resetForm }) => {
              handleSubmit(values);
              resetForm();
            }}
          >
            {({ values, setFieldValue }) => {
              useEffect(() => {
                const timer = setTimeout(async () => {
                  if (values.emailInput.includes("@")) {
                    const { user } = await searchUser(values.emailInput);
                    setIsEmailValid(!!user);
                    setMemberInfo(user);
                  } else {
                    setIsEmailValid(false);
                  }
                }, 1000);

                return () => clearTimeout(timer);
              }, [values.emailInput]);

              return (
                <Form>
                  <div className="modal-body">
                    <div>
                      {/* Team Name */}
                      <div className="mb-3">
                        <label
                          htmlFor="name"
                          className="form-label custom-text-header"
                        >
                          Team Name (*)
                        </label>
                        <Field
                          type="text"
                          id="name"
                          name="name"
                          className="form-control"
                          placeholder="Enter team name"
                        />
                        <ErrorMessage
                          name="name"
                          component="div"
                          className="text-danger"
                        />
                      </div>

                      {/* Description */}
                      {/* <div className="mb-3">
                        <label
                          htmlFor="description"
                          className="form-label custom-text-header"
                        >
                          Description
                        </label>
                        <Field
                          as="textarea"
                          id="description"
                          name="description"
                          className="form-control"
                          placeholder="Enter team description"
                        />
                      </div> */}

                      {/* Logo */}
                      <div className="mb-3">
                        <label
                          htmlFor="logo"
                          className="form-label custom-text-header"
                        >
                          Logo (File Upload)
                        </label>
                        <input
                          type="file"
                          className="form-control"
                          style={{ height: "auto" }}
                          onChange={(event) => {
                            setFieldValue("logo", event.currentTarget.files[0]);
                            setIsTyping(true);
                          }}
                        />
                      </div>

                      {/* Members Email Input */}
                      <div className="mb-3">
                        <label
                          htmlFor="emailInput"
                          className="form-label custom-text-header"
                        >
                          Invite Member (Email)
                        </label>
                        <div className="d-flex">
                          <Field
                            type="email"
                            id="emailInput"
                            name="emailInput"
                            className="form-control"
                            placeholder="Enter valid member's email"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                values.emailInput &&
                                !values.membersEmail.some(
                                  (member) => member.user === memberInfo?._id
                                )
                              ) {
                                setFieldValue("membersEmail", [
                                  ...values.membersEmail,
                                  {
                                    user: memberInfo?._id,
                                    nickname: `${memberInfo?.firstName} ${memberInfo?.lastName}`,
                                    email: memberInfo?.email,
                                    avatar: memberInfo?.avatar?.url,
                                  },
                                ]);
                                setFieldValue("emailInput", "");
                              }
                            }}
                            className="btn btn-success mx-2 me-0"
                            disabled={!isEmailValid || isSearching || isTyping}
                          >
                            {isSearching ? "Searching..." : "Add"}
                          </button>
                        </div>
                        <ErrorMessage
                          name="membersEmail"
                          component="div"
                          className="text-danger"
                        />
                      </div>
                    </div>
                    <div>
                      {/* Display added members */}
                      <div className="mb-3">
                        <label className="form-label custom-text-header">
                          Members
                        </label>
                        <ul className="list-group">
                          {values.membersEmail.length > 0 && (
                            <>
                              {/* Owner (First Member) */}
                              <li className="list-group-item member-info">
                                <span>
                                  <img
                                    src={
                                      values.membersEmail[0].avatar
                                        ? values.membersEmail[0].avatar
                                        : "/images/account.png"
                                    }
                                    className="member-avatar"
                                  />
                                </span>
                                <span className="member-nickname">
                                  {values.membersEmail[0].nickname}
                                </span>{" "}
                                <span className="member-email custom-text-secondary ">
                                  ({values.membersEmail[0].email})
                                </span>
                                <span className="custom-text-secondary">
                                  (You)
                                </span>
                              </li>
                            </>
                          )}
                        </ul>
                        <label className="form-label custom-text-header">Members to be Invited</label>
                        <ul className="list-group">
                          {values.membersEmail.slice(1).map((member, index) => (
                            <li
                              key={index + 1}
                              className="list-group-item member-info"
                            >
                              <span>
                                <img
                                  src={
                                    member.avatar
                                      ? member.avatar
                                      : "/images/account.png"
                                  }
                                  className="member-avatar"
                                />
                              </span>
                              <span className="member-nickname">
                                {member.nickname}
                              </span>{" "}
                              <span className="member-email custom-text-secondary ">
                                ({member.email})
                              </span>
                              <span
                                className="delete"
                                onClick={() => {
                                  const updatedMembers =
                                    values.membersEmail.filter(
                                      (_, i) => i !== index + 1
                                    );
                                  setFieldValue("membersEmail", updatedMembers);
                                }}
                              >
                                <i className="fa-solid fa-delete-left"></i>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer custom-text-white">
                    <button
                      type="button"
                      className="btn cancel"
                      onClick={handleClose}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary save"
                      disabled={isLoading}
                    >
                      {
                        isLoading ? (<><div className="loader"></div></>) : "Create Team"
                      }
                    </button>
                  </div>
                </Form>
              );
            }}
          </Formik>
        </div>
      </div>
    </div>
  );
};

export default PopupForm;
