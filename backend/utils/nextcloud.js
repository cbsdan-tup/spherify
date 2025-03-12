const axios = require("axios");
const AdminConfigurations = require("../models/AdminConfiguration");

const https = require("https");
const keepAliveAgent = new https.Agent({ keepAlive: true });

let NEXTCLOUD_URL = "";
let NEXTCLOUD_REST_URL = "";
let NEXTCLOUD_USER = "";
let NEXTCLOUD_PASSWORD = "";
let NEXTCLOUD_API = "";
let BASE_URL = "";

// Function to fetch and store Nextcloud configuration
async function getNextcloudConfig() {
  try {
    const config = await AdminConfigurations.findOne({}, "nextcloud");
    // if (!config) {
    //   console.error("Nextcloud configuration not found in database.");
    //   return false; // Return false to indicate failure
    // }

    NEXTCLOUD_URL = `${config?.nextcloud?.url || "https://spherify-cloud.mooo.com"}/remote.php/dav/files`;
    NEXTCLOUD_REST_URL = config?.nextcloud?.url || "https://spherify-cloud.mooo.com";
    NEXTCLOUD_USER = config?.nextcloud?.adminUser || "spherify";
    NEXTCLOUD_PASSWORD = config?.nextcloud?.adminPassword || "spherify";
    NEXTCLOUD_API = `${config?.nextcloud?.url || "https://spherify-cloud.mooo.com"}/ocs/v2.php/apps/files_sharing/api/v1/shares`;
    BASE_URL = `${NEXTCLOUD_URL}/${NEXTCLOUD_USER}/Spherify_Data`;

    return true; 
  } catch (error) {
    console.error("Error fetching Nextcloud configuration:", error);
    return false;
  }
}

// Function to create WebDAV Client
async function createWebDAVClient() {
  const { createClient } = await import("webdav");

  if (!NEXTCLOUD_USER || !NEXTCLOUD_PASSWORD || !BASE_URL) {
    console.error("Nextcloud credentials are missing. Ensure configuration is loaded.");
    throw new Error("Nextcloud configuration is missing.");
  }

  const webdavClient = createClient(BASE_URL, {
    username: NEXTCLOUD_USER,
    password: NEXTCLOUD_PASSWORD,
    maxBodyLength: Infinity,
    timeout: 60000,
    agent: keepAliveAgent,
  });

  return { webdavClient, NEXTCLOUD_URL, NEXTCLOUD_REST_URL, NEXTCLOUD_USER, BASE_URL, NEXTCLOUD_API, NEXTCLOUD_PASSWORD };
}

// Initialize Nextcloud API client dynamically
async function initializeNextcloudAPI() {
  const success = await getNextcloudConfig();
  if (!success) {
    console.error("Failed to initialize Nextcloud API due to missing configuration.");
    return null;
  }

  return axios.create({
    baseURL: NEXTCLOUD_REST_URL,
    auth: {
      username: NEXTCLOUD_USER,
      password: NEXTCLOUD_PASSWORD,
    },
    headers: {
      "OCS-APIRequest": "true",
    },
  });
}

module.exports = { createWebDAVClient, initializeNextcloudAPI };
