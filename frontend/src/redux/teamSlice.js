import { createSlice } from '@reduxjs/toolkit';

const teamSlice = createSlice({
  name: 'team',
  initialState: { currentTeamId: null }, 
  reducers: {
    setTeamId: (state, action) => {
      state.currentTeamId = action.payload;
    },
    clearTeamId: (state) => {
      state.currentTeamId = null; 
    }
  }
});

export const { setTeamId, clearTeamId } = teamSlice.actions;

export default teamSlice.reducer;
