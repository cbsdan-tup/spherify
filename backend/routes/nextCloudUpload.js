const express = require("express");
const multer = require("multer");
const fs = require("fs");
const { createWebDAVClient, nextcloudAPI } = require("../utils/nextcloud.js");

const router = express.Router();
const upload = multer({ dest: "uploads/" }); // Temp storage

const {
  uploadFile,
  uploadFolder,
  copyFile,
  moveFile,
  shareFile,
} = require("../controllers/NextcloudController.js");

// Upload a file with progress tracking
router.post("/nextcloud/upload", upload.single("file"), uploadFile);

// Upload a folder with progress tracking
router.post("/nextcloud/upload-folder", upload.array("files"), uploadFolder);

// Copy a file/folder in Nextcloud
router.post("/nextcloud/copy", copyFile);

// Move a file/folder in Nextcloud
router.post("/nextcloud/move", moveFile);

router.post("/nextcloud/share", shareFile);

module.exports = router;
