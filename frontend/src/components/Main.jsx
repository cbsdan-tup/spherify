import React, {useEffect} from "react";
import { Routes, Route, useLocation  } from "react-router-dom";
import LeftPanel from "./layout/LeftPanel";
import RightMainPanel from "./layout/RightMainPanel";
import RightToolPanel from "./layout/RightToolPanel";
import Home from "./main/Home";
import Settings from "./main/Settings";
import Team from "./main/Team";

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
            <Route path=":teamId" element={<Team />} /> 

          </Routes>
        </div>
      </div>
      {location.pathname == "/main" || location.pathname == "/main/settings" ? (
        <RightMainPanel />
      ) : (
        <RightToolPanel />
      )}
    </>
  );
}

export default Main;
