const mongoose = require("mongoose");

const adminConfigSchema = new mongoose.Schema({
  site: {
    logo: { type: String, default: "" },
    title: { type: String, default: "" },
    favicon: { type: String, default: "" }
  },
  nextcloud: {
    url: { type: String, default: "" },
    adminUser: { type: String, default: "" },
    adminPassword: { type: String, default: "" },
    storageTypePerTeam: { type: String, enum: ["infinity", "limited"], default: "infinity" },
    maxSizePerTeam: { type: Number, default: null }
  },
  conferencing: {
    url: { type: String, default: "" }
  },
  cloudinary: {
    name: { type: String, default: "" },
    api_key: { type: String, default: "" },
    api_secret: { type: String, default: "" }
  },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("AdminConfiguration", adminConfigSchema);
