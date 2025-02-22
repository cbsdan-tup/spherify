const fs = require("fs");
const { createWebDAVClient, nextcloudAPI } = require("../utils/nextcloud.js");

/**
 * Upload a file to Nextcloud
 */
exports.uploadFile = async (req, res) => {
  try {
    const { webdavClient, NEXTCLOUD_URL, NEXTCLOUD_USER } = await createWebDAVClient();
    const filePath = req.file.path;
    const fileName = req.file.originalname;
    const nextcloudPath = `${NEXTCLOUD_USER}/Spherify_Data/${fileName}`;
    const fileStream = fs.createReadStream(filePath);
    const fileSize = fs.statSync(filePath).size;
    let uploadedBytes = 0;

    res.setHeader("Content-Type", "application/json");

    await webdavClient.putFileContents(nextcloudPath, fileStream, {
      overwrite: true,
      onUploadProgress: (progress) => {
        uploadedBytes = progress.loaded;
        const percentage = ((uploadedBytes / fileSize) * 100).toFixed(2);
        res.write(JSON.stringify({ progress: `${percentage}%` }) + "\n");
      },
    });

    // Cleanup local file
    fs.unlinkSync(filePath);

    res.write(
      JSON.stringify({
        success: true,
        url: `${NEXTCLOUD_URL}/${nextcloudPath}`,
      }) + "\n"
    );
    res.end();
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ success: false, error: "Upload failed" });
  }
};

exports.uploadFolder = async (req, res) => {
  try {
    const { webdavClient, NEXTCLOUD_URL } = await createWebDAVClient();
    const files = req.files;
    const folderName = req.body.folderName || "uploads";

    if (!files || files.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "No files uploaded" });
    }

    // Ensure the folder exists in Nextcloud
    await webdavClient.createDirectory(`/${folderName}`);

    let uploadedFiles = [];
    let totalFiles = files.length;
    let completedFiles = 0;

    res.setHeader("Content-Type", "application/json");

    for (const file of files) {
      const filePath = file.path;
      const fileName = file.originalname;
      const nextcloudPath = `/${folderName}/${fileName}`;
      const fileStream = fs.createReadStream(filePath);
      const fileSize = fs.statSync(filePath).size;
      let uploadedBytes = 0;

      await webdavClient.putFileContents(nextcloudPath, fileStream, {
        overwrite: true,
        onUploadProgress: (progress) => {
          uploadedBytes = progress.loaded;
          const percentage = ((uploadedBytes / fileSize) * 100).toFixed(2);
          res.write(
            JSON.stringify({ file: fileName, progress: `${percentage}%` }) +
              "\n"
          );
        },
      });

      // Cleanup local file
      fs.unlinkSync(filePath);
      uploadedFiles.push(`${NEXTCLOUD_URL}/${nextcloudPath}`);
      completedFiles++;

      // Send progress update
      res.write(
        JSON.stringify({
          overallProgress: `${((completedFiles / totalFiles) * 100).toFixed(
            2
          )}%`,
        }) + "\n"
      );
    }

    res.write(
      JSON.stringify({
        success: true,
        message: "Folder uploaded successfully",
        uploadedFiles,
      }) + "\n"
    );
    res.end();
  } catch (error) {
    console.error("Folder upload error:", error);
    res.status(500).json({ success: false, error: "Folder upload failed" });
  }
};

/**
 * Copy a file/folder in Nextcloud
 */
exports.copyFile = async (req, res) => {
  try {
    const { source, destination } = req.body;

    const { webdavClient } = await createWebDAVClient();

    await webdavClient.copyFile(source, destination);
    return res.json({ success: true, message: "File copied successfully" });
  } catch (error) {
    console.error("Copy error:", error);
    return res.status(500).json({ success: false, error: "Copy failed" });
  }
};

/**
 * Move a file/folder in Nextcloud
 */
exports.moveFile = async (req, res) => {
  try {
    const { source, destination } = req.body;

    const { webdavClient } = await createWebDAVClient();

    await webdavClient.moveFile(source, destination);
    return res.json({ success: true, message: "File moved successfully" });
  } catch (error) {
    console.error("Move error:", error);
    return res.status(500).json({ success: false, error: "Move failed" });
  }
};

/**
 * Share a file in Nextcloud (Generate a public link)
 */
exports.shareFile = async (req, res) => {
  try {
    console.log(req.body);
    const { filePath, shareType = 3, permissions = 1 } = req.body; // Default: public link

    const response = await nextcloudAPI.post(
      "/ocs/v2.php/apps/files_sharing/api/v1/shares",
      new URLSearchParams({
        path: filePath,
        shareType,
        permissions,
      }),
    );

    return res.json({ success: true, link: response.data.ocs.data.url });
  } catch (error) {
    console.error("Share error:", error);
    return res.status(500).json({ success: false, error: "Share failed" });
  }
};
