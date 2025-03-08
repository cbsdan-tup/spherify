const File = require('../models/File');
const {Team} = require('../models/Team');
const axios = require('axios');
const { createWebDAVClient } = require('../utils/nextcloud.js');
const mongoose = require('mongoose');

/**
 * Get all files across all teams for admin view
 */
exports.getAllFiles = async (req, res) => {
  try {
    // Get query parameters for filtering
    const { team, type, search } = req.query;
    
    // At root level, we only want to show team folders
    const showOnlyTeams = !req.query.path;
    
    // Base path for Nextcloud
    const basePath = `https://spherify-cloud.mooo.com/remote.php/dav/files/spherify/Spherify_Data`;
    
    // Build query object
    const query = {};
    
    if (team) {
      query.teamId = team;
    }
    
    if (type) {
      query.type = type;
    }
    
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    // Don't include deleted files by default
    query.isDeleted = { $ne: true };
    
    // If we're at the root level, only return team folders
    if (showOnlyTeams) {
      // Get team data first
      const teams = await Team.find({});
      
      // Find only files that are team folders (directly under Spherify_Data)
      query.type = 'folder';
      query.teamId = { $exists: true };
      query.url = { $regex: new RegExp(`^${basePath}/[^/]+$`, 'i') };
      
      const folders = await File.find(query)
        .populate('owner', 'firstName lastName email')
        .sort({ name: 1 });
      
      // Enhance folder data with team information
      const enhancedFolders = folders.map(folder => {
        const team = teams.find(t => t._id.toString() === folder.teamId.toString());
        return {
          ...folder.toObject(),
          teamName: team?.name || 'Unknown Team',
          displayName: team?.name || folder.name // Show team name instead of folder name
        };
      });
      
      return res.json({
        success: true,
        files: enhancedFolders,
      });
    } else {
      // For non-root paths, return files as usual
      const files = await File.find(query)
        .populate('owner', 'firstName lastName email')
        .sort({ createdAt: -1 });
      
      return res.json({
        success: true,
        files,
      });
    }
  } catch (error) {
    console.error('Error fetching all files:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching files',
      error: error.message,
    });
  }
};

/**
 * Get files and folders by path for admin - using same approach as FileSharingController
 */
exports.getFilesAndFoldersByPath = async (req, res) => {
  try {
    const relativePath = req.query.path || "";
    const teamId = req.query.teamId || null; // Optional teamId filter for admin view

    console.log("Admin fetching files for path:", relativePath || "(root)");
    console.log("TeamId filter (optional):", teamId);

    // Escape special regex characters in path
    const escapedPath = relativePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    
    const { NEXTCLOUD_URL, NEXTCLOUD_USER, NEXTCLOUD_PASSWORD } = await createWebDAVClient();

    // Base path for Nextcloud
    const basePath = `https://spherify-cloud.mooo.com/remote.php/dav/files/spherify/Spherify_Data`;
    
    // Build regex pattern similar to FileShareController
    const pathRegex = relativePath
      ? `^${basePath}/${escapedPath}(/[^/]+)?$`
      : `^${basePath}/[^/]+$`;
    
    console.log("Using path regex:", pathRegex);

    // Build query object - similar to FileShareController but without requiring teamId
    const query = {
      isDeleted: false,
      url: { $regex: new RegExp(pathRegex, "i") },
    };
    
    // Add teamId filter if provided
    if (teamId) {
      query.teamId = teamId;
    }

    // Fetch files matching the path pattern
    let files = await File.find(query)
      .populate("owner", "firstName lastName email")
      .populate("parentFolder")
      .populate("history.performedBy", "firstName lastName email avatar");

    console.log(`Found ${files.length} files at path ${relativePath}`);
    
    // Exclude the queried folder itself
    const currentFolderUrl = `${basePath}/${relativePath}`;
    files = files.filter((file) => file.url !== currentFolderUrl);

    // Process files to extract clean names from paths
    files = files.map(file => {
      // For display purposes, we want just the last part of the path as name
      const urlParts = file.url.split('/');
      const displayName = urlParts[urlParts.length - 1]; // Just the last segment
      
      return {
        ...file.toObject(),
        displayName,
        relativePath: file.url.substring(basePath.length + 1) // +1 for the trailing slash
      };
    });

    // Handle file sizes
    let totalFolderSize = 0;
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
          console.log("Error fetching file size for", file.url);
        }
        return { ...file, size: fileSize };
      })
    );

    return res.status(200).json({ 
      success: true, 
      files: updatedFiles,
      totalFolderSize,
      currentPath: relativePath
    });
  } catch (error) {
    console.error('Error fetching files by path:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching files by path',
      error: error.message,
    });
  }
};

/**
 * Get storage statistics for admin dashboard
 */
exports.getStorageStatistics = async (req, res) => {
  try {
    // Get team statistics
    const teams = await Team.find({});
    
    // Get file statistics
    const totalFiles = await File.countDocuments({ type: 'file', isDeleted: { $ne: true } });
    const totalFolders = await File.countDocuments({ type: 'folder', isDeleted: { $ne: true } });
    
    // Get storage usage
    const filesAggregate = await File.aggregate([
      { $match: { type: 'file', isDeleted: { $ne: true } } },
      { $group: { _id: null, totalSize: { $sum: '$size' } } }
    ]);
    
    const totalStorageUsed = filesAggregate[0]?.totalSize || 0;
    
    // Get file counts per team
    const filesByTeam = await File.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: '$teamId', count: { $sum: 1 }, size: { $sum: '$size' } } }
    ]);
    
    // Map team IDs to names
    const teamsWithFileStats = await Promise.all(
      filesByTeam.map(async (item) => {
        const team = teams.find(t => t._id.toString() === item._id);
        return {
          teamId: item._id,
          teamName: team?.name || 'Unknown Team',
          fileCount: item.count,
          storageUsed: item.size
        };
      })
    );
    
    return res.json({
      success: true,
      statistics: {
        totalTeams: teams.length,
        totalFiles,
        totalFolders,
        totalStorageUsed,
        teamsWithFileStats
      }
    });
  } catch (error) {
    console.error('Error fetching storage statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching storage statistics',
      error: error.message,
    });
  }
};
