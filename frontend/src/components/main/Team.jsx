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

function Team() {
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
          <Header {...teamInfo} />
          <Outlet />
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="/message-group/:groupId" element={<MessageGroup />} />
            <Route path="/meeting/:meetId" element={<VideoCallPage />} />
            <Route path="/live-editing/:documentId" element={<TextEditor />} />
            <Route path="/file-sharing/:folderId" element={<FileSharingPage />} />
          </Routes>
        </div>
      ) : (
        <LoadingSpinner message={"Loading Team..."} />
      )}
    </>
  );
}

export default Team;
