import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { getToken } from "../../utils/helper";
import axios from "axios";
import AddMessageGroupForm from "../main/textchats/AddMessageGroupForm";
import { addMessageGroup } from "../../functions/TeamFunctions";
import { Link } from "react-router-dom";
import {
  setMsgGroupId,
  setCurrentMeetingRoomName,
} from "../../redux/teamSlice";
import { io } from "socket.io-client"; // Add this import

import TextChatTool from "../main/textchats/TextChatTool";
import ProjectManagementTool from "../main/projectmanagement/ProjectManagementTool";
import Conferencing from "../main/conferencing/Conferencing";
import LiveEditingTool from "../main/live-editing/LiveEditingTool";
import MessageGroup from "../main/textchats/MessageGroup";

function RightToolPanel({ showChats }) {
  const [isChatFormVisible, setIsChatFormVisible] = useState(false);
  const [groupChats, setGroupChats] = useState([]);
  const [currentGroupChat, setCurrentGroupChat] = useState(null);
  const [isToolExpanded, setIsToolExpanded] = useState(false);
  const [refresh, setRefresh] = useState(false);
  
  // Add states for team configuration and permission
  const [teamConfiguration, setTeamConfiguration] = useState(null);
  const [hasGroupMessagePermission, setHasGroupMessagePermission] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  const dispatch = useDispatch();
  const currentTeamId = useSelector((state) => state.team.currentTeamId);
  const authState = useSelector((state) => state.auth);
  const user = useSelector((state) => state.auth.user);

  // Add a socket ref
  const [socket, setSocket] = useState(null);
  
  // Initialize socket connection
  useEffect(() => {
    if (authState.isAuthenticated && authState.token) {
      const newSocket = io(import.meta.env.VITE_SOCKET_API);
      setSocket(newSocket);
      
      return () => {
        if (newSocket) newSocket.disconnect();
      };
    }
  }, [authState.isAuthenticated, authState.token]);

  // Fetch team configuration directly
  useEffect(() => {
    const fetchTeamConfiguration = async () => {
      if (!currentTeamId || !user) return;
      
      try {
        // Get team configuration
        const configResponse = await axios.get(
          `${import.meta.env.VITE_API}/getTeamConfiguration/${currentTeamId}`,
          { headers: { Authorization: `Bearer ${authState.token}` } }
        );
        
        // Get team details
        const teamResponse = await axios.get(
          `${import.meta.env.VITE_API}/getTeamById/${currentTeamId}`,
          { headers: { Authorization: `Bearer ${authState.token}` } }
        );
        
        if (configResponse.data.success && teamResponse.data) {
          setTeamConfiguration(configResponse.data.configuration);
          
          // Find current user in team members
          const currentMember = teamResponse.data.members.find(
            member => member.user && member.user._id === user._id && member.leaveAt === null
          );
          
          if (currentMember) {
            setUserInfo(currentMember);
            
            // Check permissions: leader, admin, or role in AllowedRoleToCreateGroupMessage
            const hasPermission = 
              currentMember.role === "leader" || 
              currentMember.isAdmin ||
              (configResponse.data.configuration?.AllowedRoleToCreateGroupMessage || []).includes(currentMember.role);
            
            setHasGroupMessagePermission(hasPermission);
          }
        }
      } catch (error) {
        console.error("Error fetching team configuration:", error);
      }
    };
    
    fetchTeamConfiguration();
  }, [currentTeamId, user, authState.token]);

  const handleAddNewChatClick = () => {
    // Check if user has permission before showing form
    if (!hasGroupMessagePermission) {
      // Show a message that user doesn't have permission
      alert("You don't have permission to create new chat groups");
      return;
    }
    
    setIsChatFormVisible(true);
    console.log("Add new chat clicked");
  };

  const handleCloseForm = () => {
    setIsChatFormVisible(false);
  };

  const handleNewMsgGroupId = (id) => {
    dispatch(setMsgGroupId(id));
  };

  const fetchGroupChats = async () => {
    try {
      const token = getToken(authState);
      const config = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      };
      const url = `${
        import.meta.env.VITE_API
      }/getMessageGroups/${currentTeamId}`;
      const response = await axios.get(url, config);

      setGroupChats(response.data);
    } catch (error) {
      console.error("Error fetching group chats:", error);
    }
  };

  const handleConferenceClick = () => {
    if (!currentGroupChat || !currentGroupChat._id) {
      console.error("No active group chat selected");
      return;
    }
    
    // Set the meeting room name in Redux
    dispatch(setCurrentMeetingRoomName(currentGroupChat._id));
    
    // Notify group members about the conference
    if (socket && currentGroupChat) {
      socket.emit("startConference", {
        groupId: currentGroupChat._id,
        teamId: currentTeamId,
        initiator: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar?.url || user.avatar
        }
      });
      console.log(`Initiated conference in ${currentGroupChat.name} and sent notifications`);
    }
  };

  useEffect(() => {
    fetchGroupChats();
  }, [refresh]);

  useEffect(() => {
    if (!currentGroupChat) {
      console.log("Group Chat: ", currentGroupChat);
      const generalChatId = groupChats.find(
        (chat) => chat.isGeneral && chat.name === "General"
      );
      setCurrentGroupChat(generalChatId || null);
    }
  }, [groupChats]);

  return (
    <div className="right-tool-panel">
      {!showChats ? (
        <>
          <div className="header">
            <h3>Tools</h3>
          </div>
          <Link to={`/main/${currentTeamId}`} className="header">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.8rem",
              }}
            >
              <i className="fa-solid arrow fa-arrow-right"></i>
              <span className="tool-title">Dashboard</span>
            </div>
          </Link>
          <ProjectManagementTool />
          <LiveEditingTool />
        </>
      ) : (
        <>
          <div className="header chat">
            <div className="chat-info" onClick={()=>setIsToolExpanded(!isToolExpanded)}>
              <i className="fa-solid fa-comments"></i>
              <span className="name"> {currentGroupChat?.name || "General"}</span>
              <i className="fa-solid fa-caret-down"></i>
            </div>
            <div className="conferencing" onClick={handleConferenceClick}>
              <i className="fa-solid fa-video"></i>
            </div>
            {isToolExpanded && (
              <div className="chat-list">
                {/* Only show add chat button if user has permission */}
                {hasGroupMessagePermission && (
                  <div className="add-chat chat" onClick={handleAddNewChatClick}>
                    <i className="fa-solid fa-plus"></i>
                    <span>Add Chat Group</span>
                  </div>
                )}
                {groupChats.length > 0 && groupChats.map((chat) => (
                  <div
                    className="group-chat chat"
                    onClick={() => setCurrentGroupChat(chat)}
                    key={chat._id}
                  >
                    <i className="fa-solid fa-comments"></i>
                    <span className="name">{chat.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <MessageGroup groupId={currentGroupChat?._id} />
          {isChatFormVisible && (
            <AddMessageGroupForm
              isOpen={isChatFormVisible}
              onClose={handleCloseForm}
              onSubmit={addMessageGroup}
              setRefresh={setRefresh}
            />
          )}
        </>
      )}
    </div>
  );
}

export default RightToolPanel;
