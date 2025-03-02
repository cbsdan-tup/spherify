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
});

// Soft delete method
fileSchema.methods.softDelete = async function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  await this.save();
};

// Static method to find non-deleted files
fileSchema.statics.findActive = function (query = {}) {
  return this.find({ ...query, isDeleted: false });
};

fileSchema.statics.findDeleted = function (query = {}) {
  return this.find({ ...query, isDeleted: true });
};

module.exports = mongoose.model("File", fileSchema);
