import React, { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import { errMsg } from "../../utils/helper";
import LoadingSpinner from "../layout/LoadingSpinner";
import PastUsersChart from "./Charts/PastUsersChart";
import PastTeamsChart from "./Charts/PastTeamsChart";
import StorageChart from "./Charts/StorageChart";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import RecentUsersAndTeams from "./Charts/RecentUsersAndTeams";

const Dashboard = () => {
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentTeams, setRecentTeams] = useState([]);
  const [pastUsersChartData, setPastUsersChartData] = useState([]);
  const [pastTeamsChartData, setPastTeamsChartData] = useState([]);
  const [fileSharingStorage, setFileSharingStorage] = useState({});
  const [userStats, setUserStats] = useState({});
  const [teamStats, setTeamStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const dashboardRef = useRef(null);

  const generatePDF = async () => {
    const dashboardElement = dashboardRef.current;
  
    if (!dashboardElement) return;
  
    const canvas = await html2canvas(dashboardElement);
    const imgData = canvas.toDataURL("image/png");
  
    const pdf = new jsPDF("p", "mm", "a4"); // A4 size PDF
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 25.4; // 1-inch margin
  
    const contentWidth = pageWidth - 2 * margin;
    const contentHeight = (canvas.height * contentWidth) / canvas.width;
  
    pdf.addImage(imgData, "PNG", margin, margin, contentWidth, contentHeight);
  
    // ✅ Add Watermark with TRUE Opacity Workaround
    pdf.setFont("helvetica"); // Bold font
    pdf.setFontSize(12); // Small font size
    pdf.setTextColor(215, 215, 215); // Light gray (not full black)
    
    const watermarkText = "spherify"; // Watermark text
    const angle = 45; // Diagonal angle
    const trueOpacity = 3; // The higher the number, the more faded it looks
  
    let alternateOffset = 0;
    for (let y = 10; y < pageHeight; y += 30) {
      for (let x = -10 + alternateOffset; x < pageWidth; x += 50) {
        for (let i = 0; i < trueOpacity; i++) { // ✅ Workaround: Draw text multiple times for soft opacity
          pdf.text(watermarkText, x, y, { angle: angle });
        }
      }
      alternateOffset = alternateOffset === 0 ? 20 : 0; // Shift every other row
    }
  
    pdf.save("Dashboard_Report.pdf");
  };
  
  

  const token = useSelector((state) => state.auth.token);

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [
          recentUsersRes,
          storageRes,
          teamsChartRes,
          usersChartRes,
          userStatsRes,
          teamStatsRes,
        ] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API}/getRecentTeamAndUsers`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${import.meta.env.VITE_API}/getStorageInfo`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${import.meta.env.VITE_API}/getPastTeamsChartData`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${import.meta.env.VITE_API}/getPastUsersChartData`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${import.meta.env.VITE_API}/getUserStatistics`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${import.meta.env.VITE_API}/getTeamStatistics`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        console.log("Past users chart data:", usersChartRes.data);

        setRecentUsers(recentUsersRes.data?.recentUsers);
        setRecentTeams(recentUsersRes.data?.recentTeams);
        setFileSharingStorage(storageRes.data?.storageInfo);
        setPastTeamsChartData(teamsChartRes.data);
        setPastUsersChartData(usersChartRes.data);
        setUserStats(userStatsRes.data);
        setTeamStats(teamStatsRes.data);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        errMsg("Error fetching dashboard data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token]);

  return (
    <div className="dashboard">
      <div className="content" ref={dashboardRef}>
        <div className="row-content header">
          <h1>Data Analytics and Dashboard</h1>
          <hr />
          <button className="pdf-download" onClick={generatePDF}>
            <i className="fa-solid fa-file"></i>
            <span>PDF REPORT</span>
          </button>
        </div>
        {isLoading ? (
          <LoadingSpinner message="Loading Dashboard..." />
        ) : (
          <>
            <div className="row-content cards">
              <div className="card users">
                <div className="left">
                  <div className="label">Users</div>
                  <div className="value">{userStats?.totalUsers || 0}</div>
                </div>
                <div className="right">
                  <div className="key-value">
                    <div className="value">
                      {userStats?.totalActiveUsers || 0}
                    </div>
                    <div className="label">Active</div>
                  </div>
                  <div className="key-value">
                    <div className="value">
                      {userStats?.totalDisabledUsers || 0}
                    </div>
                    <div className="label">Disabled</div>
                  </div>
                </div>
              </div>
              <div className="card teams">
                <div className="left">
                  <div className="label">Teams</div>
                  <div className="value">{teamStats?.totalTeams || 0}</div>
                </div>
                <div className="right">
                  <div className="key-value">
                    <div className="value">
                      {teamStats?.totalActiveTeams || 0}
                    </div>
                    <div className="label">Active</div>
                  </div>
                  <div className="key-value">
                    <div className="value">
                      {teamStats?.totalDisabledTeams || 0}
                    </div>
                    <div className="label">Disabled</div>
                  </div>
                </div>
              </div>
              <div className="card cloud">
                <div className="left">
                  <div className="label">Cloud Usage</div>
                  <div className="value">
                    {fileSharingStorage
                      ? (fileSharingStorage.freeStorage / 1024).toFixed(2)
                      : 0}{" "}
                    GB /{" "}
                    {fileSharingStorage
                      ? (fileSharingStorage.totalStorage / 1024).toFixed(2)
                      : 0}{" "}
                    GB
                  </div>{" "}
                </div>
              </div>
            </div>
            <div className="row-content user-storage-charts">
              <PastUsersChart chartData={pastUsersChartData} />
              <StorageChart chartData={fileSharingStorage} />
            </div>
            <div className="row-content">
              <PastTeamsChart chartData={pastTeamsChartData} />
            </div>
            <div className="row-content recent-users-teams">
              <RecentUsersAndTeams recentUsers={recentUsers} recentTeams={recentTeams} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
