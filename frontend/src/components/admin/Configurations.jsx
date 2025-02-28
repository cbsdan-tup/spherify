import React, { useState, useEffect } from "react";
import { errMsg, succesMsg } from "../../utils/helper";
import { useSelector } from "react-redux";
import axios from "axios";
import LoadingSpinner from "../layout/LoadingSpinner";

const Configurations = () => {
  const [config, setConfig] = useState({
    site: { logo: "", title: "", favicon: "" },
    nextcloud: {
      url: "",
      adminUser: "",
      adminPassword: "",
      storageTypePerTeam: "infinity",
      maxSizePerTeam: null,
    },
    conferencing: { url: "" },
    cloudinary: { name: "", api_key: "", api_secret: "" },
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChange, setIsChange] = useState(false);
  const [showAdminCloudPassword, setShowAdminCloudPassword] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);

  const token = useSelector((state) => state.auth.token);

  const fetchConfigurations = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API}/admin-configuration`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setConfig(response.data || {});
    } catch (error) {
      console.error("Error fetching configurations:", error);
      errMsg("Error fetching configurations", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigurations();
  }, []);

  const handleChange = (section, field, value) => {
    setIsChange(true);
    setConfig((prevConfig) => ({
      ...prevConfig,
      [section]: { ...prevConfig[section], [field]: value },
    }));
  };

  const saveConfig = async () => {
    try {
      await axios.post(
        `${import.meta.env.VITE_API}/admin-configuration`,
        config,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      succesMsg("Configuration updated successfully", "success");
    } catch (error) {
      console.error("Error updating configuration:", error);
      errMsg("Error updating configuration", error);
    } finally {
      setIsChange(false);
    }
  };

  return (
    <div className="admin-configurations">
      <h2>Admin Configuration</h2>
      {isLoading ? (
        <LoadingSpinner message="Loading Configurations" />
      ) : (
        <div>
          <fieldset>
            <legend>
              <i className="fa-solid fa-globe"></i>
              <span>Site Configuration</span>
            </legend>
            <label>
              <span className="text">Logo URL: </span>
              <input
                type="text"
                value={config.site.logo}
                onChange={(e) => handleChange("site", "logo", e.target.value)}
              />
            </label>
            <label>
              <span className="text">Title: </span>
              <input
                type="text"
                value={config.site.title}
                onChange={(e) => handleChange("site", "title", e.target.value)}
              />
            </label>
            <label>
              <span className="text">Favicon URL: </span>
              <input
                type="text"
                value={config.site.favicon}
                onChange={(e) =>
                  handleChange("site", "favicon", e.target.value)
                }
              />
            </label>
          </fieldset>
          <hr />
          <fieldset>
            <legend>
              <i className="fa-solid fa-cloud"></i>
              <span>Nextcloud Configuration</span>
            </legend>
            <label>
              <span className="text">URL: </span>
              <input
                type="text"
                value={config.nextcloud.url}
                onChange={(e) =>
                  handleChange("nextcloud", "url", e.target.value)
                }
              />
            </label>
            <label>
              <span className="text">Admin User: </span>
              <input
                type="text"
                value={config.nextcloud.adminUser}
                onChange={(e) =>
                  handleChange("nextcloud", "adminUser", e.target.value)
                }
              />
            </label>
            <label>
              <span className="text">Admin Password: </span>
              <input
                type={showAdminCloudPassword ? "text" : "password"}
                value={config.nextcloud.adminPassword}
                onChange={(e) =>
                  handleChange("nextcloud", "adminPassword", e.target.value)
                }
              />
              <i
                className={`fa-solid ${
                  showAdminCloudPassword ? "fa-eye-slash" : "fa-eye"
                } show-password`}
                onClick={() => setShowAdminCloudPassword((prev) => !prev)}
              ></i>
            </label>
            <label>
              <span className="text">Storage Type:</span>
              <select
                value={config.nextcloud.storageTypePerTeam}
                onChange={(e) =>
                  handleChange(
                    "nextcloud",
                    "storageTypePerTeam",
                    e.target.value
                  )
                }
              >
                <option value="infinity">Infinity</option>
                <option value="limited">Limited</option>
              </select>
            </label>
            {config.nextcloud.storageTypePerTeam === "limited" && (
              <label>
                <span className="text">Max Size Per Team (GB):</span>
                <div className="custom-size">
                  <select
                    value={
                      ["1", "5", "10", "15"].includes(
                        config.nextcloud.maxSizePerTeam
                      )
                        ? config.nextcloud.maxSizePerTeam
                        : "custom"
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "custom") {
                        handleChange("nextcloud", "maxSizePerTeam", ""); // Clear input for custom entry
                      } else {
                        handleChange("nextcloud", "maxSizePerTeam", value);
                      }
                    }}
                  >
                    <option value="">Select Size</option>
                    <option value="1">1 GB</option>
                    <option value="5">5 GB</option>
                    <option value="10">10 GB</option>
                    <option value="15">15 GB</option>
                    <option value="custom">Custom</option>
                  </select>

                  {config.nextcloud.maxSizePerTeam === "" ||
                  !["1", "5", "10", "15"].includes(
                    config.nextcloud.maxSizePerTeam
                  ) ? (
                    <input
                      type="number"
                      min={1}
                      placeholder="Enter custom GB"
                      value={config.nextcloud.maxSizePerTeam || ""}
                      onChange={(e) =>
                        handleChange(
                          "nextcloud",
                          "maxSizePerTeam",
                          e.target.value
                        )
                      }
                    />
                  ) : null}
                </div>
              </label>
            )}
          </fieldset>
          <hr />
          <fieldset>
            <legend>
              <i className="fa-solid fa-video"></i>
              <span>Conferencing Configuration</span>
            </legend>
            <label>
              <span className="text">Domain Name: </span>
              <input
                type="text"
                value={config.conferencing.url}
                onChange={(e) =>
                  handleChange("conferencing", "url", e.target.value)
                }
              />
            </label>
          </fieldset>
          <hr />
          <fieldset>
            <legend>
              <i className="fa-solid fa-image"></i>
              <span>Cloudinary Configuration</span>
            </legend>
            <label>
              <span className="text">Cloud Name: </span>
              <input
                type="text"
                value={config.cloudinary.name}
                onChange={(e) =>
                  handleChange("cloudinary", "name", e.target.value)
                }
              />
            </label>
            <label>
              <span className="text">API Key: </span>
              <input
                type="text"
                value={config.cloudinary.api_key}
                onChange={(e) =>
                  handleChange("cloudinary", "api_key", e.target.value)
                }
              />
            </label>
            <label>
              <span className="text">API Secret: </span>
              <input
                type={`${showApiSecret ? "text" : "password"}`}
                value={config.cloudinary.api_secret}
                onChange={(e) =>
                  handleChange("cloudinary", "api_secret", e.target.value)
                }
              />
              <i
                className={`fa-solid ${
                  showApiSecret ? "fa-eye-slash" : "fa-eye"
                } show-password`}
                onClick={() => setShowApiSecret((prev) => !prev)}
              ></i>
            </label>
          </fieldset>

          <button
            onClick={saveConfig}
            disabled={!isChange}
            className={`${isChange ? "active" : ""}`}
          >
            Save Configuration
          </button>
        </div>
      )}
    </div>
  );
};

export default Configurations;
