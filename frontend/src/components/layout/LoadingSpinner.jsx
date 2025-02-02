import React from 'react';
import ClipLoader from 'react-spinners/ClipLoader';

const LoadingSpinner = ({ message }) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        fontSize: "20px",
        fontWeight: "600",
        height: 'calc(100vh - 70px)',
      }}
    >
      <ClipLoader color="#00BFFF" size={80} />
      <span className="mt-3 text-warning fs-1">{message}</span>
    </div>
  );
};

export default LoadingSpinner;
