import React, { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#ff7300", "#0088FE"]; // Used (Orange) | Free (Blue)

const StorageChart = ({ chartData }) => {
  const [storageData, setStorageData] = useState(null);

  useEffect(() => {
    if (chartData) {
      setStorageData([
        { name: "Used", value: chartData.usedStorage },
        { name: "Free", value: chartData.freeStorage },
      ]);
    }
  }, [chartData]); // ✅ Added `chartData` as a dependency to update properly

  if (!storageData) return <p>Loading storage data...</p>;

  return (
    <div className="storage-chart">
      <h5>Cloud Storage Usage</h5>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={storageData}
            cx="50%"
            cy="50%"
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
          >
            {storageData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value, name) => [`${value.toFixed(2)} MB`, name]} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StorageChart;
