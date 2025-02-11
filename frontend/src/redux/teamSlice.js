import { createSlice } from "@reduxjs/toolkit";

const teamSlice = createSlice({
  name: "team",
  initialState: {
    currentTeamId: null,
    currentMessageGroupId: null,
    currentMeetingId: null,
    currentMeetingRoomName: null,
  },
  reducers: {
    setTeamId: (state, action) => {
      state.currentTeamId = action.payload;
    },
    clearTeamId: (state) => {
      state.currentTeamId = null;
    },
    setMsgGroupId: (state, action) => {
      state.currentMessageGroupId = action.payload;
      state.currentMeetingId = null;
    },
    clearMsgGroupId: (state) => {
      state.currentMessageGroupId = null;
    },
    setCurrentMeetingId: (state, action) => {
      state.currentMeetingId = action.payload;
      state.currentMessageGroupId = null;
    },
    clearCurrentMeetingId: (state) => {
      state.currentMeetingId = null;
    },
    setCurrentMeetingRoomName: (state, action) => {
      state.currentMeetingRoomName = action.payload;
    },
    clearCurrentMeetingRoomName: (state) => {
      state.currentMeetingRoomName = null;
    },
  },
});

export const {
  setTeamId,
  clearTeamId,
  setMsgGroupId,
  clearMsgGroupId,
  setCurrentMeetingId,
  clearCurrentMeetingId,
  setCurrentMeetingRoomName,
  clearCurrentMeetingRoomName,
} = teamSlice.actions;

export default teamSlice.reducer;
