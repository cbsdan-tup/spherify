import { createSlice } from "@reduxjs/toolkit";

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
