import React, { useEffect, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import LeftPanel from "./layout/LeftPanel";
import RightMainPanel from "./layout/RightMainPanel";
import RightToolPanel from "./layout/RightToolPanel";
import Home from "./main/Home";
import Settings from "./main/Settings";
import Team from "./main/Team";
import Calendar from "./main/projectmanagement/Calendar";
import Kanban from "./main/projectmanagement/Kanban";
import Gantt from "./main/projectmanagement/Gantt";
import { useSelector, useDispatch } from "react-redux";
import { refreshFirebaseToken } from "../config/firebase-config";
import { errMsg } from "../utils/helper";
import { updateToken } from "../redux/authSlice";
import Dashboard from "./main/team/Dashboard";
import Header from "./Header";

import "../styles/MainHeader.css";
import JitsiMeeting from "./main/conferencing/JitsiMeeting";
import TextEditor from "./main/live-editing/TextEditor";
import MessageGroup from "./main/textchats/MessageGroup";
import FileSharingPage from "./main/file-sharing/FileSharingPage";

function Main() {
  const [refresh, setRefresh] = useState(false);
  const location = useLocation();
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showChats, setShowChats] = useState(true);

  useEffect(() => {}, [location.pathname]);

  const currentTeamId = useSelector((state) => state.team.currentTeamId);
  let dispatch = useDispatch();
  const authState = useSelector((state) => state.auth);
  const user = useSelector((state) => state.auth.user);
  useEffect(() => {
    const refreshToken = async () => {
      try {
        // console.log("Current token:", authState.token);
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
  }, []);

  const handleToggleShow = () => {
    console.log("Show right panel");
    setShowRightPanel(!showRightPanel);
  };

  const handleToggleChats = () => {
    setShowChats(!showChats);
    console.log("clicked");
  };

  const currentMeetingRoomName = useSelector(
    (state) => state.team.currentMeetingRoomName
  );

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
              <Route path="kanban" element={<Kanban isFull={!showRightPanel} />} />
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

      {currentMeetingRoomName && (
        <JitsiMeeting
          roomName={currentMeetingRoomName}
          displayName={user.firstName + " " + user.lastName}
        />
      )}
    </>
  );
}

export default Main;
