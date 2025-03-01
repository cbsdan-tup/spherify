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

function Main() {
  const [refresh, setRefresh] = useState(false);
  const location = useLocation();
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showChats, setShowChats] = useState(true);
  const [currentGroupChat, setCurrentGroupChat] = useState({});
  const [teamInfo, setTeamInfo] = useState({});

  const currentTeamId = useSelector((state) => state.team.currentTeamId);
  const currentMeetingRoomName = useSelector(
    (state) => state.team.currentMeetingRoomName
  );
  const authState = useSelector((state) => state.auth);
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();

  // Refresh Firebase token periodically
  useEffect(() => {
    const refreshToken = async () => {
      try {
        const token = await refreshFirebaseToken();
        if (token) {
          dispatch(updateToken(token));
        }
      } catch (error) {
        console.error("Error refreshing token:", error);
        errMsg("Error refreshing token", error);
      }
    };

    refreshToken();
  }, [refresh, dispatch]);

  // Fetch group chat info when meeting room changes
  useEffect(() => {
    if (currentMeetingRoomName) {
      console.log("Curent meeting room name", currentMeetingRoomName)
      fetchGroupChatInfo(currentMeetingRoomName);
    }
  }, [currentMeetingRoomName]);

  // Fetch team info when team ID changes
  useEffect(() => {
    if (currentTeamId) {
      console.log("Current team id", currentTeamId);
      fetchTeamInfo(currentTeamId);
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

  // Toggle right panel visibility
  const handleToggleShow = () => {
    setShowRightPanel(!showRightPanel);
  };

  // Toggle chats visibility
  const handleToggleChats = () => {
    setShowChats(!showChats);
  };

  return (
    <>
      <Header />
      <div className="main-container">
        <div
          className={`pages-container container ${!showRightPanel && "full"}`}
        >
          <Routes>
            <Route
              index
              element={<Home refresh={refresh} setRefresh={setRefresh} />}
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
                />
              }
            >
              <Route path="calendar" element={<Calendar />} />
              <Route
                path="kanban"
                element={<Kanban isFull={!showRightPanel} />}
              />
              <Route path="gantt" element={<Gantt />} />
              <Route path="live-editing/:documentId" element={<TextEditor />} />
              <Route path="message-group/:groupId" element={<MessageGroup />} />
              <Route
                path="file-sharing/:folderId"
                element={<FileSharingPage />}
              />
            </Route>
            <Route path=":teamId/*" element={<Team />} />
            <Route path=":teamId" element={<Team />} />
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
        (location.pathname === "/main" || location.pathname === "/main/settings" ? (
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
          chatName={`${teamInfo?.name || ""} - ${currentGroupChat?.name || "General"}`}
        />
      )}
    </>
  );
}

export default Main;