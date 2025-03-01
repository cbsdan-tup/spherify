const axios = require("axios"); // Import axios
const AdminConfigurations = require("../models/AdminConfiguration");

let NEXTCLOUD_URL = "";
let NEXTCLOUD_REST_URL = "";
let NEXTCLOUD_USER = "";
let NEXTCLOUD_PASSWORD = "";
let NEXTCLOUD_API = "";

let BASE_URL = "";

const https = require("https");
const keepAliveAgent = new https.Agent({ keepAlive: true });

async function getNextcloudConfig() {
  try {
    const config = await AdminConfigurations.findOne({}, "nextcloud");
    if (!config) {
      throw new Error("Nextcloud configuration not found in database.");
    }
    NEXTCLOUD_URL = `${config.nextcloud.url || "https://spherify-cloud.mooo.com"}/remote.php/dav/files`;
    NEXTCLOUD_REST_URL = config.nextcloud.url || "https://spherify-cloud.mooo.com";
    NEXTCLOUD_USER = config.nextcloud.adminUser || "";
    NEXTCLOUD_PASSWORD = config.nextcloud.adminPassword || "";
    NEXTCLOUD_API = `${config.nextcloud.url || "https://spherify-cloud.mooo.com"}/ocs/v2.php/apps/files_sharing/api/v1/shares`;
    BASE_URL = `${NEXTCLOUD_URL}/${NEXTCLOUD_USER}/Spherify_Data`

  } catch (error) {
    console.error("Error fetching Nextcloud configuration:", error);
    throw error;
  }
}

getNextcloudConfig();

async function createWebDAVClient() {
  const { createClient } = await import("webdav");

  const webdavClient = createClient(
    BASE_URL,
    {
      username: NEXTCLOUD_USER,
      password: NEXTCLOUD_PASSWORD,
      maxBodyLength: Infinity, 
      timeout: 60000, 
      agent: keepAliveAgent, 
    }
  );

  return { webdavClient, nextcloudAPI, NEXTCLOUD_URL, NEXTCLOUD_REST_URL, NEXTCLOUD_USER, BASE_URL, NEXTCLOUD_API, NEXTCLOUD_PASSWORD }; 
}

const nextcloudAPI = axios.create({
  baseURL: NEXTCLOUD_REST_URL,
  auth: {
    username: NEXTCLOUD_USER,
    password: NEXTCLOUD_PASSWORD,
  },
  headers: {
    "OCS-APIRequest": "true",
  },
});

module.exports = { createWebDAVClient, nextcloudAPI};
