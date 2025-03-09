import React, { useState, useEffect } from "react";
import { Modal, Button } from "react-bootstrap";
import { Pie } from "react-chartjs-2";
import { useSelector } from "react-redux";
import axios from "axios";
import moment from "moment";
import { errMsg } from "../../../utils/helper";

const TeamRequestHistory = ({ show, onHide, teamId }) => {
  const [loading, setLoading] = useState(true);
  const [requestHistory, setRequestHistory] = useState(null);
  const authState = useSelector((state) => state.auth);

  useEffect(() => {
    const fetchRequestHistory = async () => {
      try {
        if (!show || !teamId) return;
        
        setLoading(true);
        
        const token = authState.token;
        const config = {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        };
        
        // Fetch team request history
        const requestResponse = await axios.get(
          `${import.meta.env.VITE_API}/getTeamRequestHistory/${teamId}`,
          config
        );
        
        // Process the request history data
        if (requestResponse.data) {
          const requests = requestResponse.data.requestHistory || [];
          const accepted = requests.filter(req => req.status === 'accepted').length;
          const pending = requests.filter(req => req.status === 'pending').length;
          const declined = requests.filter(req => req.status === 'denied').length;
          
          setRequestHistory({
            accepted,
            pending,
            declined,
            acceptanceRate: requests.length > 0 ? (accepted / requests.length * 100).toFixed(1) : 0,
            requests: requests.map(request => ({
              id: request._id,
              inviterName: request.inviter?.firstName && request.inviter?.lastName ? 
                `${request.inviter.firstName} ${request.inviter.lastName}` : 'Unknown',
              inviteeName: request.invitee?.firstName && request.invitee?.lastName ? 
                `${request.invitee.firstName} ${request.invitee.lastName}` : 'Unknown',
              status: request.status,
              invitedDate: moment(request.invitedAt).format("MMM DD, YYYY"),
              responseTime: request.respondedAt ? 
                moment.duration(moment(request.respondedAt).diff(moment(request.invitedAt))).humanize() : 
                null
            })).sort((a, b) => {
              // Sort by newest invitations first
              return moment(b.invitedDate).diff(moment(a.invitedDate));
            })
          });
        } else {
          // Fallback if no data is returned
          setRequestHistory({
            accepted: 0,
            pending: 0,
            declined: 0,
            acceptanceRate: 0,
            requests: []
          });
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Error fetching request history:", err);
        errMsg("Error loading request history: " + (err.response?.data?.message || err.message));
        setLoading(false);
        
        // Fallback if error
        setRequestHistory({
          accepted: 0,
          pending: 0,
          declined: 0,
          acceptanceRate: 0,
          requests: []
        });
      }
    };
    
    fetchRequestHistory();
  }, [teamId, show, authState.token]);
  
  // Prepare request history chart data
  const requestChartData = {
    labels: ['Accepted', 'Pending', 'Declined'],
    datasets: [
      {
        data: [
          requestHistory?.accepted || 0,
          requestHistory?.pending || 0,
          requestHistory?.declined || 0
        ],
        backgroundColor: [
          'rgba(46, 204, 113, 0.8)', // Green for accepted
          'rgba(241, 196, 15, 0.8)', // Yellow for pending
          'rgba(231, 76, 60, 0.8)'   // Red for declined
        ],
        borderColor: [
          'rgba(46, 204, 113, 1)',
          'rgba(241, 196, 15, 1)',
          'rgba(231, 76, 60, 1)'
        ],
        borderWidth: 1
      }
    ]
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      centered
      className="team-request-history-modal"
    >
      <Modal.Header closeButton>
        <Modal.Title>Team Request History</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2">Loading request history...</p>
          </div>
        ) : (
          <div className="row">
            <div className="col-md-4 mb-4 mb-md-0" >
              <div className="card shadow-sm">
                <div className="card-body">
                  <h5 className="card-title">Request Status</h5>
                  <div className="d-flex justify-content-center" style={{ height: '250px' }}>
                    <Pie 
                      data={requestChartData}
                      options={{
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom'
                          },
                          tooltip: {
                            callbacks: {
                              label: (context) => {
                                const total = (requestHistory?.accepted || 0) + 
                                              (requestHistory?.pending || 0) + 
                                              (requestHistory?.declined || 0);
                                const percentage = total > 0 ? ((context.raw / total) * 100).toFixed(1) : 0;
                                return `${context.label}: ${context.raw} (${percentage}%)`;
                              }
                            }
                          }
                        }
                      }}
                    />
                  </div>
                  
                  {requestHistory && requestHistory.acceptanceRate !== undefined && (
                    <div className="text-center mt-3">
                      <h6 className="mb-1">Acceptance Rate</h6>
                      <div className="display-6">{requestHistory.acceptanceRate}%</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="col-md-8 p-0">
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <h5 className="card-title">Recent Team Requests</h5>
                  {requestHistory?.requests?.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead>
                          <tr>
                            <th>Invitee</th>
                            <th>Invited By</th>
                            <th>Status</th>
                            <th>Date Invited</th>
                          </tr>
                        </thead>
                        <tbody>
                          {requestHistory?.requests?.map((request) => (
                            <tr key={request.id}>
                              <td>{request.inviteeName}</td>
                              <td>{request.inviterName}</td>
                              <td>
                                <span className={`badge ${
                                  request.status === "accepted" ? "bg-success" : 
                                  request.status === "pending" ? "bg-warning" : "bg-danger"
                                }`}>
                                  {request.status}
                                </span>
                              </td>
                              <td>{request.invitedDate}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-muted mb-0">No request history available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default TeamRequestHistory;
