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
function Main() {
  const [refresh, setRefresh] = useState(false);
  const location = useLocation();
  const [showRightPanel, setShowRightPanel] = useState(true);

  useEffect(() => {}, [location.pathname]);

  const currentTeamId = useSelector((state) => state.team.currentTeamId);
  let dispatch = useDispatch();
  const authState = useSelector((state) => state.auth);
  useEffect(() => {
    const refreshToken = async () => {
      try {
        console.log("Current token:", authState.token);
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

  return (
    <>
      <Header />
      <div className="main-container">
        <div className={`pages-container container ${!showRightPanel && "full"}`}>
          <Routes>
            <Route
              index
              element={<Home refresh={refresh} setRefresh={setRefresh} />}
            />
            <Route path="settings" element={<Settings />} />
            <Route path=":teamId" element={<Team showRightPanel={showRightPanel} setShowRightPanel={setShowRightPanel}/>}>
              <Route path="calendar" element={<Calendar />} />
              <Route path="kanban" element={<Kanban />} />
              <Route path="gantt" element={<Gantt />} />
            </Route>
            <Route path=":teamId/*" element={<Team />} />
            <Route path=":teamId" element={<Team />} />
          </Routes>
        </div>
      </div>
      <div className={`toggle-show ${showRightPanel && "leftmargin"}`} onClick={handleToggleShow}>
        {
          showRightPanel ? (
            <i className="fa-solid fa-eye-slash"></i>
          ) : (
            <i className="fa-solid fa-eye"></i>
          )
        }
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
          <RightToolPanel />
        ))}
    </>
  );
}

export default Main;
