import React, { useEffect, useState, createContext } from "react";
import { Outlet, Routes, Route, useParams } from "react-router-dom";
import axios from "axios";
import Header from "./team/Header";
import LoadingSpinner from "../layout/LoadingSpinner";
import { useSelector } from "react-redux";
import VideoCallPage from "./conferencing/VideoCallPage";
import TextEditor from "./live-editing/TextEditor";
import Calendar from "./projectmanagement/Calendar";
import Dashboard from "./team/Dashboard";
import MessageGroup from "./textchats/MessageGroup";
import FileSharingPage from "./file-sharing/FileSharingPage";
import Kanban from './projectmanagement/Kanban';
import Gantt from './projectmanagement/Gantt';  

export const TeamConfigContext = createContext();

function Team({showRightPanel, setShowRightPanel, showChats, handleToggleChats, teamContext}) {
  const { teamId } = useParams();
  const [teamInfo, setTeamInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);

  const fetchTeamInfo = async () => {
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_API}/getTeamById/${teamId}`
      );
      console.log(data);
      setTeamInfo(data);
    } catch (error) {
      console.log(`Error fetching teams: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const currentUser = useSelector((state) => state.auth.user);
  const currentFileId = useSelector((state) => state.team.currentFileId);

  useEffect(() => {
    fetchTeamInfo();
  }, [teamId, currentFileId, refresh]);
  
  // Create a merged context value that includes both teamContext and the local teamInfo
  const mergedTeamContext = {
    ...teamContext,
    teamInfo: teamInfo || {}  // Ensure teamInfo is available directly in context
  };
  
  return (
    <>
    <div className="team-container">
      {teamInfo && teamInfo.name ? (
        <TeamConfigContext.Provider value={mergedTeamContext}>
          <Header setRefresh={setRefresh} showRightPanel={showRightPanel} setShowRightPanel={setShowRightPanel} showChats={showChats} handleToggleChats={handleToggleChats} {...teamInfo} />
          <Outlet />
        </TeamConfigContext.Provider>
      ) : (
        <LoadingSpinner message={"Loading Team..."} />
      )}
    </div>
    </>
  );
}

export default Team;
