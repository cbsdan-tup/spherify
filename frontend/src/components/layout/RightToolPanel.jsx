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

import TextChatTool from "../main/textchats/TextChatTool";
import ProjectManagementTool from "../main/projectmanagement/ProjectManagementTool";
import Conferencing from "../main/conferencing/Conferencing";
import LiveEditingTool from "../main/live-editing/LiveEditingTool";
import MessageGroup from "../main/textchats/MessageGroup";
function RightToolPanel({ showChats }) {
  const [isChatFormVisible, setIsChatFormVisible] = useState(false);
  const [groupChats, setGroupChats] = useState([]);
  const [currentGroupChat, setCurrentGroupChat] = useState(null); // Store the "General" chat separately

  const [isToolExpanded, setIsToolExpanded] = useState(false);

  const [refresh, setRefresh] = useState(false);

  const dispatch = useDispatch();

  const handleAddNewChatClick = () => {
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

  const currentTeamId = useSelector((state) => state.team.currentTeamId);
  const authState = useSelector((state) => state.auth);

  const handleConferenceClick = () => {
    dispatch(setCurrentMeetingRoomName(currentGroupChat?._id));
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
                <div className="add-chat chat" onClick={handleAddNewChatClick}>
                  <i className="fa-solid fa-plus"></i>
                  <span>Add Chat Group</span>
                </div>
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
