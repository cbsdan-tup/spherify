import React, { useEffect, useState } from "react";
import { Outlet, useParams } from "react-router-dom";
import axios from "axios";
import Header from "./team/Header";
import LoadingSpinner from "../layout/LoadingSpinner";
import { useSelector } from "react-redux";

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

  useEffect(() => {
    fetchTeamInfo();
  }, [teamId]);

  return (
    <>
      {teamInfo && teamInfo.name ? (
        <div className="team-container">
          <Header {...teamInfo} />
          <Outlet /> {/* This will render the child routes */}
        </div>
      ) : (
        <LoadingSpinner message={"Loading Team..."} />  
      )}
    </>
  );
}

export default Team;
