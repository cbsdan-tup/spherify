import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CreateNewFile from "./CreateNewFile";
import { useSelector } from "react-redux";
import axios from "axios";
import { getToken, succesMsg, errMsg } from "../../../utils/helper";
import { setCurrentFileId } from "../../../redux/teamSlice";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";

const LiveEditingTool = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [files, setFiles] = useState([]);

  const dispatch = useDispatch();

  const handleToolClick = () => {
    setIsExpanded(!isExpanded);
  };
  const handleAddNewFileClick = () => {
    setIsFormVisible(true);
  };

  const handleCloseForm = () => {
    setIsFormVisible(false);
  };

  const authState = useSelector((state) => state.auth);
  const token = getToken(authState);
  const currentTeamId = useSelector((state) => state.team.currentTeamId);

  const addNewFile = async (fileName, user, currentTeamId) => {
    try {
      const newFile = { fileName, createdBy: user._id, teamId: currentTeamId };
      const config = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      };
      const res = await axios.post(
        `${import.meta.env.VITE_API}/createDocument/${currentTeamId}`,
        newFile,
        config
      );

      setFiles([...files, res.data]);
      succesMsg("File created successfully");
    } catch (error) {
      console.error("Error creating file:", error);
      errMsg("Error creating file", error);
    } finally {
      setIsFormVisible(false);
    }
  };
  const fetchFiles = async () => {
    try {
      const config = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      };
      const res = await axios.get(
        `${import.meta.env.VITE_API}/getDocuments/${currentTeamId}`,
        config
      );
      console.log("files", res.data);
      setFiles(res.data);
    } catch (error) {
      console.error("Error fetching files:", error);
      errMsg("Error fetching files", error);
    }
  };
  const handleFileClick = (fileId) => {
    dispatch(setCurrentFileId(fileId));
  };
  const currentFileId = useSelector((state) => state.team.currentFileId);

  useEffect(() => {
    fetchFiles();
  }, [isFormVisible, currentTeamId]);
  return (
    <div className="tool-container custom-text-white">
      <div className="header" onClick={handleToolClick}>
        <i
          className={
            isExpanded
              ? "fa-solid arrow fa-arrow-down"
              : "fa-solid arrow fa-arrow-right"
          }
        ></i>
        <span className="tool-title">Live Editing</span>
      </div>
      {isExpanded && (
        <div className="tool-content">
          <div className="add" onClick={handleAddNewFileClick}>
            <i className="fa-solid fa-plus icon"></i>
            <span className="label">Add New File</span>
          </div>
          {isFormVisible && (
            <CreateNewFile
              show={isFormVisible}
              onHide={handleCloseForm}
              onCreateFile={addNewFile}
            />
          )}
          {files &&
            files.map((file) => (
              <>
                <Link
                  className={
                    currentFileId === file._id ? "file btn btn-primary" : "file"
                  }
                  key={file._id}
                  to={`/main/${currentTeamId}/live-editing/${file._id}`}
                  onClick={() => handleFileClick(file._id)}
                >
                  <div key={file._id} className="file">
                    <i className="fa-solid fa-file icon"></i>
                    <span className="label">{file.fileName}</span>
                  </div>
                </Link>
              </>
            ))}
        </div>
      )}
    </div>
  );
};
export default LiveEditingTool;
