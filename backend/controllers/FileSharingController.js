const File = require("../models/File");
const fs = require("fs");
const { createWebDAVClient } = require("../utils/nextcloud.js");
const axios = require("axios");
const NextCloudController = require("./NextcloudController.js");
const mongoose = require("mongoose");
const path = require("path");
const { promisify } = require("util");
const setTimeoutPromise = promisify(setTimeout);
const base64 = require("base-64");
const { DOMParser } = require("xmldom");

/**
 * Create a new file or folder and upload it to Nextcloud with progress tracking
 */
exports.createFileOrFolder = async (req, res) => {
  try {
    const {
      teamId,
      name,
      createdBy,
      owner,
      branchParent,
      parentFolder,
      collaborators,
      type,
    } = req.body;
    const relativePath = req.query.path || "";
    console.log("Relative" + relativePath);
    const { webdavClient, BASE_URL } = await createWebDAVClient();
    let url = "";
    let uploadedFiles = [];

    res.setHeader("Content-Type", "application/json");

    // Ensure the base directory exists
    const baseDirectory = `${relativePath}`;
    try {
      await webdavClient.stat(baseDirectory);
    } catch (err) {
      if (err.status === 404) {
        await webdavClient.createDirectory(baseDirectory);
      } else {
        throw err;
      }
    }

    let folderRecord = null;
    let folderPath = baseDirectory;

    if (type === "folder" || (req.files && req.files.length > 0 && name)) {
      folderPath = `${baseDirectory}/${name}`;
      try {
        await webdavClient.stat(folderPath);
      } catch (err) {
        if (err.status === 404) {
          await webdavClient.createDirectory(folderPath);
        } else {
          throw err;
        }
      }

      console.log(parentFolder);
      url = `${BASE_URL}/${folderPath}`;
      folderRecord = new File({
        teamId,
        type: "folder",
        name,
        url,
        createdBy,
        owner,
        branchParent: branchParent || null,
        parentFolder: mongoose.Types.ObjectId.isValid(parentFolder)
          ? parentFolder
          : null,
        collaborators: collaborators || [],
      });
      await folderRecord.save();
    }

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const filePath = file.path;
        const fileName = file.originalname;
        const nextcloudPath = `${folderPath}/${fileName}`;
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

        fs.unlinkSync(filePath);

        const fileRecord = new File({
          teamId,
          type: "file",
          name: fileName,
          url: `${BASE_URL}/${nextcloudPath}`,
          createdBy,
          owner,
          branchParent: branchParent || null,
          parentFolder: folderRecord ? folderRecord._id : parentFolder || null,
          collaborators: collaborators || [],
        });

        await fileRecord.save();
        uploadedFiles.push(fileRecord);
      }
    } else {
      return res
        .status(400)
        .json({ success: false, error: "No file uploaded" });
    }

    res.write(
      JSON.stringify({
        success: true,
        message: `${type} created successfully`,
        folder: folderRecord,
        uploadedFiles,
      }) + "\n"
    );
    res.end();
  } catch (error) {
    console.error("File/Folder creation error:", error);
    res.status(500).json({ success: false, error: "Creation failed" });
  }
};
/**
 * Recursively upload folders and files to Nextcloud, overwriting duplicates
 */
