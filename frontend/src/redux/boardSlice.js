import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { getToken } from '../utils/helper';

// Helper function to get auth header
const getAuthHeader = (getState) => ({
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken(getState().auth)}`
  }
});

// Fetch user's boards
export const fetchUserBoards = createAsyncThunk(
  'boards/fetchUserBoards',
  async (_, { getState, rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API}/boards/getBoards`,
        getAuthHeader(getState)
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch user boards');
    }
  }
);

// Fetch team boards
export const fetchTeamBoards = createAsyncThunk(
  'boards/fetchTeamBoards',
  async (teamId, { getState, rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API}/boards/getBoardsByTeam/${teamId}`,
        getAuthHeader(getState)
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch team boards');
    }
  }
);

// Get board details with lists, cards, and subtasks
export const fetchBoardDetails = createAsyncThunk(
  'boards/fetchBoardDetails',
  async (boardId, { getState, rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API}/boards/getBoard/${boardId}`,
        getAuthHeader(getState)
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch board details');
    }
  }
);

// Create new board
export const createBoard = createAsyncThunk(
  'boards/createBoard',
  async (boardData, { getState, rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API}/boards/createBoard`,
        boardData,
        getAuthHeader(getState)
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create board');
    }
  }
);

// Update board
export const updateBoard = createAsyncThunk(
  'boards/updateBoard',
  async ({ boardId, updateData }, { getState, rejectWithValue }) => {
    try {
      const response = await axios.put(
        `${import.meta.env.VITE_API}/boards/updateBoard/${boardId}`,
        updateData,
        getAuthHeader(getState)
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update board');
    }
  }
);

// Delete board
export const deleteBoard = createAsyncThunk(
  'boards/deleteBoard',
  async (boardId, { getState, rejectWithValue }) => {
    try {
      await axios.delete(
        `${import.meta.env.VITE_API}/boards/deleteBoard/${boardId}`,
        getAuthHeader(getState)
      );
      return boardId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete board');
    }
  }
);

const boardSlice = createSlice({
  name: 'boards',
  initialState: {
    userBoards: [],
    teamBoards: [],
    currentBoard: null,
    loading: false,
    error: null
  },
  reducers: {
    setCurrentBoard: (state, action) => {
      state.currentBoard = action.payload;
    },
    clearCurrentBoard: (state) => {
      state.currentBoard = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch user boards
      .addCase(fetchUserBoards.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserBoards.fulfilled, (state, action) => {
        state.loading = false;
        state.userBoards = action.payload;
      })
      .addCase(fetchUserBoards.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch team boards
      .addCase(fetchTeamBoards.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTeamBoards.fulfilled, (state, action) => {
        state.loading = false;
        state.teamBoards = action.payload;
      })
      .addCase(fetchTeamBoards.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch board details
      .addCase(fetchBoardDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBoardDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.currentBoard = action.payload;
      })
      .addCase(fetchBoardDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create board
      .addCase(createBoard.fulfilled, (state, action) => {
        state.teamBoards.push(action.payload);
      })
      // Update board
      .addCase(updateBoard.fulfilled, (state, action) => {
        const index = state.teamBoards.findIndex(board => board._id === action.payload._id);
        if (index !== -1) {
          state.teamBoards[index] = action.payload;
        }
        if (state.currentBoard?._id === action.payload._id) {
          state.currentBoard = action.payload;
        }
      })
      // Delete board
      .addCase(deleteBoard.fulfilled, (state, action) => {
        state.teamBoards = state.teamBoards.filter(board => board._id !== action.payload);
        if (state.currentBoard?._id === action.payload) {
          state.currentBoard = null;
        }
      });
  }
});

export const { setCurrentBoard, clearCurrentBoard } = boardSlice.actions;

export default boardSlice.reducer;
