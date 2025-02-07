import React, { useEffect, useState } from "react";
import { Route, Routes, useParams } from "react-router-dom";
import axios from "axios";
import Header from "./team/Header";
import LoadingSpinner from "../layout/LoadingSpinner";
import Dashboard from "./team/Dashboard";
import MessageGroup from "./textchats/MessageGroup";

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

  useEffect(() => {
    fetchTeamInfo();
  }, [teamId]);
  return (
    <>
      {teamInfo && teamInfo.name ? (
        <div className="team-container">
          <Header {...teamInfo} />
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="/message-group/:groupId" element={<MessageGroup />} />
          </Routes>
        </div>
      ) : (
        <LoadingSpinner message={"Loading Team..."} />
      )}
    </>
  );
}

export default Team;
