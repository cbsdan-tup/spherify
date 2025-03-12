import React, { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Label,
  LabelList,
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

  // Custom label renderer for pie slices
  const renderCustomizedLabel = (props) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, value, name } = props;
    
    // Calculate the position for the label
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
    
    // Format the value to display
    const formattedValue = formatStorageSize(value);
    
    // Only show label if the slice is big enough (more than 5%)
    if (percent < 0.05) return null;
    
    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="middle"
        fontSize={12}
        fontWeight="bold"
        style={{
          textShadow: '1px 1px 2px black',
          pointerEvents: 'none'
        }}
      >
        <tspan x={x} dy="-0.5em">{`${(percent * 100).toFixed(1)}%`}</tspan>
        <tspan x={x} dy="1.2em">{formattedValue}</tspan>
      </text>
    );
  };
  
  // Helper function to format storage size
  const formatStorageSize = (bytes) => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    } else if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    } else if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${bytes} Bytes`;
  };

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
            labelLine={false}
            label={renderCustomizedLabel}
          >
            {storageData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value, name) => [`${formatStorageSize(value)}`, name]} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StorageChart;
