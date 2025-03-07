import React, { useState } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import axios from "axios";
import { useSelector } from "react-redux";
import { errMsg, succesMsg } from "../../../utils/helper";

const CreateNewFolder = ({parentFolder, refresh, setRefresh, relativePath}) => {
  const [folderName, setFolderName] = useState("");
  const [show, setShow] = useState(false);
  const currentTeamId = useSelector((state) => state.team.currentTeamId);
  const user = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);

  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
      alert("Folder name cannot be empty.");
      return;
    }

    try {
      await axios.post(`${import.meta.env.VITE_API}/createNewFolder?path=${encodeURIComponent(relativePath)}`, {
        name: folderName,
        teamId: currentTeamId,
        createdBy: user._id,
        owner: user._id,
        parentFolder: parentFolder,
      }, {
        headers: {
          Authorization: `Bearer ${token}`, 
          "Content-Type": "application/json",
        }
      });
      
      succesMsg("Folder created successfully!");
      setFolderName("");
      setShow(false);
      setRefresh(!refresh)
    } catch (error) {
      console.error("Error creating folder:", error);
      errMsg("Failed to create folder.", error);
    }
  };

  return (
    <>
      <button onClick={() => setShow(true)}>
        <i className="fa-solid fa-folder-plus"></i>
        <span>Create New Folder</span>
      </button>
      <Modal show={show} onHide={() => setShow(false)} className="create-folder-modal">
        <Modal.Header closeButton>
          <Modal.Title>Create New Folder</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label>Folder Name</Form.Label>
              <Form.Control
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="Enter folder name"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShow(false)}>
            Cancel
          </Button>
          <Button className="create" onClick={handleCreateFolder}>
            Create Folder
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default CreateNewFolder;
