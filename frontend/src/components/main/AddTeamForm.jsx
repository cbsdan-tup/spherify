import React from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";

const PopupForm = ({ show, handleClose, handleSubmit }) => {
  if (!show) return null;

  const validationSchema = Yup.object({
    name: Yup.string().required("Team name is required"),
    description: Yup.string(),
    logo: Yup.mixed().nullable(),
    membersEmail: Yup.array()
      .of(Yup.string().email("Invalid email"))
  });

  return (
    <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Add Your Team</h5>
            <button type="button" className="btn-close" onClick={handleClose} aria-label="Close"></button>
          </div>
          <Formik
            initialValues={{
              name: "",
              description: "",
              logo: null,
              emailInput: "",
              membersEmail: [],
            }}
            validationSchema={validationSchema}
            onSubmit={(values, { resetForm }) => {
              handleSubmit(values);
              resetForm();
            }}
          >
            {({ values, setFieldValue }) => (
              <Form>
                <div className="modal-body">
                  {/* Team Name */}
                  <div className="mb-3">
                    <label htmlFor="name" className="form-label">
                      Team Name
                    </label>
                    <Field type="text" id="name" name="name" className="form-control" placeholder="Enter team name" />
                    <ErrorMessage name="name" component="div" className="text-danger" />
                  </div>

                  {/* Description */}
                  <div className="mb-3">
                    <label htmlFor="description" className="form-label">
                      Description
                    </label>
                    <Field as="textarea" id="description" name="description" className="form-control" placeholder="Enter team description" />
                  </div>

                  {/* Logo */}
                  <div className="mb-3">
                    <label htmlFor="logo" className="form-label">
                      Logo (File Upload)
                    </label>
                    <input
                      type="file"
                      className="form-control"
                      onChange={(event) => setFieldValue("logo", event.currentTarget.files[0])}
                    />
                  </div>

                  {/* Members Email Input */}
                  <div className="mb-3">
                    <label htmlFor="emailInput" className="form-label">
                      Add Member (Email)
                    </label>
                    <div className="d-flex">
                      <Field type="email" id="emailInput" name="emailInput" className="form-control" placeholder="Enter member's email" />
                      <button
                        type="button"
                        onClick={() => {
                          if (values.emailInput && !values.membersEmail.includes(values.emailInput)) {
                            setFieldValue("membersEmail", [...values.membersEmail, values.emailInput]);
                            setFieldValue("emailInput", ""); // Clear input after adding
                          }
                        }}
                        className="btn btn-success ms-2"
                      >
                        Add
                      </button>
                    </div>
                    <ErrorMessage name="membersEmail" component="div" className="text-danger" />
                  </div>

                  {/* Display added members */}
                  <div className="mb-3">
                    <label className="form-label">Members</label>
                    <ul className="list-group">
                      {values.membersEmail.map((email, index) => (
                        <li key={index} className="list-group-item">
                          {email}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={handleClose}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create Team
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </div>
    </div>
  );
};

export default PopupForm;
