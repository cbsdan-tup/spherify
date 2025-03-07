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
      
      // Add history entry for folder creation
      if (createdBy) {
        await folderRecord.addHistory('created', createdBy, {
          comment: `Folder "${name}" created`
        });
      }
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
        
        // Add history entry for file upload
        if (createdBy) {
          await fileRecord.addHistory('created', createdBy, {
            comment: `File "${fileName}" uploaded`
          });
        }
        
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
            
            // Add history entry for folder creation
            if (createdBy) {
              await savedFolder.addHistory('created', createdBy, {
                comment: `Folder "${folder}" created in folder upload operation`
              });
            }
            
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
          
          // Add history entry for auto-created parent folder
          if (createdBy) {
            await savedFolder.addHistory('created', createdBy, {
              comment: `Folder "${folderName}" auto-created during folder upload`
            });
          }
          
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
      
      // Add history entry for file upload
      if (createdBy) {
        await newFile.addHistory('created', createdBy, {
          comment: `File "${path.basename(relativeFilePath)}" uploaded as part of folder upload`,
          path: relativeFilePath
        });
      }
      
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
      
      // Add history entry for file upload
      if (createdBy) {
        await fileRecord.addHistory('created', createdBy, {
          comment: `File "${fileName}" uploaded to ${relativePath || 'root folder'}`
        });
      }
      
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
    const files = await File.findActive().populate(
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
    const files = await File.findActive({ teamId }).populate(
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
      "Fetching active files for team folder:",
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

    // Fetch only active files
    let files = await File.find({
      teamId,
      isDeleted: false, // ✅ Only fetch non-deleted files
      url: { $regex: new RegExp(pathRegex, "i") },
    }).populate("createdBy owner parentFolder branchParent").populate("history.performedBy", "firstName lastName email avatar");

    console.log("pathRegex", pathRegex);

    // 🔥 Exclude the queried folder itself
    const currentFolderUrl = `${basePath}/${relativePath}`;
    files = files.filter((file) => file.url !== currentFolderUrl);

    // 🔥 Exclude files if **ANY** ancestor folder is deleted
    const isParentDeleted = new Set();

    async function checkParentDeletion(file) {
      let parent = file.parentFolder;
      while (parent) {
        if (parent.isDeleted) {
          isParentDeleted.add(file._id.toString());
          return true;
        }
        parent = await File.findById(parent.parentFolder); // Move up the hierarchy
      }
      return false;
    }

    // Check all files for deleted ancestors
    files = await Promise.all(
      files.map(async (file) => {
        const hasDeletedParent = await checkParentDeletion(file);
        return hasDeletedParent ? null : file;
      })
    );

    // Remove `null` entries (files with deleted parents)
    files = files.filter((file) => file !== null);

    let totalFolderSize = 0;

    // Fetch file sizes from Nextcloud
    const updatedFiles = await Promise.all(
      files.map(async (file) => {
        let fileSize = null;
        try {
          const response = await axios({
            method: "PROPFIND",
            url: file.url,
            auth: {
              username: NEXTCLOUD_USER,
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

    // Add history entry for team folder creation
    if (createdBy) {
      await newFolder.addHistory('created', createdBy, {
        comment: `Team folder created for team ${teamId}`
      });
    }

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
    
    // Add history entry for new folder creation
    if (createdBy) {
      await newFolder.addHistory('created', createdBy, {
        comment: `Folder "${name}" created${relativePath ? ` in ${relativePath}` : ''}`
      });
    }

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

exports.softDeleteFile = async (req, res) => {
  try {
      const {fileId} = req.params;
      // Get user ID from authenticated request
      const userId = req.user ? req.user._id : null;
      
      const file = await File.findById(fileId);
      if (!file) {
        throw new Error("File not found");
      }
      
      // Use the userId if available
      if (userId) {
        await file.addHistory('deleted', userId, {
          comment: `${file.type === 'folder' ? 'Folder' : 'File'} "${file.name}" moved to trash`
        });
      } else {
        await file.softDelete();
      }
      
      console.log("File soft deleted successfully");
      res.status(200).json({ success: true, message: "Item moved to trash successfully" });
  } catch (error) {
    console.error("File deletion error:", error);
    res.status(500).json({ success: false, error: "Deletion failed" });
  }
}

/**
 * Delete a file or folder from Nextcloud and MongoDB
 */
exports.deleteFileOrFolder = async (req, res) => {
  try {
    const { fileId } = req.params;
    // Get user ID for history tracking
    const userId = req.user ? req.user._id : null;

    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({ success: false, error: "Invalid file ID" });
    }

    const fileRecord = await File.findById(fileId);
    if (!fileRecord) {
      return res.status(404).json({ success: false, error: "File not found" });
    }

    // Store file information before deletion for history
    const fileName = fileRecord.name;
    const fileType = fileRecord.type;
    const filePath = fileRecord.url;

    const { webdavClient } = await createWebDAVClient();
    const nextcloudPath = fileRecord.url.replace(
      "https://spherify-cloud.mooo.com/remote.php/dav/files/spherify/Spherify_Data/",
      ""
    );

    console.log(`Deleting: ${nextcloudPath}`);

    // Check if file/folder exists before attempting deletion
    try {
      await webdavClient.stat(nextcloudPath);
    } catch (err) {
      if (err.status === 404) {
        console.log("File or folder does not exist in Nextcloud.");
      } else {
        throw err;
      }
    }

    // If this is a team-level deletion and we have a userId, record it in a system log
    if (userId) {
      // Create a system-wide deletion log entry - this would be stored even after the file is deleted
      // You could create a separate SystemLog model for this purpose
      console.log(`User ${userId} permanently deleted ${fileType} "${fileName}" at ${filePath}`);
      
      // Optional: If you want to keep deletion records, you could implement a separate
      // DeletionLog model that stores information about permanently deleted files
    }

    if (fileRecord.type === "folder") {
      await deleteFolderRecursively(fileId, webdavClient); // Recursively delete all sub-files & sub-folders
    }

    // Delete the main file/folder
    await webdavClient.deleteFile(nextcloudPath);
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

// Recursive function to soft delete a folder and all nested files/folders
async function recursiveSoftDelete(folderId, userId = null) {
  const children = await File.find({ parentFolder: folderId });

  for (const child of children) {
    child.isDeleted = true;
    child.deletedAt = new Date();
    
    // Add history entry if userId is provided
    if (userId) {
      await child.addHistory('deleted', userId, {
        comment: `${child.type === 'folder' ? 'Folder' : 'File'} "${child.name}" moved to trash with parent folder`
      });
    } else {
      await child.save();
    }

    // If the child is a folder, recursively delete its children
    if (child.type === "folder") {
      await recursiveSoftDelete(child._id, userId);
    }
  }
}

exports.softDeleteFileOrFolder = async (req, res) => {
  try {
    const { fileId } = req.params;
    // Get user ID from authenticated request
    const userId = req.user ? req.user._id : null;

    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({ success: false, message: "File or folder not found." });
    }

    file.isDeleted = true;
    file.deletedAt = new Date();
    
    // Add history entry if userId is provided
    if (userId) {
      await file.addHistory('deleted', userId, {
        comment: `${file.type === 'folder' ? 'Folder' : 'File'} "${file.name}" moved to trash`
      });
    } else {
      await file.save();
    }

    if (file.type === "folder") {
      await recursiveSoftDelete(file._id, userId);
    }

    res.status(200).json({ success: true, message: "File/folder soft deleted successfully." });
  } catch (error) {
    console.error("Error soft deleting file/folder:", error);
    res.status(500).json({ success: false, message: "Failed to soft delete file/folder." });
  }
};

exports.getDeletedFilesAndFolders = async (req, res) => {
  try {
    const { teamId } = req.params;

    let query = { isDeleted: true };
    if (teamId) {
      query.teamId = teamId;
    }

    // ✅ Fetch deleted files and fully populate parentFolder to get hierarchy
    let deletedFiles = await File.findDeleted(query).populate("createdBy owner parentFolder");

    if (deletedFiles.length === 0) {
      return res.status(200).json({ success: true, message: "No deleted files or folders found." });
    }

    // 🔥 Step 1: Collect IDs of all deleted folders
    const deletedFolderIds = new Set(
      deletedFiles.filter(file => file.type === "folder").map(folder => folder._id.toString())
    );

    // 🔥 Step 2: Recursively check if any file's parent (or ancestor) is deleted
    const hasDeletedParent = (file) => {
      let parent = file.parentFolder;

      while (parent && parent._id) {
        if (deletedFolderIds.has(parent._id.toString())) {
          return true; // File is inside a deleted folder
        }
        parent = parent.parentFolder; // Move up the hierarchy
      }

      return false;
    };

    // ✅ Remove files/folders that have a deleted parent
    deletedFiles = deletedFiles.filter(file => !hasDeletedParent(file));

    res.status(200).json({ success: true, deletedFiles });
  } catch (error) {
    console.error("Error retrieving soft-deleted files/folders:", error);
    res.status(500).json({ success: false, message: "Failed to retrieve deleted files/folders." });
  }
};

async function restoreNestedFiles(folderId, userId = null) {
  const children = await File.find({ parentFolder: folderId, isDeleted: true });

  for (const child of children) {
    child.isDeleted = false;
    child.deletedAt = null;
    
    // Add history entry if userId is provided
    if (userId) {
      await child.addHistory('restored', userId, {
        comment: `${child.type === 'folder' ? 'Folder' : 'File'} "${child.name}" restored with parent folder`
      });
    } else {
      await child.save();
    }

    if (child.type === "folder") {
      await restoreNestedFiles(child._id, userId);
    }
  }
}

exports.restoreFileOrFolder = async (req, res) => {
  try {
    const { fileId } = req.params;
    // Get user ID from authenticated request
    const userId = req.user ? req.user._id : null;

    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({ success: false, message: "File or folder not found." });
    }

    file.isDeleted = false;
    file.deletedAt = null;
    
    // Add history entry if userId is provided
    if (userId) {
      await file.addHistory('restored', userId, {
        comment: `${file.type === 'folder' ? 'Folder' : 'File'} "${file.name}" restored from trash`
      });
    } else {
      await file.save();
    }

    if (file.type === "folder") {
      await restoreNestedFiles(file._id, userId);
    }

    res.status(200).json({ success: true, message: "File/folder restored successfully." });
  } catch (error) {
    console.error("Error restoring file/folder:", error);
    res.status(500).json({ success: false, message: "Failed to restore file/folder." });
  }
};

exports.renameFileOrFolder = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { newName } = req.body;
    // Get user ID from the authenticated request
    const userId = req.user ? req.user._id : null;

    if (!fileId || !newName) {
      return res.status(400).json({ 
        success: false, 
        error: "File ID and new name are required." 
      });
    }

    // Get file info from MongoDB
    const fileRecord = await File.findById(fileId);
    if (!fileRecord) {
      return res.status(404).json({ 
        success: false, 
        error: "File or folder not found." 
      });
    }

    // Store original name and path for history
    const originalName = fileRecord.name;
    const { webdavClient, BASE_URL } = await createWebDAVClient();
    const url = fileRecord.url;
    console.log("Original URL:", url);

    // We need to handle paths correctly for WebDAV
    // The WebDAV client already knows the base path including "Spherify_Data"
    // So we need to extract only the relative path after that
    
    // First, identify where "Spherify_Data" is in the URL
    const dataIndex = url.indexOf("/Spherify_Data/");
    
    // Extract the path relative to Spherify_Data, but DO NOT include "Spherify_Data" itself
    let relativePath;
    if (dataIndex !== -1) {
      relativePath = url.substring(dataIndex + "/Spherify_Data/".length);
    } else {
      // Fallback if structure is different
      relativePath = url.substring(url.indexOf("/spherify/") + "/spherify/".length);
    }

    console.log("Relative path for WebDAV:", relativePath);
    
    // Now split the relative path to get components
    const relativePathParts = relativePath.split('/');
    
    // Replace the last part (filename) with the new name
    relativePathParts[relativePathParts.length - 1] = newName;
    
    // Create source and destination paths for the WebDAV operation
    const oldPath = relativePath;
    const newPath = relativePathParts.join('/');
    
    console.log(`WebDAV rename from "${oldPath}" to "${newPath}"`);

    // Rename the file in Nextcloud
    try {
      await webdavClient.moveFile(oldPath, newPath);
    } catch (err) {
      console.error("Nextcloud rename error:", err);
      
      // Try an alternative approach if the first one fails
      try {
        console.log("Trying alternative rename approach...");
        // Some WebDAV clients require full paths
        const fullOldPath = `remote.php/dav/files/spherify/${oldPath}`;
        const fullNewPath = `remote.php/dav/files/spherify/${newPath}`;
        await webdavClient.moveFile(fullOldPath, fullNewPath);
      } catch (altErr) {
        console.error("Alternative approach also failed:", altErr);
        return res.status(500).json({ 
          success: false, 
          error: "Failed to rename in storage system.", 
          details: err.message,
          fullPath: url
        });
      }
    }

    // Update MongoDB record with the new name
    fileRecord.name = newName;
    
    // Update the URL in the database
    fileRecord.url = url.substring(0, url.lastIndexOf('/') + 1) + newName;
    
    // Add history entry if we have a userId
    if (userId) {
      await fileRecord.addHistory('renamed', userId, {
        previousName: originalName,
        newName: newName,
        previousPath: oldPath,
        newPath: newPath,
        comment: `Renamed from "${originalName}" to "${newName}"`
      });
    } else {
      // Just save without history if no user ID is available
      await fileRecord.save();
    }

    // If renaming a folder, update URLs of all children using bulk operation
    if (fileRecord.type === "folder") {
      const oldUrlPrefix = url + '/';
      const newUrlPrefix = fileRecord.url + '/';
      
      // Build the regex pattern for the URL prefix to match
      const urlRegex = new RegExp('^' + oldUrlPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      
      // Find all files that need updating
      const files = await File.find({ url: { $regex: urlRegex } });
      
      if (files.length > 0) {
        // Prepare bulk operations
        const bulkOps = files.map(file => ({
          updateOne: {
            filter: { _id: file._id },
            update: { 
              $set: { 
                url: file.url.replace(oldUrlPrefix, newUrlPrefix),
                updatedAt: new Date()
              }
            }
          }
        }));
        
        // Execute bulk operation
        const bulkResult = await File.bulkWrite(bulkOps);
        console.log(`Bulk updated ${bulkResult.modifiedCount} nested files/folders`);
        
        // Add history entries for nested files (can't use bulk update for this)
        if (userId) {
          for (const file of files) {
            const updatedFile = await File.findById(file._id);
            if (updatedFile) {
              await updatedFile.addHistory('moved', userId, {
                previousPath: file.url,
                newPath: file.url.replace(oldUrlPrefix, newUrlPrefix),
                comment: `Path updated due to parent folder rename from "${originalName}" to "${newName}"`
              });
            }
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      message: "File/folder renamed successfully.",
      file: fileRecord
    });
  } catch (error) {
    console.error("Error renaming file/folder:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to rename file/folder." 
    });
  }
};