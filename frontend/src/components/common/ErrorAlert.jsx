import React, { useState } from 'react';
import { FiX, FiAlertCircle } from 'react-icons/fi';

const ErrorAlert = ({ message }) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible || !message) return null;

  return (
    <div className="p-4">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start">
            <FiAlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{message}</p>
            </div>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="ml-4 text-red-500 hover:text-red-600"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorAlert;
