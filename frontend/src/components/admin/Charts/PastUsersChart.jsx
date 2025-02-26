import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const PastUsersChart = ({ chartData }) => {
  const [chartType, setChartType] = useState("daily"); // Default to daily chart

  if (!chartData) return <div>Data is not available...</div>;

  return (
    <div className="past-users-chart">
      <h5>
        {chartType.charAt(0).toUpperCase() + chartType.slice(1)} New Users
      </h5>

      {/* Toggle Buttons */}
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

      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={
            chartType === "daily"
              ? chartData.dailyUsers
              : chartType === "weekly"
              ? chartData.weeklyUsers
              : chartData.monthlyUsers
          }
        >
          <XAxis dataKey="_id" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar
            dataKey="count"
            fill={
              chartType === "daily"
                ? "#8884d8"
                : chartType === "weekly"
                ? "#82ca9d"
                : "#ffc658"
            }
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PastUsersChart;
