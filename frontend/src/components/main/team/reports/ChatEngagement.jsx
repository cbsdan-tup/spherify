import React, { useState, useEffect } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const ChatEngagement = ({ teamId }) => {
  const token = useSelector((state) => state.auth.token);
  const [loading, setLoading] = useState(true);
  const [chatData, setChatData] = useState(null);

  useEffect(() => {
    const fetchChatEngagement = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API}/getTeamChatEngagement/${teamId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setChatData(response.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching chat engagement:", err);
        setLoading(false);
      }
    };

    fetchChatEngagement();
  }, [teamId, token]);

  if (loading) {
    return <div className="text-center p-5">Loading chat engagement data...</div>;
  }

  // Prepare data for chart
  const chartData = {
    labels: chatData?.labels || [],
    datasets: [
      {
        label: "Messages",
        data: chatData?.messageCounts || [],
        backgroundColor: "rgba(75, 192, 192, 0.6)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "Daily Chat Activity",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Message Count",
        },
      },
    },
  };

  return (
    <div className="chat-engagement">
      <div className="row">
        <div className="col-md-8">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title">Message Activity (Last 7 Days)</h5>
              <div style={{ height: "300px" }}>
                <Bar data={chartData} options={chartOptions} />
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title">Chat Statistics</h5>
              <div className="stats-container pt-3">
                <div className="stat-item mb-4">
                  <div className="stat-label">Total Messages</div>
                  <div className="stat-value">{chatData?.totalMessages || 0}</div>
                </div>
                <div className="stat-item mb-4">
                  <div className="stat-label">Chat Groups</div>
                  <div className="stat-value">{chatData?.messageGroupCount || 0}</div>
                </div>
                <div className="stat-item mb-4">
                  <div className="stat-label">Avg. Messages/Day</div>
                  <div className="stat-value">
                    {chatData?.avgMessagesPerDay ? chatData.avgMessagesPerDay.toFixed(1) : 0}
                  </div>
                </div>
                {chatData?.mostActiveUser && (
                  <div className="stat-item mb-4">
                    <div className="stat-label">Most Active User</div>
                    <div className="most-active-user">
                      <div className="user-name">{chatData.mostActiveUser.name}</div>
                      <div className="message-count">
                        {chatData.mostActiveUser.messageCount} messages
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {(!chatData || chatData.totalMessages === 0) && (
        <div className="alert alert-info mt-4">
          <i className="fas fa-info-circle me-2"></i>
          No chat activity data available for this team.
        </div>
      )}
    </div>
  );
};

export default ChatEngagement;
