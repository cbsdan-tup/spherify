const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team",
    required: true,
  },
  type: {
    type: String,
    enum: ["folder", "file"],
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  isMainBranch: {
    type: Boolean,
    default: false,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  branchParent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "File", 
    default: null,
  },
  parentFolder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "File",
    default: null, 
  },
  collaborators: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      permissions: {
        type: String,
        enum: ["read", "write", "admin"],
        default: "read",
      },
    },
  ],
  version: {
    type: Number,
    default: 1,
  },
  shareLink: {
    type: String,
    default: null,
  },
  isDeleted: {
    type: Boolean,
    default: false, 
  },
  deletedAt: {
    type: Date,
    default: null
  },
  history: [{
    action: {
      type: String,
      enum: ['created', 'renamed', 'moved', 'edited', 'deleted', 'restored'],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    details: {
      previousName: String,
      newName: String,
      previousPath: String,
      newPath: String,
      comment: String
    }
  }]
});

// Pre-save hook to update the updatedAt field
fileSchema.pre('save', function(next) {
  // Only update updatedAt if document is modified (and not new)
  if (this.isModified() && !this.isNew) {
    this.updatedAt = Date.now();
  }
  next();
});

// Soft delete method
fileSchema.methods.softDelete = async function (userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.updatedAt = new Date();
  
  // Add to history if userId is provided
  if (userId) {
    this.history.push({
      action: 'deleted',
      timestamp: new Date(),
      performedBy: userId,
      details: {
        comment: 'File moved to trash'
      }
    });
  }
  
  await this.save();
};

// Method to add history entry
fileSchema.methods.addHistory = async function(action, userId, details = {}) {
  this.history.push({
    action,
    performedBy: userId,
    timestamp: new Date(),
    details
  });
  this.updatedAt = new Date();
  return this.save();
};

// Static method to update all ancestor folders' history when a file is edited
// This version supports batch operations with a shared processedFolders set
fileSchema.statics.updateAncestorFoldersHistory = async function(fileId, userId, action = 'edited', details = {}, processedFolders = new Set()) {
  try {
    console.log(`[updateAncestorFoldersHistory] Starting for fileId: ${fileId}, action: ${action}`);
    
    // Find the file that was edited
    const file = await this.findById(fileId);
    if (!file) {
      console.log(`[updateAncestorFoldersHistory] File ${fileId} not found`);
      return null;
    }
    
    if (!file.parentFolder) {
      console.log(`[updateAncestorFoldersHistory] File has no parent folder: ${fileId}`);
      return null;
    }
    
    console.log(`[updateAncestorFoldersHistory] File ${fileId} has parent: ${file.parentFolder}`);
    
    // Recursive function to update all ancestor folders
    const updateFolderAndAncestors = async (folderId) => {
      // Prevent duplicate updates to the same folder
      if (processedFolders.has(folderId.toString())) {
        console.log(`[updateFolderAndAncestors] Folder ${folderId} already processed, skipping`);
        return;
      }
      
      processedFolders.add(folderId.toString());
      
      const folder = await this.findById(folderId);
      if (!folder) {
        console.log(`[updateFolderAndAncestors] Folder ${folderId} not found`);
        return;
      }
      
      console.log(`[updateFolderAndAncestors] Adding history to folder: ${folder.name} (${folder._id})`);
      
      // Add history entry to this folder
      folder.history.push({
        action: 'edited',
        timestamp: new Date(),
        performedBy: userId,
        details: {
          comment: `File "${file.name}" was ${action}`,
          ...details
        }
      });
      
      folder.updatedAt = new Date();
      await folder.save();
      console.log(`[updateFolderAndAncestors] Updated folder: ${folder.name} successfully`);
      
      // Continue up the hierarchy if this folder has a parent
      if (folder.parentFolder) {
        console.log(`[updateFolderAndAncestors] Moving up to parent: ${folder.parentFolder}`);
        await updateFolderAndAncestors(folder.parentFolder);
      } else {
        console.log(`[updateFolderAndAncestors] Reached top level folder: ${folder.name}`);
      }
    };
    
    // Start the recursive process with the immediate parent
    await updateFolderAndAncestors(file.parentFolder);
    console.log(`[updateAncestorFoldersHistory] Completed for file: ${file.name}`);
    return true;
  } catch (error) {
    console.error('[updateAncestorFoldersHistory] Error:', error);
    return null;
  }
};

// Add a batch update method for processing multiple files efficiently
fileSchema.statics.batchUpdateAncestorFoldersHistory = async function(fileIds, userId, action = 'edited', details = {}) {
  try {
    console.log(`[batchUpdateAncestorFoldersHistory] Starting batch update for ${fileIds.length} files`);
    
    // Make sure we have valid fileIds
    if (!fileIds || fileIds.length === 0) {
      console.log('[batchUpdateAncestorFoldersHistory] No file IDs provided');
      return null;
    }
    
    // Track processed folders across all files in the batch
    const processedFolders = new Set();
    
    for (let i = 0; i < fileIds.length; i++) {
      const fileId = fileIds[i];
      console.log(`[batchUpdateAncestorFoldersHistory] Processing file ${i+1}/${fileIds.length}: ${fileId}`);
      
      // Use the same processedFolders set across all files
      await this.updateAncestorFoldersHistory(fileId, userId, action, details, processedFolders);
    }
    
    console.log(`[batchUpdateAncestorFoldersHistory] Completed batch update, processed folders: ${processedFolders.size}`);
    return true;
  } catch (error) {
    console.error('[batchUpdateAncestorFoldersHistory] Error in batch update:', error);
    return null;
  }
};

// Keep the old method name as an alias for backward compatibility
fileSchema.statics.updateParentFolderHistory = fileSchema.statics.updateAncestorFoldersHistory;

// Static method to find non-deleted files
fileSchema.statics.findActive = function (query = {}) {
  return this.find({ ...query, isDeleted: false });
};

fileSchema.statics.findDeleted = function (query = {}) {
  return this.find({ ...query, isDeleted: true });
};

module.exports = mongoose.model("File", fileSchema);
