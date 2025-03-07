import { createSlice } from "@reduxjs/toolkit";
import { socket } from "../utils/helper";

// Store reference to be used in helper.js
let store;

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginUser: {
      reducer: (state, action) => {
        state.user = action.payload.user.user;
        state.token = action.payload.user.token;
        state.isAuthenticated = true;
      },
      prepare: (user, token) => {
        return {
          payload: {
            user: user || null,
            token: token || null,
          },
        };
      },
    },
    updateToken: (state, action) => {
      state.token = action.payload;
    },
    updateUser: (state, action) => {
      state.user = action.payload;
    },
    logoutUser: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    },
  },
});

export const { loginUser, updateToken, logoutUser, updateUser } = authSlice.actions;
export default authSlice.reducer;

// This is a store enhancer that saves auth state to localStorage 
// and handles user status
export const setupAuthStateStorage = (reduxStore) => {
  // Store the store reference for use elsewhere
  store = reduxStore;
  
  let currentAuthState = store.getState().auth;
  
  
  store.subscribe(() => {
    const previousAuthState = currentAuthState;
    currentAuthState = store.getState().auth;
    
    // If auth state changed, save to localStorage
    if (previousAuthState !== currentAuthState) {
      localStorage.setItem('auth_state', JSON.stringify(currentAuthState));
      
      // If user just logged in, ensure status is set to active
      if (!previousAuthState.isAuthenticated && currentAuthState.isAuthenticated) {
        if (currentAuthState?.user?._id) {
          socket.emit('login', currentAuthState.user._id);
        }
      }
    }
  });
};

// Export the store for use in helper.js
export { store };
