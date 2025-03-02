const express = require("express");
const router = express.Router();
const {isAdmin, isAuthenticatedUser} = require("../middleware/auth");
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
    deleteFileOrFolder,
    softDeleteFileOrFolder,
    restoreFileOrFolder,
    getStorageInfo,
    getFolderSize,
    downloadFileOrFolder,
    getDeletedFilesAndFolders
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
router.delete("/soft-delete/:fileId", softDeleteFileOrFolder);
router.get("/get-deleted-files/:teamId", getDeletedFilesAndFolders);
router.put("/restore/:fileId", restoreFileOrFolder);

router.get("/getStorageInfo", isAdmin, getStorageInfo);
router.get("/getFolderSize", isAuthenticatedUser, getFolderSize);
router.get("/downloadFileOrFolder", downloadFileOrFolder);

module.exports = router;
