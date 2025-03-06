const File = require('../models/File');
const Team = require('../models/Team');
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
    
    // Find all files and folders
    const files = await File.find(query)
      .populate('owner', 'firstName lastName email')
      .sort({ createdAt: -1 });
    
    return res.json({
      success: true,
      files,
    });
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
 * Get files and folders by path for admin
 */
exports.getFilesAndFoldersByPath = async (req, res) => {
  try {
    const { path } = req.query;
    
    console.log('Requested path parameter:', path);
    
    if (!path) {
      return res.status(400).json({
        success: false,
        message: 'Path is required',
      });
    }
    
    // First try to find by MongoDB ID (if path is an ID)
    if (mongoose.isValidObjectId(path)) {
      console.log('Path looks like a valid MongoDB ID, trying to find folder by ID');
      const folder = await File.findOne({
        _id: path,
        type: 'folder',
        isDeleted: { $ne: true }
      });
      
      if (folder) {
        console.log('Found folder by ID:', folder.name);
        // Get all files with this folder as parent
        const files = await File.find({
          parentFolder: folder._id,
          isDeleted: { $ne: true }
        }).populate('owner', 'firstName lastName email');
        
        return res.json({
          success: true,
          files,
          currentFolder: folder
        });
      }
      console.log('No folder found with that ID, continuing with path lookup');
    }
    
    console.log('Looking for folder with URL containing:', path);
    
    // Next try to find by URL matching
    // Get the client to determine the correct base URL
    const { NEXTCLOUD_URL, NEXTCLOUD_USER, NEXTCLOUD_PASSWORD } = await createWebDAVClient();
    
    // Try different path formats that might match
    const possibleUrls = [
      // Full URL with Spherify_Data
      `${NEXTCLOUD_URL}/${NEXTCLOUD_USER}/Spherify_Data/${path}`,
      // URL without Spherify_Data
      `${NEXTCLOUD_URL}/${NEXTCLOUD_USER}/${path}`,
      // Just the path itself
      path
    ];
    
    console.log('Trying possible URLs:', possibleUrls);
    
    // Try to find the folder by any of these URL patterns
    let folder = null;
    for (const url of possibleUrls) {
      folder = await File.findOne({
        url: { $regex: new RegExp(url, 'i') },
        type: 'folder',
        isDeleted: { $ne: true }
      });
      
      if (folder) {
        console.log('Found folder with URL:', url);
        console.log('Folder details:', folder.name, folder._id);
        break;
      }
    }
    
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found with any URL pattern',
        triedPaths: possibleUrls
      });
    }
    
    // Found the folder, now get all its children
    const files = await File.find({
      parentFolder: folder._id,
      isDeleted: { $ne: true }
    }).populate('owner', 'firstName lastName email');
    
    console.log(`Found ${files.length} files/folders in this folder`);
    
    // Add file sizes if possible
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
        return { ...file.toObject(), size: fileSize };
      })
    );

    return res.json({ 
      success: true, 
      files: updatedFiles, 
      totalFolderSize,
      currentFolder: folder
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
