const express = require("express");
const AdminConfig = require("../models/AdminConfiguration");
const { isAdmin } = require("../middleware/auth");
const { getAllFiles, getStorageStatistics, getFilesAndFoldersByPath } = require("../controllers/AdminFileController");

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
    } else {
      config = new AdminConfig(req.body);
      await config.save();
    }
    res.json(config);
  } catch (error) {
    res.status(500).json({ message: "Error updating configuration" });
  }
});

router.get("/admin-configuration/site-conferencing-info", async (req, res) => {
  try {
    const config = await AdminConfig.findOne({}, "site conferencing nextcloud.url nextcloud.user nextcloud.storageTypePerTeam nextcloud.maxSizePerTeam");

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
router.get("/admin/getFilesAndFoldersByPath", isAdmin, getFilesAndFoldersByPath);
router.get("/admin/getStorageStatistics", isAdmin, getStorageStatistics);

module.exports = router;
