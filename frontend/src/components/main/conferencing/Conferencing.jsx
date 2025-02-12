import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { errMsg, getToken } from "../../../utils/helper";
import axios from "axios";
import { Link } from "react-router-dom";
import { setCurrentMeetingId } from "../../../redux/teamSlice";
import CreateNewMeeting from "./CreateNewMeeting";

const Conferencing = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [meetings, setMeetings] = useState([]);

  const dispatch = useDispatch();

  const user = useSelector((state) => state.auth.user);
  const currentTeamId = useSelector((state) => state.team.currentTeamId);
  const authState = useSelector((state) => state.auth);
  const currentMeetingId = useSelector((state) => state.team.currentMeetingId);
  const currentMeetingRoomName = useSelector(
    (state) => state.team.currentMeetingRoomName
  );

  const handleToolClick = () => {
    setIsExpanded(!isExpanded);
  };

  const handleAddNewMeeting = () => {
    setIsFormVisible(true);
    console.log("Add new chat clicked");
  };

  const addMeeting = async (roomName, user, teamId) => {
    try {
      const newMeeting = { roomName, createdBy: user._id, teamId };
      const res = await axios.post(
        `${import.meta.env.VITE_API}/meetings/create`,
        newMeeting
      );

      setMeetings([...meetings, res.data]);
      successMsg("Meeting created successfully");
    } catch (error) {
      console.error("Error creating meeting:", error);
      errMsg("Error creating meeting", error);
    } finally {
      setIsFormVisible(false);
    }
  };

  const handleCloseForm = () => {
    setIsFormVisible(false);
  };

  const handleNewMeetingGroupId = (id) => {
    dispatch(setCurrentMeetingId(id));
  };
  const fetchMeetings = async () => {
    const token = getToken(authState);
    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    };
    axios
      .get(`${import.meta.env.VITE_API}/meetings/${currentTeamId}`, config)
      .then((res) => setMeetings(res.data))
      .catch((err) => errMsg("Error fetching meetings", err));
  };

  useEffect(() => {
    fetchMeetings();
  }, [currentTeamId, currentMeetingId, currentMeetingRoomName]);

  useEffect(() => {
    console.log("Meeting Id:", currentMeetingId);
    console.log("Meeting Room Name:", currentMeetingRoomName);
  }, [currentMeetingId, currentMeetingRoomName]);

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
          <span className="tool-title">Conferencing</span>
        </div>
        {isExpanded ? (
          <>
            <div className="tool-content">
              <div className="add" onClick={handleAddNewMeeting}>
                <i className="fa-solid fa-plus icon"></i>
                <span className="label">Add New Meeting</span>
              </div>
              {isFormVisible && (
                <CreateNewMeeting
                  show={isFormVisible}
                  onHide={handleCloseForm}
                  onCreateMeeting={addMeeting}
                />
              )}
              {meetings &&
                meetings.map((meeting) => (
                  <Link
                    className={
                      currentMeetingId === meeting._id
                        ? "meeting btn btn-primary"
                        : "meeting"
                    }
                    key={meeting._id}
                    to={`/main/${currentTeamId}/meeting/${meeting._id}`}
                    onClick={() => handleNewMeetingGroupId(meeting._id)}
                  >
                    <i className="fa-solid fa-phone icon"></i>
                    <span className="label">{meeting.roomName}</span>
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

export default Conferencing;
