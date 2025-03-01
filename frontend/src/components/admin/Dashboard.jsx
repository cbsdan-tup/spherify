import React, { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import { errMsg } from "../../utils/helper";
import LoadingSpinner from "../layout/LoadingSpinner";
import PastUsersChart from "./Charts/PastUsersChart";
import PastTeamsChart from "./Charts/PastTeamsChart";
import StorageChart from "./Charts/StorageChart";

import { toPng } from "html-to-image";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import RecentUsersAndTeams from "./Charts/RecentUsersAndTeams";
import html2canvas from "html2canvas";

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

  pdfMake.vfs = pdfFonts?.pdfMake?.vfs || pdfFonts.vfs; // ✅ Ensure vfs is properly assigned

  const generatePDF = async () => {
    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    let content = [];

    // 🎨 Styling Configuration
    const styles = {
      header: {
        fontSize: 24,
        bold: true,
        alignment: "center",
        color: "#2c3e50",
      },
      subheader: {
        fontSize: 14,
        alignment: "center",
        color: "#7f8c8d",
        margin: [0, 5, 0, 10],
      },
      sectionHeader: {
        fontSize: 18,
        bold: true,
        color: "#2980b9",
        margin: [0, 15, 0, 10],
      },
      paragraph: { fontSize: 12, margin: [0, 10, 0, 10], lineHeight: 1.6, textIndent: 20 },
      warning: { fontSize: 12, color: "#e67e22", bold: true, lineHeight: 1.6 },
      error: { fontSize: 12, color: "#e74c3c", bold: true, lineHeight: 1.6 },
      keyMetric: { fontSize: 12, bold: true, color: "#27ae60", lineHeight: 1.6  },
      positiveTrend: { fontSize: 12, color: "#27ae60", bold: true, lineHeight: 1.6  }, // Green for positive trends
      negativeTrend: { fontSize: 12, color: "#e74c3c", bold: true, lineHeight: 1.6  }, // Red for negative trends
    };

    const addWatermark = (docDefinition) => {
      docDefinition.watermark = {
        text: "spherify",
        opacity: 0.15,
        bold: true,
        italics: false,
        angle: -45,
        color: "#bdc3c7",
      };
    };

    const captureChart = async (chartId) => {
      const chartElement = document.getElementById(chartId);
      if (!chartElement) return null;
      try {
        const canvas = await html2canvas(chartElement, {
          useCORS: true,
          backgroundColor: "#ffffff",
          scale: 2,
        });
        return canvas.toDataURL("image/png");
      } catch (error) {
        console.error(`Error capturing chart ${chartId}:`, error);
        return null;
      }
    };

    const addChartWithAnalysis = async (chartId, analysisText) => {
      const chartImage = await captureChart(chartId);
      return [
        { text: analysisText, style: "paragraph" },
        chartImage
          ? {
              image: chartImage,
              width: 400,
              alignment: "center",
              margin: [0, 10, 0, 10],
            }
          : {
              text: "Chart unavailable - data visualization missing",
              style: "warning",
            },
      ];
    };

    // 📄 PDF Header Section
    content.push(
      { text: "Spherify Analytics Report", style: "header" },
      { text: `Report Generated: ${today}`, style: "subheader" },
      {
        canvas: [{ type: "line", x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1 }],
      },
    );

    // 📊 User Growth Analysis
    content.push({ text: "User Growth Analysis", style: "sectionHeader" });
    let teamGrowthTrend, userGrowthTrend = null
    if (userStats && pastUsersChartData) {
      const last7DaysUsers = pastUsersChartData.dailyUsers
        ?.slice(-7)
        .reduce((a, b) => a + b.count, 0);
      const previous7DaysUsers = pastUsersChartData.dailyUsers
        ?.slice(-14, -7)
        .reduce((a, b) => a + b.count, 0);

      userGrowthTrend =
        last7DaysUsers && previous7DaysUsers
          ? ((last7DaysUsers - previous7DaysUsers) / previous7DaysUsers) * 100
          : null;

      content.push({
        text: [
          "The platform currently has ",
          { text: `${userStats.totalUsers}`, style: "keyMetric" },
          " registered users, of which ",
          { text: `${userStats.totalActiveUsers}`, style: "keyMetric" },
          ` (${(
            (userStats.totalActiveUsers / userStats.totalUsers) *
            100
          ).toFixed(2)}%) are actively engaging with the system. `,
          "Over the past 7 days, ",
          { text: `${last7DaysUsers || 0}`, style: "keyMetric" },
          " new users have registered. ",
          userGrowthTrend !== null
            ? [
                "This represents a ",
                {
                  text: `${userGrowthTrend.toFixed(2)}%`,
                  style:
                    userGrowthTrend >= 0 ? "positiveTrend" : "negativeTrend",
                },
                " change compared to the previous 7 days, indicating a ",
                {
                  text:
                    userGrowthTrend >= 0
                      ? "positive growth trend"
                      : "decline in growth",
                  style:
                    userGrowthTrend >= 0 ? "positiveTrend" : "negativeTrend",
                },
                ".",
              ]
            : "There is an insufficient data to determine growth trend.",
        ],
        style: "paragraph",
      });
      content.push(...(await addChartWithAnalysis("pastUsersChart")));
    } else {
      content.push({
        text: "Analyzing User Growth Data...",
        style: "paragraph",
      });
    }

    // 📊 Team Engagement Analysis
    content.push({ text: "Team Engagement Analysis", style: "sectionHeader" });

    if (teamStats && pastTeamsChartData) {
      const last7DaysTeams = pastTeamsChartData.dailyTeams
        ?.slice(-7)
        .reduce((a, b) => a + b.count, 0);
      const previous7DaysTeams = pastTeamsChartData.dailyTeams
        ?.slice(-14, -7)
        .reduce((a, b) => a + b.count, 0);

      teamGrowthTrend =
        last7DaysTeams && previous7DaysTeams
          ? ((last7DaysTeams - previous7DaysTeams) / previous7DaysTeams) * 100
          : null;

      console.log("Team growth trend:", teamGrowthTrend); // Debugging

      let teamAnalysisText;

      if (teamGrowthTrend !== null && !isNaN(teamGrowthTrend)) {
        teamAnalysisText = [
          "This represents a ",
          {
            text: `${teamGrowthTrend.toFixed(2)}%`,
            style: teamGrowthTrend >= 0 ? "positiveTrend" : "negativeTrend",
          },
          " change compared to the previous 7 days, indicating a ",
          {
            text:
              teamGrowthTrend >= 0
                ? "positive growth trend"
                : "decline in growth",
            style: teamGrowthTrend >= 0 ? "positiveTrend" : "negativeTrend",
          },
          ".",
        ];
      } else {
        teamAnalysisText =
          "There is an insufficient data to determine growth trend.";
      }

      content.push({
        text: [
          "The platform hosts ",
          { text: `${teamStats.totalTeams}`, style: "keyMetric" },
          " teams, with ",
          { text: `${teamStats.totalActiveTeams}`, style: "keyMetric" },
          ` (${(
            (teamStats.totalActiveTeams / teamStats.totalTeams) *
            100
          ).toFixed(2)}%) actively collaborating. `,
          "In the last week, ",
          { text: `${last7DaysTeams || 0}`, style: "keyMetric" },
          " new teams were created. ",
         
        ],
        style: "paragraph",
      });
      content.push({ text: teamAnalysisText, style: "paragraph" });

      content.push(...(await addChartWithAnalysis("pastTeamsChart")));
    } else {
      content.push({
        text: "Analyzing Team Engagement Data...",
        style: "paragraph",
      });
    }

    // 📊 Storage Utilization Analysis
    content.push({
      text: "Storage Utilization Analysis",
      style: "sectionHeader",
    });

    if (fileSharingStorage) {
      const storageUtilizationTrend =
        fileSharingStorage.usedStorage / fileSharingStorage.totalStorage;

      content.push({
        text: [
          "The total storage capacity is ",
          {
            text: `${(fileSharingStorage.totalStorage / 1024).toFixed(1)} GB`,
            style: "keyMetric",
          },
          ", with ",
          {
            text: `${(fileSharingStorage.usedStorage / 1024).toFixed(1)} GB`,
            style: "keyMetric",
          },
          ` (${(
            (fileSharingStorage.usedStorage / fileSharingStorage.totalStorage) *
            100
          ).toFixed(1)}%) currently in use. `,
          "The available storage is ",
          {
            text: `${(fileSharingStorage.freeStorage / 1024).toFixed(1)} GB`,
            style: "keyMetric",
          },
          ". ",
          {
            text:
              storageUtilizationTrend > 0.8
                ? "Storage utilization is high, indicating a potential need for expansion."
                : "Storage utilization is within acceptable limits.",
            style:
              storageUtilizationTrend > 0.8 ? "negativeTrend" : "positiveTrend",
          },
        ],
        style: "paragraph",
      });
      content.push(...(await addChartWithAnalysis("storageChart")));
    } else {
      content.push({
        text: "Analyzing Storage Utilization Data...",
        style: "paragraph",
      });
    }

    // 📌 Conclusion
    content.push({ text: "Conclusion", style: "sectionHeader" });

    // User Growth Analysis
    let userGrowthConclusion;
    if (userGrowthTrend !== null && !isNaN(userGrowthTrend)) {
      userGrowthConclusion = `User growth is ${
        userGrowthTrend >= 0 ? "positive" : "declining"
      } (${userGrowthTrend.toFixed(2)}% change compared to the previous 7 days).`;
    } else {
      userGrowthConclusion = "Insufficient data to determine user growth trends.";
    }
    
    // Team Engagement Analysis
    let teamEngagementConclusion;
    if (teamGrowthTrend !== null && !isNaN(teamGrowthTrend)) {
      teamEngagementConclusion = `Team engagement is ${
        teamGrowthTrend >= 0 ? "positive" : "declining"
      } (${teamGrowthTrend.toFixed(2)}% change compared to the previous 7 days).`;
    } else {
      teamEngagementConclusion = "Insufficient data to determine team engagement trends.";
    }
    
    // Cloud Usage Analysis
    let cloudUsageConclusion;
    if (fileSharingStorage) {
      const storageUtilizationTrend =
        fileSharingStorage.usedStorage / fileSharingStorage.totalStorage;
      cloudUsageConclusion = `Cloud storage utilization is ${
        storageUtilizationTrend > 0.8 ? "high" : "within acceptable limits"
      } (${((storageUtilizationTrend) * 100).toFixed(2)}% used).`;
    } else {
      cloudUsageConclusion = "Insufficient data to determine cloud storage utilization.";
    }
    
    // Build the Conclusion Text
    content.push({
      text: [
        "The platform demonstrates ",
        { text: "consistent growth", style: "keyMetric" },
        " in user engagement and team formation, with ",
        { text: "stable storage utilization", style: "keyMetric" },
        ". Here are the key insights:\n\n",
        { text: "User Growth: ", style: "keyMetric" },
        userGrowthConclusion,
        "\n",
        { text: "Team Engagement: ", style: "keyMetric" },
        teamEngagementConclusion,
        "\n",
        { text: "Cloud Usage: ", style: "keyMetric" },
        cloudUsageConclusion,
        "\n\n",
        { text: "Key Recommendations: ", style: "keyMetric" },
        "Enhance user retention strategies, optimize storage management, and continue supporting team-based workflows to sustain growth and user satisfaction.",
      ],
      style: "paragraph",
    });

    // 📄 PDF Document Definition
    const docDefinition = {
      content: content,
      styles: styles,
      defaultStyle: {
        font: "Roboto",
      },
      pageSize: "A4",
      pageMargins: [40, 60, 40, 60],
    };

    addWatermark(docDefinition);
    pdfMake
      .createPdf(docDefinition)
      .download(`Spherify_Report_${Date.now()}.pdf`);
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
              <div id="pastUsersChart">
                {" "}
                {/* Add id here */}
                <PastUsersChart chartData={pastUsersChartData} />
              </div>
              <div id="storageChart">
                {" "}
                {/* Add id here */}
                <StorageChart chartData={fileSharingStorage} />
              </div>
            </div>
            <div className="row-content">
              <div id="pastTeamsChart">
                {" "}
                {/* Add id here */}
                <PastTeamsChart chartData={pastTeamsChartData} />
              </div>
            </div>
            <div className="row-content recent-users-teams">
              <div id="recentUsersTeams">
                {" "}
                {/* Add id here */}
                <RecentUsersAndTeams
                  recentUsers={recentUsers}
                  recentTeams={recentTeams}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