exports.uploadFolders = async (req, res) => {
  try {
    const { teamId, createdBy, owner, parentFolder } = req.body;
    const relativePaths = JSON.parse(req.body.paths || "[]"); // Extract correct folder structure
    const relativePath = req.query.path || "";
    console.log("Relative Path:", relativePath);

    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "No folder uploaded" });
    }

    const { webdavClient, BASE_URL } = await createWebDAVClient();
    const uploadPath = relativePath || teamId;
    let uploadedFolders = new Set();
    let uploadedFiles = [];

    // ✅ Ensure the upload directory exists
    try {
      await webdavClient.stat(uploadPath);
    } catch (err) {
      if (err.status === 404) {
        await webdavClient.createDirectory(uploadPath);
      } else {
        throw err;
      }
    }

    // 🔹 Function to create parent directories recursively
    const createParentFolders = async (
      folderPath,
      teamId,
      createdBy,
      owner,
      parentFolder
    ) => {
      const folders = folderPath.split("/");
      let currentPath = uploadPath;
      let lastParentId =
        parentFolder && mongoose.Types.ObjectId.isValid(parentFolder)
          ? new mongoose.Types.ObjectId(parentFolder)
          : null;

      for (const folder of folders) {
        currentPath = `${currentPath}/${folder}`;

        try {
          await webdavClient.stat(currentPath); // Check if folder exists
        } catch (err) {
          if (err.status === 404) {
            console.log(`Creating missing folder: ${currentPath}`);
            await webdavClient.createDirectory(currentPath); // Create the missing folder

            // 🔹 Save folder to database
            const newFolder = new File({
              teamId,
              type: "folder",
              name: folder,
              url: `${BASE_URL}/${currentPath}`,
              createdBy,
              owner,
              parentFolder: lastParentId,
            });
            const savedFolder = await newFolder.save();
            lastParentId = savedFolder._id; // Update parent ID for nested folders
          } else {
            throw err; // Throw if error is not 404
          }
        }
      }
    };

    // 🔹 Sort folder paths to create parents before children
    const folderPaths = new Set(relativePaths.filter((p) => p.endsWith("/")));
    const sortedPaths = [...folderPaths].sort(
      (a, b) => a.split("/").length - b.split("/").length
    );

    // 🔹 Ensure all folders exist in Nextcloud
    for (const folderPath of sortedPaths) {
      const fullFolderPath = `${uploadPath}/${folderPath}`.replace(/\/$/, "");
      if (!uploadedFolders.has(fullFolderPath)) {
        await createParentFolders(
          folderPath,
          teamId,
          createdBy,
          owner,
          parentFolder
        );
        uploadedFolders.add(fullFolderPath);
      }
    }

    // 🔹 Function to retry file uploads (fix ECONNRESET)
    const retryUpload = async (fileStream, nextcloudPath, retries = 3) => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          await webdavClient.putFileContents(nextcloudPath, fileStream, {
            overwrite: true,
          });
          return;
        } catch (err) {
          if (attempt === retries) throw err;
          console.log(
            `Retrying upload (${attempt}/${retries}) for: ${nextcloudPath}`
          );
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    };

    // 🔹 Upload files into their respective folders
    for (const file of req.files) {
      const filePath = file.path;
      const relativeFilePath =
        relativePaths.find((p) => p.endsWith(file.originalname)) ||
        file.originalname;
      const nextcloudPath = `${uploadPath}/${relativeFilePath}`.replace(
        /\/$/,
        ""
      ); // 🔥 Remove trailing slash
      const fileStream = fs.createReadStream(filePath);

      fileStream.setMaxListeners(15); // Fix memory leak warning

      // ✅ Check if the file exists before uploading
      try {
        await webdavClient.stat(nextcloudPath);
        console.log(`File exists, deleting before re-upload: ${nextcloudPath}`);
        await webdavClient.deleteFile(nextcloudPath);
      } catch (err) {
        if (err.status !== 404) throw err; // Ignore "not found" errors
      }

      // Ensure parent folder exists before uploading file
      const parentFolderPath = path.dirname(nextcloudPath);
      let lastParentId =
        parentFolder && mongoose.Types.ObjectId.isValid(parentFolder)
          ? new mongoose.Types.ObjectId(parentFolder)
          : null;

      try {
        await webdavClient.stat(parentFolderPath);
      } catch (err) {
        if (err.status === 404) {
          console.log(`Parent folder missing, creating: ${parentFolderPath}`);
          await webdavClient.createDirectory(parentFolderPath);

          // 🔹 Save the folder in MongoDB
          const folderName = path.basename(parentFolderPath);
          const newFolder = new File({
            teamId,
            type: "folder",
            name: folderName,
            url: `${BASE_URL}/${parentFolderPath}`,
            createdBy,
            owner,
            parentFolder: lastParentId,
          });
          const savedFolder = await newFolder.save();
          lastParentId = savedFolder._id; // Update for nested folder tracking
        } else {
          throw err;
        }
      }

      await retryUpload(fileStream, nextcloudPath);
      fs.unlinkSync(filePath);

      // 🔹 Save file to MongoDB
      const validParentFolder =
        parentFolder && mongoose.Types.ObjectId.isValid(parentFolder)
          ? new mongoose.Types.ObjectId(parentFolder)
          : null;

      const newFile = new File({
        teamId,
        type: "file",
        name: path.basename(relativeFilePath),
        url: `${BASE_URL}/${nextcloudPath}`,
        createdBy,
        owner,
        parentFolder: validParentFolder,
      });
      await newFile.save();
      uploadedFiles.push(newFile);
    }

    res.status(201).json({
      success: true,
      message: "Folders and files uploaded successfully",
      uploadedFolders: Array.from(uploadedFolders),
      uploadedFiles,
    });
  } catch (error) {
    console.error("Folder upload error:", error);
    res.status(500).json({ success: false, error: "Folder upload failed" });
  }
};

