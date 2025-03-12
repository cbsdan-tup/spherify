const cloudinary = require("cloudinary");
const AdminConfigurations = require("../models/AdminConfiguration");

exports.getCloudinaryConfig = async () => {
  try {
    const config = await AdminConfigurations.findOne({}, "cloudinary");
    // if (!config) {
    //   throw new Error("Cloudinary configuration not found in database.");
    // }

    const cloudinaryConfig = {
      cloud_name: config?.cloudinary?.name || process.env.CLOUDINARY_CLOUD_NAME || "",
      api_key: config?.cloudinary?.api_key || process.env.CLOUDINARY_API_KEY || "",
      api_secret: config?.cloudinary?.api_secret || process.env.CLOUDINARY_API_SECRET || "",
    };

    // Configure Cloudinary after fetching credentials
    cloudinary.config(cloudinaryConfig);
  } catch (error) {
    console.error("Error fetching Cloudinary configuration:", error);
  }
}