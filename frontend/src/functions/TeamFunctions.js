import axios from "axios";
import { errMsg, getToken, getUser, succesMsg } from "../utils/helper";

export const fetchTeamMembers = async (currentTeamId, authState = null) => {
  try {
    const token = getToken(authState);
    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    };
    const url = `${import.meta.env.VITE_API}/getTeamMembers/${currentTeamId}`;
    const response = await axios.get(url, config);
    console.log("Team members:", response.data);
    return response.data.members;
  } catch (error) {
    console.error("Error fetching team members:", error);
  }
};

export const addMessageGroup = async (messageGroup, authState = null) => {
  try {
    const token = getToken(authState);
    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    };
    const url = `${import.meta.env.VITE_API}/createMessageGroup`;
    const response = await axios.post(url, messageGroup, config);
    console.log("Message group added:", response.data);
    succesMsg("Message group added successfully");
    return response.data;
  } catch (error) {
    console.error("Error adding message group:", error);
    errMsg("Error adding message group");
  }
}