exports.uploadFiles = async (req, res) => {
  try {
    const { teamId, createdBy, owner, parentFolder } = req.body;
    const relativePath = req.query.path || "";
    console.log("Relative Path:", relativePath);

    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "No file uploaded" });
    }

    const { webdavClient, BASE_URL } = await createWebDAVClient();
    const uploadPath = relativePath || teamId;
    let uploadedFiles = [];

    // Ensure the upload directory exists
    try {
      await webdavClient.stat(uploadPath);
    } catch (err) {
      if (err.status === 404) {
        await webdavClient.createDirectory(uploadPath);
      } else {
        throw err;
      }
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    for (const file of req.files) {
      const filePath = file.path;
      const fileName = file.originalname;
      const nextcloudPath = `${uploadPath}/${fileName}`;
      const fileStream = fs.createReadStream(filePath);
      const fileSize = fs.statSync(filePath).size;
      let uploadedBytes = 0;

      await webdavClient.putFileContents(nextcloudPath, fileStream, {
        overwrite: true,
        onUploadProgress: (progress) => {
          uploadedBytes = progress.loaded;
          const percentage = ((uploadedBytes / fileSize) * 100).toFixed(2);
          res.write(
            `data: ${JSON.stringify({
              file: fileName,
              progress: `${percentage}%`,
            })}\n\n`
          );
        },
      });

      fs.unlinkSync(filePath);

      const fileRecord = new File({
        teamId,
        type: "file",
        name: fileName,
        url: `${BASE_URL}/${nextcloudPath}`,
        createdBy,
        owner,
        parentFolder: mongoose.Types.ObjectId.isValid(parentFolder)
          ? parentFolder
          : null,
      });
      await fileRecord.save();
      uploadedFiles.push(fileRecord);
    }

    res.write(
      `data: ${JSON.stringify({
        success: true,
        message: "Files uploaded successfully",
        uploadedFiles,
      })}\n\n`
    );
    res.end();
  } catch (error) {
    console.error("File upload error:", error);
    res.status(500).json({ success: false, error: "File upload failed" });
  }
};

exports.getAllFilesAndFolders = async (req, res) => {
  try {
    const files = await File.find().populate(
      "createdBy owner parentFolder branchParent"
    );
    res.status(200).json({ success: true, files });
  } catch (error) {
    console.error("Fetch error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch files and folders" });
  }
};

exports.getFilesAndFoldersByTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const files = await File.find({ teamId }).populate(
      "createdBy owner parentFolder branchParent"
    );
    res.status(200).json({ success: true, files });
  } catch (error) {
    console.error("Fetch by teamId error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch files and folders by teamId",
    });
  }
};

