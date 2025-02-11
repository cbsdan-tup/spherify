import React, { useState, useEffect } from "react";
import JitsiMeeting from "./JitsiMeeting";
import CreateNewMeeting from "./CreateNewMeeting";
import axios from "axios";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";

const VideoCallPage = () => {
  const { meetId } = useParams();
  
  const teamId = useSelector((state) => state.team?.currentTeamId);
  const user = useSelector((state) => state.auth.user);
  const displayName = `${user.firstName} ${user.lastName}`;

  return (
    <div className="container mt-5 p-0 pt-1">
        <JitsiMeeting
          roomName={meetId}
          displayName={displayName}
        />
      
    </div>
  );
};

export default VideoCallPage;
