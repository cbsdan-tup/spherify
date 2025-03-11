import { createSlice } from "@reduxjs/toolkit";

const teamSlice = createSlice({
  name: "team",
  initialState: {
    currentTeamId: null,
    currentMessageGroupId: null,
    currentMeetingId: null,
    currentMeetingRoomName: null,
    currentFileId: null,
    currentProjectManagementTool: null,
  },
  reducers: {
    setTeamId: (state, action) => {
      state.currentTeamId = action.payload;
      state.currentFileId = null;
      state.currentProjectManagementTool = null;
      state.currentMessageGroupId = null;
    },
    clearTeamId: (state) => {
      state.currentTeamId = null;
    },
    setMsgGroupId: (state, action) => {
      state.currentMessageGroupId = action.payload;
      state.currentMeetingId = null;
      state.currentFileId = null;
      state.currentProjectManagementTool = null;
    },
    clearMsgGroupId: (state) => {
      state.currentMessageGroupId = null;
    },
    setCurrentMeetingId: (state, action) => {
      state.currentMeetingId = action.payload;
      state.currentMessageGroupId = null;
      state.currentFileId = null;
      state.currentProjectManagementTool = null;
    },
    clearCurrentMeetingId: (state) => {
      state.currentMeetingId = null;
    },
    setCurrentMeetingRoomName: (state, action) => {
      state.currentMeetingRoomName = action.payload;
      state.currentMessageGroupId = null;
      state.currentFileId = null;
      state.currentProjectManagementTool = null;
    },
    clearCurrentMeetingRoomName: (state) => {
      state.currentMeetingRoomName = null;
    },
    setCurrentFileId: (state, action) => {
      state.currentFileId = action.payload;
      state.currentMessageGroupId = null;
      state.currentMeetingId = null;
      state.currentProjectManagementTool = null;
    },
    clearCurrentFileId: (state) => {
      state.currentFileId = null;
    },
    setCurrentProjectManagementTool: (state, action) => {
      state.currentProjectManagementTool = action.payload;
      state.currentMessageGroupId = null;
      state.currentMeetingId = null;
      state.currentFileId = null;
    },
    clearCurrentProjectManagementTool: (state) => {
      state.currentProjectManagementTool = null;
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
  setCurrentFileId,
  clearCurrentFileId,
  setCurrentProjectManagementTool,
  clearCurrentProjectManagementTool,
} = teamSlice.actions;

export default teamSlice.reducer;