exports.getFilesAndFoldersByPath = async (req, res) => {
  try {
    const { teamId } = req.params;
    const relativePath = req.query.path || "";

    console.log(
      "Fetching files for team folder:",
      teamId,
      "Path:",
      relativePath || "(root)"
    );

    const escapedPath = relativePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const { NEXTCLOUD_URL, NEXTCLOUD_USER, NEXTCLOUD_PASSWORD } =
      await createWebDAVClient();

    // Correct base path
    const basePath = `https://spherify-cloud.mooo.com/remote.php/dav/files/spherify/Spherify_Data`;
    const pathRegex = relativePath
      ? `^${basePath}/${escapedPath}(/[^/]+)?$`
      : `^${basePath}/[^/]+$`;

    let files = await File.find({
      teamId,
      url: { $regex: new RegExp(pathRegex, "i") },
    }).populate("createdBy owner parentFolder branchParent");

    console.log("pathRegex", pathRegex);

    // 🔥 Exclude the queried folder itself
    const currentFolderUrl = `${basePath}/${relativePath}`;
    files = files.filter((file) => file.url != currentFolderUrl);

    let totalFolderSize = 0; // Initialize total folder size

    // Fetch file sizes from Nextcloud
    const updatedFiles = await Promise.all(
      files.map(async (file) => {
        let fileSize = null;
        try {
          const response = await axios({
            method: "PROPFIND",
            url: file.url,
            auth: {
              username: NEXTCLOUD_USER, // Replace with Nextcloud credentials
              password: NEXTCLOUD_PASSWORD,
            },
            headers: {
              Depth: 1,
            },
          });

          // Extract all file sizes
          const sizeMatches = response.data.match(
            /<d:getcontentlength>(\d+)<\/d:getcontentlength>/g
          );
          if (sizeMatches) {
            fileSize = sizeMatches.reduce((sum, match) => {
              const size = parseInt(match.match(/\d+/)[0], 10);
              return sum + size;
            }, 0);
          }

          // Add to total folder size
          totalFolderSize += fileSize || 0;
        } catch (err) {
          console.error("Error fetching file size for", file.url, err);
        }
        return { ...file.toObject(), size: fileSize };
      })
    );

    res
      .status(200)
      .json({ success: true, files: updatedFiles, totalFolderSize });
  } catch (error) {
    console.error("Fetch files and folders by path error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch files and folders by path",
    });
  }
};

exports.createFolder = async (req, res) => {
  try {
    const { teamId } = req.params;

    const { createdBy, owner, parentFolder = null } = req.body;
    const { webdavClient, BASE_URL } = await createWebDAVClient();

    if (!teamId) {
      return res
        .status(400)
        .json({ success: false, error: "Team Id is required" });
    }

    const name = teamId;

    // Define the folder path in Nextcloud
    const folderPath = `${name}`;
    const fullUrl = `${BASE_URL}/${folderPath}`;

    // Check if the folder already exists
    try {
      await webdavClient.stat(folderPath);
      return res
        .status(400)
        .json({ success: false, error: "Folder already exists" });
    } catch (err) {
      if (err.status !== 404) {
        throw err;
      }
    }

    // Create the folder in Nextcloud
    await webdavClient.createDirectory(folderPath);

    // Store the folder record in MongoDB
    const newFolder = new File({
      teamId,
      type: "folder",
      name,
      url: fullUrl,
      createdBy,
      owner,
      parentFolder: parentFolder || null,
    });
    await newFolder.save();

    res.status(201).json({
      success: true,
      message: "Folder created successfully",
      folder: newFolder,
    });
  } catch (error) {
    console.error("Folder creation error:", error);
    res.status(500).json({ success: false, error: "Failed to create folder" });
  }
};

exports.createNewFolder = async (req, res) => {
  try {
    const { teamId, name, createdBy, owner, parentFolder = null } = req.body;
    const { webdavClient, BASE_URL } = await createWebDAVClient();
    const path = req.query.path || "";

    if (!teamId || !name) {
      return res.status(400).json({
        success: false,
        error: "Team ID and folder name are required.",
      });
    }

    const relativePath = path;

    console.log("Relative path:", path);

    const folderPath = relativePath
      ? `${relativePath}/${name}`
      : `${teamId}/${name}`;
    const fullUrl = `${BASE_URL}/${folderPath}`;

    // Check if the folder already exists
    try {
      await webdavClient.stat(folderPath);
      return res
        .status(400)
        .json({ success: false, error: "Folder already exists." });
    } catch (err) {
      if (err.status !== 404) {
        throw err;
      }
    }

    // Create the folder in Nextcloud
    await webdavClient.createDirectory(folderPath);

    // Store the folder record in MongoDB
    const newFolder = new File({
      teamId,
      type: "folder",
      name,
      url: fullUrl,
      createdBy,
      owner,
      parentFolder: mongoose.Types.ObjectId.isValid(parentFolder)
        ? parentFolder
        : null,
    });
    await newFolder.save();

    res.status(201).json({
      success: true,
      message: "Folder created successfully",
      folder: newFolder,
    });
  } catch (error) {
    console.error("Folder creation error:", error);
    res.status(500).json({ success: false, error: "Failed to create folder." });
  }
};

