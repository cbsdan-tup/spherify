import React, { useRef } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { errMsg, succesMsg } from "../../../utils/helper";
import Swal from "sweetalert2";

const UploadFolder = ({ currentPath, setRefresh, parentFolder, setProgress, availableUploadSize }) => {
  const folderInputRef = useRef(null);
  const currentTeamId = useSelector((state) => state.team.currentTeamId);
  const user = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);
  
  const handleFolderChange = async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;
  
    // Calculate total folder size
    const totalUploadSize = files.reduce((acc, file) => acc + file.size, 0);
  
    // If total upload size exceeds available storage, show alert
    if (totalUploadSize > availableUploadSize) {
      const availableSizeGB = (availableUploadSize / (1024 ** 3)).toFixed(2);
      const uploadingSizeGB = (totalUploadSize / (1024 ** 3)).toFixed(2);
  
      Swal.fire({
        icon: "error",
        title: "Upload Error",
        html: `<div class="swal-storage-alert"><span class="message">Insufficient storage space.</span><div class="active-color">Available Storage: ${availableSizeGB} GB</div><div class="danger-color">Uploading Size: ${uploadingSizeGB} GB</div></div>`,
      });
  
      return;
    }
  
    const formData = new FormData();
    const paths = files.map(file => file.webkitRelativePath);
  
    // Add files with folder structure
    files.forEach((file) => {
      formData.append("files", file);
    });
  
    formData.append("teamId", currentTeamId);
    formData.append("createdBy", user._id);
    formData.append("owner", user._id);
    formData.append("paths", JSON.stringify(paths));
    formData.append("parentFolder", parentFolder);
  
    try {
      await axios.post(
        `${import.meta.env.VITE_API}/uploadFolders?path=${encodeURIComponent(currentPath)}`,
        formData,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
            "X-Folder-Name": paths[0].split("/")[0], // Send root folder name
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setProgress(percentCompleted);
          }
        }
      );
  
      succesMsg("Folder uploaded successfully!");
      setRefresh(prev => !prev);
    } catch (error) {
      errMsg("Folder upload failed", error.response?.data?.error || error.message);
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
