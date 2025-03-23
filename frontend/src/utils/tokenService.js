import { refreshFirebaseToken } from "../config/firebase-config";

// Constants
const TOKEN_REFRESH_INTERVAL = 45 * 60 * 1000; // 45 minutes
const LAST_REFRESH_KEY = "spherify_last_token_refresh";
const MEETING_STATUS_KEY = "spherify_meeting_active";

/**
 * Sets up the token refresh service
 * @param {Function} dispatch Redux dispatch function
 * @param {Function} updateTokenAction Redux action creator for updating token
 * @returns {Function} Cleanup function
 */
export function setupTokenRefresh(dispatch, updateTokenAction) {
  // Function to refresh the token
  const refreshToken = async () => {
    try {
      // Check if a meeting is in progress
      const isMeetingActive = localStorage.getItem(MEETING_STATUS_KEY) === "true";
      
      if (isMeetingActive) {
        console.log("Meeting in progress, delaying token refresh");
        // Schedule a check again in a short time
        setTimeout(checkAndRefreshToken, 5 * 60 * 1000); // Try again in 5 minutes
        return;
      }
      
      const token = await refreshFirebaseToken();
      if (token) {
        dispatch(updateTokenAction(token));
        // Store last refresh time
        localStorage.setItem(LAST_REFRESH_KEY, Date.now().toString());
        console.log("Firebase token refreshed successfully");
      }
    } catch (error) {
      console.error("Error refreshing Firebase token:", error);
    }
  };
  
  // Function to check if refresh is needed
  const checkAndRefreshToken = () => {
    const lastRefresh = localStorage.getItem(LAST_REFRESH_KEY);
    const now = Date.now();
    
    // Refresh if no record of last refresh or it was too long ago
    if (!lastRefresh || (now - parseInt(lastRefresh, 10)) > TOKEN_REFRESH_INTERVAL) {
      refreshToken();
    }
  };
  
  // Handle when page becomes visible again
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      checkAndRefreshToken();
    }
  };
  
  // Initial token refresh
  refreshToken();
  
  // Set up interval for periodic token refresh
  const intervalId = setInterval(checkAndRefreshToken, TOKEN_REFRESH_INTERVAL);
  
  // Add visibility change listener to refresh token when user returns
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Return cleanup function
  return () => {
    clearInterval(intervalId);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}

/**
 * Set meeting status to prevent token refresh during meetings
 * @param {boolean} isActive Whether a meeting is currently active
 */
export function setMeetingStatus(isActive) {
  localStorage.setItem(MEETING_STATUS_KEY, isActive.toString());
}
