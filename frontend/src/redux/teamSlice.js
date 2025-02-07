import { createSlice } from '@reduxjs/toolkit';

const teamSlice = createSlice({
  name: 'team',
  initialState: { currentTeamId: null, currentMessageGroupId: null }, 
  reducers: {
    setTeamId: (state, action) => {
      state.currentTeamId = action.payload;
    },
    clearTeamId: (state) => {
      state.currentTeamId = null; 
    },
    setMsgGroupId: (state, action) => {
      state.currentMessageGroupId = action.payload;
    },
    clearTeamId: (state) => {
      state.currentMessageGroupId = null; 
    }
  }
});

export const { setTeamId, clearTeamId } = teamSlice.actions;

export default teamSlice.reducer;
