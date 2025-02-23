import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import { errMsg, succesMsg } from "../../utils/helper";
import LoadingSpinner from "./LoadingSpinner";
import moment from "moment";

const RightMainPanel = ({refresh, setRefresh}) => {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const token = useSelector((state) => state.auth.token);
  const user = useSelector((state) => state.auth.user);
  const fetchRequests = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API}/getTeamRequests/${user._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("Requests:", response.data?.pendingRequests);
      setRequests(response.data?.pendingRequests);
    } catch (error) {
      console.error("Error fetching requests:", error);
      errMsg("Error fetching requests", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateRequestStatus = async (requestId, status) => {
    try {
      const response = await axios.put(
        `${import.meta.env.VITE_API}/updateRequestStatus/${requestId}`,
        {
          status,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("Update Requests Response: ", response.data);
      succesMsg("Request status updated successfully");
    } catch (error) {
      console.error("Error updating requests status:", error);
      errMsg("Error updating requests status", error);
    } finally {
      setRefresh(!refresh);
    }
  };

  const handleRequest = (requestId, status) => {
    updateRequestStatus(requestId, status);
  };
  useEffect(() => {
    fetchRequests();
  }, [refresh]);
  return (
    <div className="right-main-panel">
      <h3>Requests</h3>
      <hr className="divider" />
      {isLoading ? (
        <LoadingSpinner message="Loading Team Requests"/>
      ) : requests.length > 0 ? (
        requests.map((request) => (
          <div className="request" key={request._id}>
            <div className="request-info">
              <div className="inviter-avatar">
                <img
                  src={request.inviter.avatar?.url || "images/account.png"}
                  alt="User Avatar"
                />
              </div>
              <div className="request-team">
                <div className="invite-info">
                  <strong>
                    {request.inviter.firstName} {request.inviter.lastName}
                  </strong>{" "}
                  is inviting you to team <strong>"{request.team.name}"</strong>
                </div>
                <div className="invited-at">
                  {moment(request?.invitedAt).fromNow()}
                </div>
              </div>
            </div>
            <div className="request-actions">
              <button className="accept" onClick={()=>handleRequest(request._id, "accepted")}>Accept</button>
              <button className="deny" onClick={()=>handleRequest(request._id, "denied")}>Deny</button>
            </div>
          </div>
        ))
      ) : (
        <div className="no-requests">No requests</div>
      )}
    </div>
  );
};

export default RightMainPanel;
