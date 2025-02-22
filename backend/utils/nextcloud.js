const axios = require("axios"); // Import axios

const NEXTCLOUD_URL = "https://spherify-cloud.mooo.com/remote.php/dav/files";
const NEXTCLOUD_REST_URL = "https://spherify-cloud.mooo.com";
const NEXTCLOUD_USER = "spherify";
const NEXTCLOUD_PASSWORD = "spherify";
const NEXTCLOUD_API = "https://spherify-cloud.mooo.com/ocs/v2.php/apps/files_sharing/api/v1/shares";

const BASE_URL = `${NEXTCLOUD_URL}/${NEXTCLOUD_USER}/Spherify_Data`;

const https = require("https");
const keepAliveAgent = new https.Agent({ keepAlive: true });

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

  return { webdavClient, nextcloudAPI, NEXTCLOUD_URL, NEXTCLOUD_REST_URL, NEXTCLOUD_USER, BASE_URL, NEXTCLOUD_API, NEXTCLOUD_PASSWORD }; // Return all
}

const nextcloudAPI = axios.create({
  baseURL: NEXTCLOUD_REST_URL, // Corrected baseURL
  auth: {
    username: NEXTCLOUD_USER,
    password: NEXTCLOUD_PASSWORD,
  },
  headers: {
    "OCS-APIRequest": "true",
  },
});

module.exports = { createWebDAVClient, nextcloudAPI};
