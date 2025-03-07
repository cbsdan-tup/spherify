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

// Static method to find non-deleted files
fileSchema.statics.findActive = function (query = {}) {
  return this.find({ ...query, isDeleted: false });
};

fileSchema.statics.findDeleted = function (query = {}) {
  return this.find({ ...query, isDeleted: true });
};

module.exports = mongoose.model("File", fileSchema);
