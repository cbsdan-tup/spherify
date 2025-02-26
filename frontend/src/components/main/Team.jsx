import React, { useEffect, useState } from "react";
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

function Team({showRightPanel, setShowRightPanel, showChats, handleToggleChats}) {
  const { teamId } = useParams();
  const [teamInfo, setTeamInfo] = useState({});
  const [loading, setLoading] = useState(true);

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
  }, [teamId, currentFileId]);
  return (
    <>
      {teamInfo && teamInfo.name ? (
        <div className="team-container">
          <Header showRightPanel={showRightPanel} setShowRightPanel={setShowRightPanel} showChats={showChats} handleToggleChats={handleToggleChats} {...teamInfo} />
          <Outlet />
          <Routes>
            <Route index element={<Dashboard />} />
          </Routes>
        </div>
      ) : (
        <LoadingSpinner message={"Loading Team..."} />
      )}
    </>
  );
}

export default Team;
