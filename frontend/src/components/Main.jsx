import React, {useEffect} from "react";
import { Routes, Route, useLocation  } from "react-router-dom";
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
import {refreshFirebaseToken} from "../config/firebase-config";
import { errMsg } from "../utils/helper";
import { updateToken } from "../redux/authSlice";
import Dashboard from "./main/team/Dashboard";
function Main() {
  const location = useLocation();

  useEffect(() => {
    
  }, [location.pathname]); 

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
  return (
    <>
      <LeftPanel />
      <div className="main-container">
        <div className="content">
          <Routes>
            <Route index element={<Home />} />
            <Route path="settings" element={<Settings />} />
            <Route path=":teamId" element={<Team />}>
              <Route index element={<Dashboard />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="kanban" element={<Kanban />} />
              <Route path="gantt" element={<Gantt />} />
            </Route>
            <Route path=":teamId/*" element={<Team />} /> 
            <Route path=":teamId" element={<Team />} /> 
          </Routes>
        </div>
      </div>
      {location.pathname === "/main" || location.pathname === "/main/settings" ? (
        <RightMainPanel />
      ) : (
        <RightToolPanel />
      )}
    </>
  );
}

export default Main;