exports.generatePublicLink = async (req, res) => {
  try {
    const { filePath } = req.query; // Get filePath from query parameters

    console.log("Generating public link for:", filePath);

    if (!filePath) {
      return res
        .status(400)
        .json({ success: false, error: "Missing filePath parameter" });
    }

    const { NEXTCLOUD_REST_URL, NEXTCLOUD_USER, NEXTCLOUD_PASSWORD } =
      await createWebDAVClient();

    const apiUrl = `${NEXTCLOUD_REST_URL}/ocs/v2.php/apps/files_sharing/api/v1/shares`;

    console.log("Nextcloud API:", apiUrl);

    // ✅ Ensure the extracted path is correct
    let relativePath = filePath
      .replace(
        "https://spherify-cloud.mooo.com/remote.php/dav/files/spherify/",
        ""
      )
      .replace(/^\/+/, ""); // Remove any leading `/`

    console.log("Relative path:", relativePath);

    console.log(
      "Auth Header:",
      Buffer.from(`${NEXTCLOUD_USER}:${NEXTCLOUD_PASSWORD}`).toString("base64")
    );

    const response = await axios.post(
      apiUrl,
      new URLSearchParams({
        path: relativePath,
        shareType: 3, // 3 = Public link
        permissions: 3, // 1 = Read-only
      }),
      {
        headers: {
          "OCS-APIRequest": "true",
          Accept: "application/json",
          Authorization:
            "Basic " +
            Buffer.from(`${NEXTCLOUD_USER}:${NEXTCLOUD_PASSWORD}`).toString(
              "base64"
            ),
        },
      }
    );

    // ✅ Extract public URL correctly
    const shareUrl = response.data?.ocs?.data?.url;

    if (!shareUrl) {
      console.error("No public link received. Full response:", response.data);
      return res.status(500).json({
        success: false,
        error: "No public link returned from Nextcloud",
      });
    }

    res.json({ success: true, publicUrl: shareUrl });
  } catch (error) {
    console.error(
      "Error generating public link:",
      error.response?.data || error
    );
    res
      .status(500)
      .json({ success: false, error: "Failed to generate public link" });
  }
};

const deleteFolderRecursively = async (folderId, webdavClient) => {
  const subFiles = await File.find({ parentFolder: folderId });

  for (const subFile of subFiles) {
    const subFilePath = subFile.url.replace(
      "https://spherify-cloud.mooo.com/remote.php/dav/files/spherify/",
      ""
    );

    try {
      await webdavClient.stat(subFilePath); // Check if the file exists
      await webdavClient.deleteFile(subFilePath); // Delete from Nextcloud
      console.log(`Deleted: ${subFilePath}`);
    } catch (err) {
      if (err.status !== 404) throw err;
    }

    if (subFile.type === "folder") {
      await deleteFolderRecursively(subFile._id, webdavClient); // Recursively delete sub-folders
    }

    await File.findByIdAndDelete(subFile._id); // Delete from MongoDB
  }
};

/**
 * Delete a file or folder from Nextcloud and MongoDB
 */
exports.deleteFileOrFolder = async (req, res) => {
  try {
    const { fileId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({ success: false, error: "Invalid file ID" });
    }

    const fileRecord = await File.findById(fileId);
    if (!fileRecord) {
      return res.status(404).json({ success: false, error: "File not found" });
    }

    const { webdavClient } = await createWebDAVClient();
    const filePath = fileRecord.url.replace(
      "https://spherify-cloud.mooo.com/remote.php/dav/files/spherify/Spherify_Data/",
      ""
    );

    console.log(`Deleting: ${filePath}`);

    // Check if file/folder exists before attempting deletion
    try {
      await webdavClient.stat(filePath);
    } catch (err) {
      if (err.status === 404) {
        console.log("File or folder does not exist in Nextcloud.");
      } else {
        throw err;
      }
    }

    if (fileRecord.type === "folder") {
      await deleteFolderRecursively(fileId, webdavClient); // Recursively delete all sub-files & sub-folders
    }

    // Delete the main file/folder
    await webdavClient.deleteFile(filePath);
    await File.findByIdAndDelete(fileId); // Remove from MongoDB

    res.status(200).json({
      success: true,
      message: "File/Folder deleted successfully",
    });
  } catch (error) {
    console.error("File/Folder deletion error:", error);
    res.status(500).json({ success: false, error: "Deletion failed" });
  }
};

