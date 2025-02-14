import React, {useEffect} from "react";
import { Routes, Route, useLocation  } from "react-router-dom";
import LeftPanel from "./layout/LeftPanel";
import RightMainPanel from "./layout/RightMainPanel";
import RightToolPanel from "./layout/RightToolPanel";
import Home from "./main/Home";
import Settings from "./main/Settings";
import Team from "./main/Team";
import Dashboard from "./main/team/Dashboard";
import MessageGroup from "./main/textchats/MessageGroup";
import Calendar from "./main/projectmanagement/Calendar";
import Kanban from "./main/projectmanagement/Kanban";
import Gantt from "./main/projectmanagement/Gantt";

function Main() {
  const location = useLocation();

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
              <Route path="message-group/:groupId" element={<MessageGroup />} />
            </Route>
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
