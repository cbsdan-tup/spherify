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

function Main() {
  const location = useLocation();

  useEffect(() => {
    
  }, [location.pathname]); 

  return (
    <>
      <LeftPanel />
      <div className="main-container">
        <div className="content">
          <Routes>
            <Route index element={<Home />} /> 
            <Route path="settings" element={<Settings />} /> 
            <Route path="projectmanagement">
              <Route path="calendar" element={<Calendar />} />
              <Route path="kanban" element={<Kanban />} />
              <Route path="gantt" element={<Gantt />} />
            </Route>
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
