import React, { useRef } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { errMsg, succesMsg } from "../../../utils/helper";
import Swal from "sweetalert2";

const UploadFiles = ({
  currentPath,
  setRefresh,
  parentFolder,
  setProgress,
  availableUploadSize
}) => {
  const fileInputRef = useRef(null);
  const currentTeamId = useSelector((state) => state.team.currentTeamId);
  const user = useSelector((state) => state.auth.user);

  const handleFileChange = async (event) => {
    const uploadingFiles = Array.from(event.target.files);
    if (!uploadingFiles.length) return;
  
    // Calculate total file size
    const totalUploadSize = uploadingFiles.reduce((acc, file) => acc + file.size, 0);
  
    // If total upload size exceeds available space, show alert
    if (totalUploadSize > availableUploadSize) {
      const availableSizeGB = (availableUploadSize / (1024 ** 3)).toFixed(2);
      const uploadingSizeGB = (totalUploadSize / (1024 ** 3)).toFixed(2);
      
      Swal.fire({
        icon: "error",
        title: "Upload Error",
        html: `Insufficient storage space.<br /><div class="active-color">Available Storage: ${availableSizeGB} GB</div><div class="danger-color">Uploading Size: ${uploadingSizeGB} GB</div>`,
      });
  
      return;
    }
  
    const formData = new FormData();
    for (let i = 0; i < uploadingFiles.length; i++) {
      formData.append("files", uploadingFiles[i]);
    }
  
    formData.append("type", uploadingFiles.length > 1 ? "folder" : "file");
    formData.append(
      "name",
      uploadingFiles.length > 1 ? "New Folder" : uploadingFiles[0].name
    );
    formData.append("teamId", currentTeamId);
    formData.append("createdBy", user._id);
    formData.append("owner", user._id);
    formData.append("path", currentPath);
    formData.append("parentFolder", parentFolder);
  
    try {
      console.log("Uploading to path:", currentPath);
      await axios.post(
        `${import.meta.env.VITE_API}/uploadFiles?path=${encodeURIComponent(
          currentPath
        )}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setProgress(percentCompleted);
          },
        }
      );
  
      succesMsg("Upload successful!");
      setRefresh((prev) => !prev);
    } catch (error) {
      console.error("Upload error:", error);
      errMsg("Upload failed", error);
    }
  };

  return (
    <>
      <button onClick={() => fileInputRef.current.click()}>
        <i className="fa-solid fa-file-arrow-up"></i>
        <span>Upload Files</span>
      </button>
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
    </>
  );
};

export default UploadFiles;