exports.getStorageInfo = async (req, res) => {
  try {
    const { NEXTCLOUD_REST_URL, NEXTCLOUD_USER, NEXTCLOUD_PASSWORD } =
      await createWebDAVClient();

    const response = await axios.get(
      `${NEXTCLOUD_REST_URL}/ocs/v1.php/cloud/users/${NEXTCLOUD_USER}`,
      {
        headers: {
          "OCS-APIRequest": "true",
          Accept: "application/json",
        },
        auth: {
          username: NEXTCLOUD_USER,
          password: NEXTCLOUD_PASSWORD,
        },
      }
    );

    const data = response.data.ocs.data;

    // Extract storage details
    const storageInfo = {
      totalStorage: data.quota.total / (1024 * 1024),
      usedStorage: data.quota.used / (1024 * 1024),
      freeStorage: data.quota.free / (1024 * 1024),
      relativeUsage: data.quota.relative,
    };

    return res.status(200).json({ success: true, storageInfo });
  } catch (error) {
    console.error("Error fetching storage info:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getFolderSize = async (req, res) => {
  try {
    const folderPath = req.query.path;
    if (!folderPath) {
      return res.status(400).json({ error: "Folder path is required" });
    }

    const { NEXTCLOUD_URL, NEXTCLOUD_USER, NEXTCLOUD_PASSWORD } =
      await createWebDAVClient();

    const url = `${NEXTCLOUD_URL}/${NEXTCLOUD_USER}/Spherify_Data/${folderPath}`;

    console.log("URL: ", url);

    const response = await axios.request({
      method: "PROPFIND",
      url: url,
      headers: {
        Authorization:
          "Basic " + base64.encode(`${NEXTCLOUD_USER}:${NEXTCLOUD_PASSWORD}`),
        Depth: "1",
        "Content-Type": "application/xml",
      },
    });

    console.log(response.data);
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, "text/xml");

    const responses = xmlDoc.getElementsByTagName("d:response");
    let folderSize = 0;

    for (let i = 0; i < responses.length; i++) {
      const hrefNode = responses[i].getElementsByTagName("d:href")[0];
      if (hrefNode && hrefNode.textContent.includes(folderPath)) {
        const quotaUsedNode =
          responses[i].getElementsByTagName("d:quota-used-bytes")[0];
        if (quotaUsedNode) {
          folderSize = parseInt(quotaUsedNode.textContent, 10);
          break;
        }
      }
    }

    return res.json({ folderPath, size: folderSize });
  } catch (error) {
    console.error(
      "Error fetching folder size:",
      error.response?.data || error.message
    );
    return res.status(500).json({ error: "Failed to fetch folder size" });
  }
};

exports.downloadFileOrFolder = async (req, res) => {
  try {
    let { filePath, isFolder } = req.query;

    if (!filePath) {
      return res.status(400).json({ success: false, error: "File path is required." });
    }

    const { NEXTCLOUD_USER, NEXTCLOUD_PASSWORD, NEXTCLOUD_REST_URL } = await createWebDAVClient();

    console.log("Requested File/Folder:", filePath);
    console.log("Is Folder:", isFolder === "true");

    // Extract the relative path (Nextcloud requires this format)
    const relativePath = filePath.replace(
      "https://spherify-cloud.mooo.com/remote.php/dav/files/spherify/",
      ""
    );

    console.log("Relative Path:", relativePath);

    // ✅ Generate a public share link (for both files and folders)
    const shareResponse = await axios.post(
      `${NEXTCLOUD_REST_URL}/ocs/v2.php/apps/files_sharing/api/v1/shares`,
      new URLSearchParams({
        path: relativePath,
        shareType: 3, // Public link
        permissions: 1, // Read-only
      }),
      {
        headers: {
          "OCS-APIRequest": "true",
          Accept: "application/json",
          Authorization: "Basic " + base64.encode(`${NEXTCLOUD_USER}:${NEXTCLOUD_PASSWORD}`),
        },
      }
    );

    const shareUrl = shareResponse.data?.ocs?.data?.url;
    if (!shareUrl) {
      return res.status(500).json({ success: false, error: "Failed to create share link." });
    }

    console.log("Generated Public Share Link:", shareUrl);

    // ✅ Append `/download` for direct file download
    const downloadUrl = `${shareUrl}/download`;

    return res.status(200).json({ success: true, downloadUrl });
  } catch (error) {
    console.error("Download error:", error.response?.data || error.message);
    return res.status(500).json({ success: false, error: "Failed to generate download link." });
  }
};

