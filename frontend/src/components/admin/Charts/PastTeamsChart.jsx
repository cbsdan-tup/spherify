import React, { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const PastTeamsChart = ({ chartData }) => {
  const [chartType, setChartType] = useState("daily"); // Default to daily chart

  if (!chartData) return <div>Data is not available...</div>;

  return (
    <div className="past-teams-chart">
      <h5>Team Creation Trends</h5>

      {/* Dropdown for selecting chart type */}
      <div style={{ marginBottom: "10px" }}>
        <select
          id="chartType"
          value={chartType}
          onChange={(e) => setChartType(e.target.value)}
          style={{
            marginLeft: "auto",
            display: "block",
            padding: "0.3rem 1rem",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            backgroundColor: "#fcfce0",
            fontWeight: "bold",
            color: "#1d559e",
          }}
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>
      {/* Display only the selected chart */}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={
            chartType === "daily"
              ? chartData.dailyTeams
              : chartType === "weekly"
              ? chartData.weeklyTeams
              : chartData.monthlyTeams
          }
        >
          <XAxis dataKey="_id" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="count"
            stroke={
              chartType === "daily"
                ? "#8884d8"
                : chartType === "weekly"
                ? "#82ca9d"
                : "#ffc658"
            }
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PastTeamsChart;
