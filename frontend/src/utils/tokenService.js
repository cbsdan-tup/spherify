import { refreshFirebaseToken } from "../config/firebase-config";
import { isAuthenticated, getToken } from "./helper";

// Constants
const TOKEN_REFRESH_INTERVAL = 45 * 60 * 1000; // 45 minutes
const LAST_REFRESH_KEY = "spherify_last_token_refresh";
const REFRESH_LOCK_KEY = "spherify_token_refresh_lock";
const REFRESH_LOCK_TIMEOUT = 10000; // 10 seconds lock timeout

/**
 * Acquires a lock for token refresh to prevent multiple tabs from refreshing simultaneously
 * @returns {boolean} Whether the lock was acquired
 */
function acquireRefreshLock() {
  const now = Date.now();
  const currentLock = localStorage.getItem(REFRESH_LOCK_KEY);
  
  // If there's a lock and it's not expired, we can't acquire it
  if (currentLock && parseInt(currentLock, 10) > now) {
    return false;
  }
  
  // Set the lock with expiration time
  localStorage.setItem(REFRESH_LOCK_KEY, String(now + REFRESH_LOCK_TIMEOUT));
  return true;
}

/**
 * Releases the token refresh lock
 */
function releaseRefreshLock() {
  localStorage.removeItem(REFRESH_LOCK_KEY);
}

/**
 * Performs the token refresh operation
 * @param {Function} dispatch Redux dispatch function
 * @param {Function} updateTokenAction Redux action creator for updating token
 */
async function performTokenRefresh(dispatch, updateTokenAction) {
  if (!acquireRefreshLock()) {
    return; // Another tab is handling the refresh
  }
  
  try {
    console.log("Refreshing token...");
    const token = await refreshFirebaseToken();
    
    if (token) {
      dispatch(updateTokenAction(token));
      localStorage.setItem(LAST_REFRESH_KEY, String(Date.now()));
      console.log("Token refreshed successfully");
    }
  } catch (error) {
    console.error("Error refreshing token:", error);
  } finally {
    releaseRefreshLock();
  }
}

/**
 * Checks if token refresh is needed based on last refresh time
 * @param {Object} authState Current authentication state
 * @returns {boolean} Whether refresh is needed
 */
function isRefreshNeeded(authState) {
  if (!isAuthenticated(authState)) return false;
  
  const lastRefresh = localStorage.getItem(LAST_REFRESH_KEY);
  const now = Date.now();
  
  // If no record of last refresh, or it was too long ago
  if (!lastRefresh || (now - parseInt(lastRefresh, 10)) > TOKEN_REFRESH_INTERVAL) {
    return true;
  }
  
  return false;
}

/**
 * Sets up the token refresh service
 * @param {Function} dispatch Redux dispatch function
 * @param {Function} updateTokenAction Redux action creator for updating token
 * @returns {Function} Cleanup function
 */
export function setupTokenRefresh(dispatch, updateTokenAction) {
  // Function to check auth state from Redux store
  const checkAndRefresh = () => {
    // Get current auth state from storage to avoid dependency on React state
    const authStateStr = localStorage.getItem('auth_state');
    const authState = authStateStr ? JSON.parse(authStateStr) : null;
    
    if (isRefreshNeeded(authState)) {
      performTokenRefresh(dispatch, updateTokenAction);
    }
  };

  // Check for refresh need when tab becomes visible
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      checkAndRefresh();
    }
  };
  
  // Run initial check
  checkAndRefresh();
  
  // Set up interval for periodic checks
  const intervalId = setInterval(checkAndRefresh, 5 * 60 * 1000); // Check every 5 minutes
  
  // Listen for visibility changes
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Listen for storage events (to coordinate between tabs)
  const handleStorageChange = (e) => {
    if (e.key === LAST_REFRESH_KEY) {
      // Another tab refreshed the token, no need to refresh again
      console.log("Token was refreshed in another tab");
    }
  };
  window.addEventListener('storage', handleStorageChange);
  
  // Return cleanup function
  return () => {
    clearInterval(intervalId);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('storage', handleStorageChange);
  };
}
