import React, { useRef } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { errMsg, succesMsg } from "../../../utils/helper";

const UploadFolder = ({
  currentPath,
  setRefresh,
  parentFolder,
  setProgress,
}) => {
  const folderInputRef = useRef(null);
  const currentTeamId = useSelector((state) => state.team.currentTeamId);
  const user = useSelector((state) => state.auth.user);

  const handleFolderChange = async (event) => {
    const uploadingFiles = Array.from(event.target.files);
    if (!uploadingFiles.length) return;

    const formData = new FormData();
    const paths = uploadingFiles.map((file) => file.webkitRelativePath);

    for (let i = 0; i < uploadingFiles.length; i++) {
      formData.append("files", uploadingFiles[i]);
    }

    formData.append("type", "folder");
    formData.append("name", paths[0].split("/")[0]); // Root folder name
    formData.append("teamId", currentTeamId);
    formData.append("createdBy", user._id);
    formData.append("owner", user._id);
    formData.append("paths", JSON.stringify(paths));
    formData.append("parentFolder", parentFolder);
    
    try {
      console.log("Uploading folder to path:", currentPath);
      await axios.post(
        `${import.meta.env.VITE_API}/uploadFolders?path=${encodeURIComponent(
          currentPath
        )}`,
        formData,
        {
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setProgress(percentCompleted);
          },
        }
      );

      succesMsg("Folder upload successful!");
      setRefresh((prev) => !prev);
    } catch (error) {
      console.error("Upload error:", error);
      errMsg("Folder upload failed", error);
    }
  };

  return (
    <>
      <button onClick={() => folderInputRef.current.click()}>
        <i className="fa-solid fa-upload"></i>
        <span>Upload Folder</span>
      </button>
      <input
        type="file"
        webkitdirectory=""
        directory=""
        multiple
        ref={folderInputRef}
        onChange={handleFolderChange}
        style={{ display: "none" }}
      />
    </>
  );
};

export default UploadFolder;
