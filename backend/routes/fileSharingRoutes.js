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
    getDeletedFilesAndFolders,
    renameFileOrFolder,
    recordFileActivity
} = require("../controllers/FileSharingController");

const upload = multer({ dest: "uploads/" });

// Route to create a file or folder
router.post("/upload", isAuthenticatedUser, upload.array("files"), createFileOrFolder);
router.post("/uploadFiles", isAuthenticatedUser, upload.array("files"), uploadFiles);
router.post("/uploadFolders", isAuthenticatedUser, upload.array("files"), uploadFolders);
router.post("/createTeamFolder/:teamId", isAuthenticatedUser, createFolder);
router.get("/getAllFiles", upload.array("files"), getAllFilesAndFolders);
router.get("/getTeamFiles/:teamId", getFilesAndFoldersByTeam);
router.get("/getFilesAndFoldersByPath/:teamId", getFilesAndFoldersByPath);
router.post("/createNewFolder", isAuthenticatedUser, createNewFolder)
router.get("/getPublicLink", generatePublicLink);
router.post("/recordActivity/:fileId", isAuthenticatedUser, recordFileActivity);
router.delete("/delete/:fileId", isAuthenticatedUser, deleteFileOrFolder);
router.delete("/soft-delete/:fileId", isAuthenticatedUser, softDeleteFileOrFolder);
router.get("/get-deleted-files/:teamId", getDeletedFilesAndFolders);
router.put("/restore/:fileId", isAuthenticatedUser, restoreFileOrFolder);
router.put("/rename/:fileId", isAuthenticatedUser, renameFileOrFolder); 

router.get("/getStorageInfo", isAdmin, getStorageInfo);
router.get("/getFolderSize", isAuthenticatedUser, getFolderSize);
router.get("/downloadFileOrFolder", downloadFileOrFolder);

module.exports = router;
