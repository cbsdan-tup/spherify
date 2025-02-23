import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { getToken } from "../../../utils/helper";
import axios from "axios";
import AddMessageGroupForm from "./AddMessageGroupForm";
import { addMessageGroup } from "../../../functions/TeamFunctions";
import { Link } from "react-router-dom";
import {setMsgGroupId} from "../../../redux/teamSlice";

const TextChatTool = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [groupChats, setGroupChats] = useState([]);

  const dispatch = useDispatch();
  const handleToolClick = () => {
    setIsExpanded(!isExpanded);
  };

  const handleAddNewChatClick = () => {
    setIsFormVisible(true);
    console.log("Add new chat clicked");
  };

  const handleNewMsgGroupId = (id) => {
    dispatch(setMsgGroupId(id));
  } 
  const currentTeamId = useSelector((state) => state.team.currentTeamId);
  const authState = useSelector((state) => state.auth);
  const currentMessageGroupId = useSelector((state) => state.team.currentMessageGroupId);

  const handleCloseForm = () => {
    setIsFormVisible(false);
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
      console.log("Group chats:", response.data);
      setGroupChats(response.data);
    } catch (error) {
      console.error("Error fetching group chats:", error);
    }
  };

  useEffect(() => {
    if (currentTeamId !== null) {
      console.log("Crrent team id", currentTeamId);
      fetchGroupChats();
    }
  }, [currentTeamId]);

  useEffect(() => {
    console.log("Message group id:", currentMessageGroupId);
  }, [currentMessageGroupId]);
  return (
    <>
      <div className="tool-container custom-text-white">
        <div className="header" onClick={handleToolClick}>
          <i
            className={
              isExpanded
                ? "fa-solid arrow fa-arrow-down"
                : "fa-solid arrow fa-arrow-right "
            }
          ></i>
          <span className="tool-title">Text Chats</span>
        </div>
        {isExpanded ? (
          <>
            <div className="tool-content">
              <div className="add" onClick={handleAddNewChatClick}>
                <i className="fa-solid fa-plus icon"></i>
                <span className="label">Add New Chat</span>
              </div>
              {isFormVisible && (
                <AddMessageGroupForm
                  isOpen={isFormVisible}
                  onClose={handleCloseForm}
                  onSubmit={addMessageGroup}
                />
              )}
              {groupChats &&
                groupChats.map((chat) => (
                  <Link className={currentMessageGroupId === chat._id ? "chat btn btn-primary" : "chat"} key={chat._id} to={`/main/${currentTeamId}/message-group/${chat._id}`} onClick = {() => handleNewMsgGroupId(chat._id)}>
                    <i className="fa-solid fa-comments icon"></i>
                    <span className="label">{chat.name}</span>
                  </Link>
                ))}
            </div>
          </>
        ) : (
          <></>
        )}
      </div>
    </>
  );
};

export default TextChatTool;
