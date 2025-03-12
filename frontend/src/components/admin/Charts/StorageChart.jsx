import React, { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Label,
} from "recharts";

const COLORS = ["#ff7300", "#0088FE"]; // Used (Orange) | Free (Blue)

const StorageChart = ({ chartData }) => {
  const [storageData, setStorageData] = useState(null);
  const [totalStorage, setTotalStorage] = useState({ used: 0, free: 0, total: 0 });

  useEffect(() => {
    if (chartData) {
      const used = chartData.usedStorage;
      const free = chartData.freeStorage;
      const total = used + free;
      
      setStorageData([
        { name: "Used", value: used },
        { name: "Free", value: free },
      ]);
      
      setTotalStorage({ used, free, total });
    }
  }, [chartData]);

  // Helper function to format storage size consistently
  const formatStorageSize = (bytes) => {
    const MB = 1024 * 1024;
    const GB = MB * 1024;

    if (bytes >= GB) {
      return `${(bytes / GB).toFixed(1)} GB`;
    } else if (bytes >= MB) {
      return `${(bytes / MB).toFixed(1)} MB`;
    } else if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${bytes} Bytes`;
  };

  // Custom label renderer for pie slices - simplify and make it more visible
  const renderCustomizedLabel = (props) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, value, name, index } = props;
    
    if (value === 0) return null;
    
    // Use a more extreme position to ensure visibility
    const radius = outerRadius * 1.1; // Position labels outside the pie
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
    
    // Format the value to display
    const formattedValue = formatStorageSize(value * 1024 * 1024);
    
    return (
      <text 
        x={x} 
        y={y} 
        fill={COLORS[index % COLORS.length]} // Use the same color as the pie slice
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${name}: ${formattedValue} (${(percent * 100).toFixed(1)}%)`}
      </text>
    );
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
            outerRadius={90} // Make pie smaller to leave room for external labels
            innerRadius={40} // Add inner radius to make it a donut chart for better center label visibility
            fill="#8884d8"
            dataKey="value"
            labelLine={true} // Enable label lines
            label={renderCustomizedLabel}
          >
            {storageData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
            
            {/* Add center label if there's storage data */}
            {totalStorage.total > 0 && (
              <Label
                content={({ viewBox }) => {
                  const { cx, cy } = viewBox;
                  const usedPercentage = (totalStorage.used / totalStorage.total * 100).toFixed(1);
                  return (
                    <text
                      x={cx}
                      y={cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{
                        fontWeight: 'bold',
                        fontSize: '16px',
                        fill: '#333',
                      }}
                    >
                      <tspan x={cx} dy="-0.5em" fontSize="18px">{usedPercentage}%</tspan>
                      <tspan x={cx} dy="1.5em" fontSize="12px">Used</tspan>
                    </text>
                  );
                }}
                position="center"
              />
            )}
          </Pie>
          <Tooltip formatter={(value) => [formatStorageSize(value * 1024 * 1024), 'Storage']} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Storage totals summary */}
      <div className="storage-summary" style={{ 
        textAlign: 'center', 
        marginTop: '10px',
        padding: '10px',
        borderRadius: '5px',
        fontWeight: 'medium'
      }}>
        <p style={{ margin: '0' }}>
          <span style={{ fontWeight: 'bold', color: COLORS[0] }}>Used: </span>
          <span>{formatStorageSize(totalStorage.used * 1024 * 1024)}</span>
          <span style={{ margin: '0 10px' }}>|</span>
          <span style={{ fontWeight: 'bold', color: COLORS[1] }}>Free: </span>
          <span>{formatStorageSize(totalStorage.free * 1024 * 1024)}</span>
          <span style={{ margin: '0 10px' }}>|</span>
          <span style={{ fontWeight: 'bold' }}>Total: </span>
          <span>{formatStorageSize(totalStorage.total * 1024 * 1024)}</span>
        </p>
      </div>
    </div>
  );
};

export default StorageChart;
