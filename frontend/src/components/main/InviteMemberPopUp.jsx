import React, { useState, useEffect } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import axios from "axios";
import { getToken, getUser, succesMsg, errMsg } from "../../utils/helper";

const InviteMemberPopUp = ({ show, handleClose, authState, currentTeamId }) => {
  const [isEmailValid, setIsEmailValid] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [memberInfo, setMemberInfo] = useState(null);
  const [isAlreadyMember, setIsAlreadyMember] = useState(false);

  if (!show) return null;

  const validationSchema = Yup.object({
    membersEmail: Yup.array()
      .of(
        Yup.object().shape({
          user: Yup.string().required(),
          nickname: Yup.string().required(),
        })
      )
      .min(1, "At least one member is required"),
  });

  const searchUser = async (email) => {
    try {
      setIsSearching(true);
      setIsAlreadyMember(false); // Reset the state when searching
      const response = await axios.get(
        `${import.meta.env.VITE_API}/getUserByEmail/${email}`
      );
      
      if (response.data.user) {
        // Check if this user is already a member of the team
        const checkTeamResponse = await axios.get(
          `${import.meta.env.VITE_API}/getTeamMembers/${currentTeamId}`,
          {
            headers: {
              Authorization: `Bearer ${getToken(authState)}`,
            },
          }
        );
        
        const isExistingMember = checkTeamResponse.data.members.some(
          (member) => member.user._id === response.data.user._id
        );
        
        if (isExistingMember) {
          setIsAlreadyMember(true);
          setIsEmailValid(false);
          errMsg("This user is already a member of the team.");
        } else {
          setIsEmailValid(true);
        }
      } else {
        // No user found with the provided email
        setIsEmailValid(false);
        errMsg("No user found with this email address.");
      }
      
      return response.data;
    } catch (error) {
      console.error("Error searching user:", error);
      setIsEmailValid(false);
      errMsg("Error searching for user. Please try again.");
      return false;
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async (membersEmail, teamId = currentTeamId) => {
    try {
      const token = getToken(authState);
      const inviter = getUser(authState);

      const response = await axios.post(
        `${import.meta.env.VITE_API}/inviteMembers/${teamId}`,
        { members: membersEmail, inviter },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Invite Response:", response);
      succesMsg("Members invited successfully!");
      handleClose();
    } catch (error) {
      console.error("Error inviting members:", error);
      alert("Error inviting members");
    }
  };

  const currentUser = getUser(authState);

  return (
    <div
      className="modal d-block invite-member-modal"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div className="modal-dialog maxWidth500px">
        <div className="modal-content">
          <div className="modal-header custom-text-white">
            <h5 className="modal-title fw-bold">Invite Members</h5>
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
            initialValues={{ emailInput: "", membersEmail: [] }}
            validationSchema={validationSchema}
            onSubmit={(values, { resetForm }) => {
              handleSubmit(values.membersEmail, currentTeamId);
              resetForm();
            }}
          >
            {({ values, setFieldValue }) => {
              useEffect(() => {
                const timer = setTimeout(async () => {
                  if (values.emailInput.includes("@")) {
                    const { user } = await searchUser(values.emailInput);
                    setMemberInfo(user);
                    // isEmailValid is now set in searchUser based on member status
                  } else {
                    setIsEmailValid(false);
                    setIsAlreadyMember(false);
                  }
                }, 1000);

                return () => clearTimeout(timer);
              }, [values.emailInput]);

              return (
                <Form>
                  <div
                    className="modal-body"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "unset",
                    }}
                  >
                    <div className="mb-3" style={{ flex: "1 1 100%" }}>
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
                              memberInfo &&
                              !values.membersEmail.some(
                                (m) => m.user === memberInfo._id
                              ) &&
                              !isAlreadyMember
                            ) {
                              setFieldValue("membersEmail", [
                                ...values.membersEmail,
                                {
                                  user: memberInfo._id,
                                  nickname: `${memberInfo.firstName} ${memberInfo.lastName}`,
                                  email: memberInfo.email,
                                  avatar:
                                    memberInfo.avatar?.url ||
                                    "/images/account.png",
                                },
                              ]);
                              setFieldValue("emailInput", "");
                              setIsAlreadyMember(false);
                            }
                          }}
                          className="btn btn-success mx-2 me-0"
                          disabled={!isEmailValid || isSearching || isAlreadyMember}
                        >
                          {isSearching ? "Searching..." : "Add"}
                        </button>
                      </div>
                      {isAlreadyMember && (
                        <div className="text-danger mt-1">
                          This user is already a member of the team.
                        </div>
                      )}
                      <ErrorMessage
                        name="membersEmail"
                        component="div"
                        className="text-danger"
                      />
                    </div>

                    <div className="mb-3" style={{ flex: "1 1 100%" }}>
                      <label className="form-label custom-text-header">
                        Members To be Invited
                      </label>
                      <ul className="list-group">
                        {values.membersEmail.length === 0 && (
                          <li className="list-group-item member-info text-center d-flex align-items-center justify-content-center"> 
                            <span className="member-nickname text-secondary d-block align-self-center f-1"> 
                              No members added
                            </span>
                          </li>
                        )}
                        {values.membersEmail.map((member, index) => (
                          <li
                            key={index}
                            className="list-group-item member-info"
                          >
                            <span>
                              <img
                                src={member.avatar || "/images/account.png"}
                                className="member-avatar"
                              />
                            </span>
                            <span className="member-nickname">
                              {member.nickname}
                            </span>
                            <span className="member-email custom-text-secondary">
                              ({member.email})
                            </span>
                            <span
                              className="delete"
                              onClick={() => {
                                setFieldValue(
                                  "membersEmail",
                                  values.membersEmail.filter(
                                    (_, i) => i !== index
                                  )
                                );
                              }}
                            >
                              <i className="fa-solid fa-delete-left"></i>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="cancel btn btn-secondary"
                      onClick={handleClose}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="invite btn btn-primary custom-secondary-bg"
                    >
                      Invite
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

export default InviteMemberPopUp;
