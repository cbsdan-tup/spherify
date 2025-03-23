import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { loginUser, logoutUser } from "../redux/authSlice";
import { io } from "socket.io-client";

// Create a single socket instance to be reused across the app
export const socket = io(`${import.meta.env.VITE_SOCKET_API}`, {
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});

// Add socket connection monitoring
socket.on('connect', () => {
  console.log('Socket connected:', socket.id);
});

socket.on('disconnect', () => {
  console.log('Socket disconnected');
});

socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error);
});

// User inactivity timeout in milliseconds (5 minutes)
const INACTIVITY_TIMEOUT = 5 * 60 * 1000;
let inactivityTimer;
let isPageVisible = true;

// Throttle status updates to prevent too many requests
const THROTTLE_INTERVAL = 3000; // 3 seconds
let lastStatusUpdate = {
  timestamp: 0,
  status: null
};

// Log user status changes in a consistent format
export const logUserStatusChange = (userId, userName, prevStatus, newStatus) => {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'green';
      case 'inactive': return 'orange';
      case 'offline': return 'gray';
      default: return 'black';
    }
  };
  
  // Also log to server if needed
  if (socket.connected) {
    socket.emit("logStatusChange", { userId, userName, prevStatus, newStatus, timestamp });
  }
};

// Enhanced function to update user status with logging
export const updateUserStatus = (userId, status) => {
  if (!userId || !socket.connected) return;
  
  const now = Date.now();
  
  // Only emit if status changed or if it's been more than the throttle interval
  if (
    status !== lastStatusUpdate.status || 
    now - lastStatusUpdate.timestamp > THROTTLE_INTERVAL
  ) {
    // Log the status update attempt
    console.log(`[STATUS UPDATE] Sending status update for ${userId}: ${status}`);
    
    socket.emit('updateStatus', { userId, status });
    
    lastStatusUpdate = {
      timestamp: now,
      status
    };
  }
};

// Setup user activity tracking with proper reference management
export const setupActivityTracking = (userId) => {
  if (!userId) return;

  // Store references to event handlers so we can remove them later
  const handleVisibility = () => {
    isPageVisible = document.visibilityState === 'visible';
    
    updateUserStatus(userId, 'active');
    // if (isPageVisible) {
    //   updateUserStatus(userId, 'active');
    //   resetInactivityTimer(userId);
    // } else {
    //   updateUserStatus(userId, 'inactive');
    // }
  };

  const handleActivity = () => {
    if (isPageVisible && userId) {
      updateUserStatus(userId, 'active');
      resetInactivityTimer(userId);
    }
  };

  // Save references globally so we can access them during cleanup
  window._spherifyEventHandlers = {
    visibility: handleVisibility,
    activity: handleActivity,
    userId
  };

  // Visibility change detection
  document.addEventListener('visibilitychange', handleVisibility);

  // Activity monitoring
  const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
  activityEvents.forEach(eventType => {
    document.addEventListener(eventType, handleActivity);
  });

  // Initial setup
  updateUserStatus(userId, 'active');
  resetInactivityTimer(userId);
};

// Enhanced cleanup with proper reference management
export const cleanupActivityTracking = () => {
  const handlers = window._spherifyEventHandlers;
  
  if (handlers) {
    document.removeEventListener('visibilitychange', handlers.visibility);
    
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    activityEvents.forEach(eventType => {
      document.removeEventListener(eventType, handlers.activity);
    });
    
    // Final status update when leaving
    if (handlers.userId) {
      updateUserStatus(handlers.userId, 'offline');
    }
    
    delete window._spherifyEventHandlers;
  }
  
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }
  
  console.log('Activity tracking cleaned up');
};

export const authenticate = (data, dispatch, next) => {
  dispatch(loginUser(data));
  
  // Setup activity tracking for the logged in user
  if (data?.user?.user?._id) {
    setupActivityTracking(data.user.user._id);
  }
  
  setTimeout(() => {
    next();
  }, 1000); 
};

export const isAuthenticated = (state) => {
  return state?.isAuthenticated;
};

export const getToken = (state) => {
  return state?.token;
};

export const getUser = (state) => {
  return state?.user;
};

// ✅ Logout function using Redux (No `sessionStorage`)
export const logout = (dispatch, next, currentUser = null) => {
  // Clean up activity tracking
  cleanupActivityTracking();
  
  // Get user ID directly from the parameter or from redux state if available
  const userId = currentUser?._id;
  
  if (userId) {
    // Emit logout event before clearing user data
    socket.emit('logout', userId);
  }
  
  dispatch(logoutUser());
  setTimeout(() => {
    next(); // Call callback function after logout if provided
  }, 1000); // 1 second delay
};

export const isAdmin = () => {
  if (typeof window !== "undefined") {
    const user = sessionStorage.getItem("user");
    if (user) {
      const userObj = JSON.parse(user);
      return userObj.role === "admin";
    }
  }
  return false;
};

export const errMsg = (message = "") =>
  toast.error(message, {
    position: "bottom-right",
  });

export const succesMsg = (message = "") =>
  toast.success(message, {
    position: "bottom-right",
  });

// Format bytes into human-readable file size
export const bytesToSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDate = (dateStr) => {
  const dateObj = new Date(dateStr);

  const options = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  };

  const formattedDate = dateObj.toLocaleString("en-US", options);
  const [datePart, timePart] = formattedDate.split(", ");
  return `${datePart.replace(/\//g, "-")} ${timePart}`;
};

export const handleAvatarChange = (event) => {
  return new Promise((resolve, reject) => {
    const file = event.target.files[0];

    if (!file) {
      reject("No file selected");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result); // Return the Base64 URL
    reader.onerror = (err) => reject(err);

    reader.readAsDataURL(file);
  });
};