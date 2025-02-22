const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
    createFileOrFolder,
    uploadFiles,
    createFolder,
    uploadFolders,
    getAllFilesAndFolders,
    getFilesAndFoldersByTeam,
    getFilesAndFoldersByPath,
    createNewFolder,
    generatePublicLink,
    deleteFileOrFolder
} = require("../controllers/FileSharingController");

const upload = multer({ dest: "uploads/" });

// Route to create a file or folder
router.post("/upload", upload.array("files"), createFileOrFolder);
router.post("/uploadFiles", upload.array("files"), uploadFiles);
router.post("/uploadFolders", upload.array("files"), uploadFolders);
router.post("/createTeamFolder/:teamId", createFolder);
router.get("/getAllFiles", upload.array("files"), getAllFilesAndFolders);
router.get("/getTeamFiles/:teamId", getFilesAndFoldersByTeam);
router.get("/getFilesAndFoldersByPath/:teamId", getFilesAndFoldersByPath);
router.post("/createNewFolder", createNewFolder)
router.get("/getPublicLink", generatePublicLink);
router.delete("/delete/:fileId", deleteFileOrFolder);

module.exports = router;
