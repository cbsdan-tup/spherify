import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Text,
} from "recharts";

const PastUsersChart = ({ chartData }) => {
  const [chartType, setChartType] = useState("daily"); // Default to daily chart
  const [totalUsers, setTotalUsers] = useState(0);

  // Calculate total users when chartType or chartData changes
  useEffect(() => {
    if (!chartData) return;
    
    let data;
    if (chartType === "daily") {
      data = chartData.dailyUsers;
    } else if (chartType === "weekly") {
      data = chartData.weeklyUsers;
    } else {
      data = chartData.monthlyUsers;
    }
    
    // Calculate the sum of all user counts
    const total = data.reduce((sum, item) => sum + item.count, 0);
    setTotalUsers(total);
  }, [chartType, chartData]);

  // Custom label for the summary at the center of the chart
  const CustomChartLabel = ({ viewBox, chartType, total }) => {
    const { width, height, x, y } = viewBox;
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    
    return (
      <g>
        <Text
          x={centerX}
          y={centerY - 10}
          textAnchor="middle"
          verticalAnchor="middle"
          style={{ fontSize: '20px', fontWeight: 'bold', fill: '#555' }}
        >
          {total}
        </Text>
        <Text
          x={centerX}
          y={centerY + 15}
          textAnchor="middle"
          verticalAnchor="middle"
          style={{ fontSize: '12px', fill: '#777' }}
        >
          Total New Users
        </Text>
      </g>
    );
  };

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
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
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
          {/* Add the custom label in the center of the chart */}
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
            style={{
              fontSize: '22px',
              fontWeight: 'bold',
              fill: '#555',
            }}
          >
            {totalUsers}
          </text>
          <text
            x="50%"
            y="58%"
            textAnchor="middle"
            dominantBaseline="middle"
            style={{
              fontSize: '14px',
              fill: '#777',
            }}
          >
            Total Users
          </text>
        </BarChart>
      </ResponsiveContainer>

      {/* Add summary at the bottom similar to StorageChart */}
      <div className="users-summary" style={{ 
        textAlign: 'center', 
        marginTop: '10px',
        padding: '10px',
        borderRadius: '5px',
        fontWeight: 'medium'
      }}>
        <p style={{ margin: '0' }}>
          <span style={{ fontWeight: 'bold' }}>Total {chartType} New Users: </span>
          <span>{totalUsers}</span>
        </p>
      </div>
    </div>
  );
};

export default PastUsersChart;
