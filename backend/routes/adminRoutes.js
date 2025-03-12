const express = require("express");
const AdminConfig = require("../models/AdminConfiguration");
const { isAdmin } = require("../middleware/auth");
const {
  getAllFiles,
  getStorageStatistics,
  getFilesAndFoldersByPath,
} = require("../controllers/AdminFileController");
const { getCloudinaryConfig } = require("../config/cloudinary");
const { initializeNextcloudAPI } = require("../utils/nextcloud");

const router = express.Router();

router.get("/admin-configuration", isAdmin, async (req, res) => {
  try {
    const config = (await AdminConfig.findOne()) || new AdminConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ message: "Error fetching configuration" });
  }
});

router.post("/admin-configuration", isAdmin, async (req, res) => {
  try {
    let config = await AdminConfig.findOne();
    if (config) {
      config = await AdminConfig.findOneAndUpdate({}, req.body, { new: true });
      console.log("config", config);
      // Add this: also refresh Cloudinary config on updates
      if (req.body.cloudinary) {
        getCloudinaryConfig().then(() => {
          console.log("Cloudinary reconfigured after update");
        });
      }
      if (req.body.nextcloud) {
        initializeNextcloudAPI().then(() => {
          console.log("Nextcloud API initialized successfully");
        });
      }
    } else {
      config = new AdminConfig(req.body);
      await config.save();
      getCloudinaryConfig().then(() => {
        console.log("Cloudinary configured successfully");
      });
      if (req.body.nextcloud) {
        initializeNextcloudAPI().then(() => {
          console.log("Nextcloud API initialized successfully");
        });
      }
    }
    res.json(config);
  } catch (error) {
    res.status(500).json({ message: "Error updating configuration" });
  }
});

router.get("/admin-configuration/site-conferencing-info", async (req, res) => {
  try {
    const config = await AdminConfig.findOne(
      {},
      "site conferencing nextcloud.url nextcloud.user nextcloud.storageTypePerTeam nextcloud.maxSizePerTeam"
    );

    if (!config) {
      return res.status(404).json({ message: "Configuration not found" });
    }

    res.json(config);
  } catch (error) {
    console.error("Error fetching configuration:", error);
    res.status(500).json({ message: "Error fetching configuration" });
  }
});

router.get("/admin-configuration/nextcloud-details", async (req, res) => {
  try {
    const config = await AdminConfig.findOne(
      {},
      "nextcloud.url nextcloud.adminUser nextcloud.storageTypePerTeam nextcloud.maxSizePerTeam"
    );

    if (!config) {
      return res.status(404).json({ message: "Configuration not found" });
    }

    res.json({
      nextcloud: {
        url: config.nextcloud.url,
        adminUser: config.nextcloud.adminUser,
      },
    });
  } catch (error) {
    console.error("Error fetching Nextcloud details:", error);
    res.status(500).json({ message: "Error fetching Nextcloud details" });
  }
});

// File management routes - ensure these don't have 'admin/' prefix since the router may already be mounted at /admin
router.get("/admin/getAllFiles", isAdmin, getAllFiles);
router.get(
  "/admin/getFilesAndFoldersByPath",
  isAdmin,
  getFilesAndFoldersByPath
);
router.get("/admin/getStorageStatistics", isAdmin, getStorageStatistics);

module.exports = router;
