import React, { useState, useEffect } from "react";

const ActiveStatus = () => {
  const [isOnline, setIsOnline] = useState(false);
  const [timeOnline, setTimeOnline] = useState(0);

  useEffect(() => {
    let timer;
    if (isOnline) {
      timer = setInterval(() => {
        setTimeOnline((prevTime) => prevTime + 1);
      }, 1000);
    } else {
      clearInterval(timer);
    }
    return () => clearInterval(timer);
  }, [isOnline]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="active-status">
      <div className="toggle-container">
        <span className={`status-text ${!isOnline ? "offline-text" : ""}`}>
          OFFLINE
        </span>
        <div
          className={`toggle-switch ${isOnline ? "active" : ""}`}
          onClick={() => setIsOnline(!isOnline)}
        >
          <div className="switch-circle"></div>
        </div>
        <span className={`status-text ${isOnline ? "online-text" : ""}`}>
          ONLINE
        </span>

      </div>
      {isOnline ? (
        <div className="online-time">
          YOU HAVE BEEN ONLINE FOR <b>{formatTime(timeOnline)}</b>
        </div>
      ) : (
        <div className="offline-time">YOU ARE OFFLINE</div>
      )}
    </div>
  );
};

export default ActiveStatus;