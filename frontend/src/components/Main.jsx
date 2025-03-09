import React, { useEffect, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import { refreshFirebaseToken } from "../config/firebase-config";
import { errMsg } from "../utils/helper";
import { updateToken } from "../redux/authSlice";
import Header from "./Header";
import RightMainPanel from "./layout/RightMainPanel";
import RightToolPanel from "./layout/RightToolPanel";
import Home from "./main/Home";
import Settings from "./main/Settings";
import Team from "./main/Team";
import Calendar from "./main/projectmanagement/Calendar";
import Kanban from "./main/projectmanagement/Kanban";
import Gantt from "./main/projectmanagement/Gantt";
import JitsiMeeting from "./main/conferencing/JitsiMeeting";
import TextEditor from "./main/live-editing/TextEditor";
import MessageGroup from "./main/textchats/MessageGroup";
import FileSharingPage from "./main/file-sharing/FileSharingPage";
import "../styles/MainHeader.css";
import { io } from "socket.io-client";
import Dashboard from "./main/team/Dashboard";
import TeamReport from "./main/team/reports/TeamReport";
const socket = io(`${import.meta.env.VITE_SOCKET_API}`);

function Main() {
  const [refresh, setRefresh] = useState(false);
  const location = useLocation();
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showChats, setShowChats] = useState(true);
  const [currentGroupChat, setCurrentGroupChat] = useState({});
  const [teamInfo, setTeamInfo] = useState({});
  const [teams, setTeams] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [teamConfiguration, setTeamConfiguration] = useState(null); // Add new state for team configuration
  const [fetchingConfiguration, setFetchingConfiguration] = useState(false); // Track loading state

  const currentTeamId = useSelector((state) => state.team.currentTeamId);
  const currentMeetingRoomName = useSelector(
    (state) => state.team.currentMeetingRoomName
  );
  const authState = useSelector((state) => state.auth);
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();

  useEffect(() => {
    if (user) {
      socket.emit("login", user?._id);
    }
  }, [user]);

  // Fetch group chat info when meeting room changes
  useEffect(() => {
    if (currentMeetingRoomName) {
      console.log("Curent meeting room name", currentMeetingRoomName);
      fetchGroupChatInfo(currentMeetingRoomName);
    }
  }, [currentMeetingRoomName]);

  // Fetch team info when team ID changes
  useEffect(() => {
    if (currentTeamId) {
      console.log("Current team id", currentTeamId);
      fetchTeamInfo(currentTeamId);
      fetchTeamConfiguration(currentTeamId); // Add call to fetch configuration
    }
  }, [currentTeamId]);

  // Fetch group chat info
  const fetchGroupChatInfo = async (groupChatId) => {
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_API}/message-group/${groupChatId}`,
        { headers: { Authorization: `Bearer ${authState?.token}` } }
      );
      console.log("Group chat info:", data);
      setCurrentGroupChat(data);
    } catch (error) {
      console.error("Error fetching group chat info:", error);
    }
  };

  // Fetch team info
  const fetchTeamInfo = async (teamId) => {
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_API}/getTeamById/${teamId}`,
        { headers: { Authorization: `Bearer ${authState?.token}` } }
      );
      setTeamInfo(data);
    } catch (error) {
      console.error("Error fetching team info:", error);
    }
  };

  // New function to fetch team configuration
  const fetchTeamConfiguration = async (teamId) => {
    if (!teamId || !authState?.token) return;

    try {
      setFetchingConfiguration(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API}/getTeamConfiguration/${teamId}`,
        { headers: { Authorization: `Bearer ${authState?.token}` } }
      );

      if (response.data.success) {
        console.log("Team configuration loaded:", response.data.configuration);
        setTeamConfiguration(response.data.configuration);
      }
    } catch (error) {
      console.error("Error fetching team configuration:", error);
    } finally {
      setFetchingConfiguration(false);
    }
  };

  // Toggle right panel visibility
  const handleToggleShow = () => {
    setShowRightPanel(!showRightPanel);
  };

  // Toggle chats visibility
  const handleToggleChats = () => {
    setShowChats(!showChats);
  };

  // Create a context value that includes team configuration
  const teamContextValue = {
    teamInfo,
    teamConfiguration,
    fetchingConfiguration,
    refreshTeamConfiguration: () => fetchTeamConfiguration(currentTeamId),
  };

  return (
    <>
      <Header
        teams={teams}
        setTeams={setTeams}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
      />
      <div className="main-container">
        <div
          className={`pages-container container ${!showRightPanel && "full"}`}
        >
          <Routes>
            <Route
              index
              element={
                <Home
                  refresh={refresh}
                  setRefresh={setRefresh}
                  teams={teams}
                  setTeams={setTeams}
                  isLoading={isLoading}
                  setIsLoading={setIsLoading}
                />
              }
            />
            <Route path="settings" element={<Settings />} />
            <Route
              path=":teamId"
              element={
                <Team
                  showRightPanel={showRightPanel}
                  setShowRightPanel={setShowRightPanel}
                  showChats={showChats}
                  handleToggleChats={handleToggleChats}
                  teamContext={teamContextValue} // Pass the team context with configuration
                />
              }
            >
              <Route
                index
                element={<Dashboard teamConfiguration={teamConfiguration} />}
              />
              <Route
                path="calendar"
                element={<Calendar teamConfiguration={teamConfiguration} />}
              />
              <Route
                path="kanban"
                element={
                  <Kanban
                    isFull={!showRightPanel}
                    teamConfiguration={teamConfiguration}
                  />
                }
              />
              <Route
                path="gantt"
                element={<Gantt teamConfiguration={teamConfiguration} />}
              />
              <Route
                path="live-editing/:documentId"
                element={<TextEditor teamConfiguration={teamConfiguration} />}
              />
              <Route
                path="message-group/:groupId"
                element={<MessageGroup teamConfiguration={teamConfiguration} />}
              />
              <Route
                path="file-sharing/:folderId"
                element={
                  <FileSharingPage teamConfiguration={teamConfiguration} />
                }
              />
              <Route path="reports" element={<TeamReport />} />
            </Route>
          </Routes>
        </div>
      </div>

      {/* Toggle button for right panel */}
      <div
        className={`toggle-show ${showRightPanel && "leftmargin"}`}
        onClick={handleToggleShow}
      >
        {showRightPanel ? (
          <i className="fa-solid fa-arrow-right"></i>
        ) : (
          <i className="fa-solid fa-arrow-left"></i>
        )}
      </div>

      {/* Render right panel based on route */}
      {showRightPanel &&
        (location.pathname === "/main" ||
        location.pathname === "/main/settings" ? (
          <RightMainPanel
            refresh={refresh}
            setRefresh={setRefresh}
            show={showRightPanel}
          />
        ) : (
          <RightToolPanel showChats={showChats} />
        ))}

      {/* Render JitsiMeeting if a meeting room is active */}
      {currentMeetingRoomName && (
        <JitsiMeeting
          roomName={currentMeetingRoomName}
          displayName={`${user.firstName} ${user.lastName}`}
          chatName={`${teamInfo?.name || ""} - ${
            currentGroupChat?.name || "General"
          }`}
        />
      )}
    </>
  );
}

export default Main;
