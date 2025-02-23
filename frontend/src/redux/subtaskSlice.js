import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { getToken } from '../utils/helper';

// Helper function for auth header
const getAuthHeader = (getState) => ({
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken(getState().auth)}`
  }
});

// Fetch subtask
export const fetchSubtask = createAsyncThunk(
  'subtasks/fetchSubtask',
  async (subtaskId, { getState, rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API}/subtask/${subtaskId}`,
        getAuthHeader(getState)
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch subtask');
    }
  }
);

// Create subtask
export const createSubtask = createAsyncThunk(
  'subtasks/createSubtask',
  async (subtaskData, { getState, rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API}/subtask/create`,
        subtaskData,
        getAuthHeader(getState)
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create subtask');
    }
  }
);

// Update subtask
export const updateSubtask = createAsyncThunk(
  'subtasks/updateSubtask',
  async ({ subtaskId, subtaskData }, { getState, rejectWithValue }) => {
    try {
      const response = await axios.put(
        `${import.meta.env.VITE_API}/subtask/${subtaskId}`,
        subtaskData,
        getAuthHeader(getState)
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update subtask');
    }
  }
);

// Delete subtask
export const deleteSubtask = createAsyncThunk(
  'subtasks/deleteSubtask',
  async (subtaskId, { getState, rejectWithValue }) => {
    try {
      await axios.delete(
        `${import.meta.env.VITE_API}/subtask/${subtaskId}`,
        getAuthHeader(getState)
      );
      return subtaskId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete subtask');
    }
  }
);

const subtaskSlice = createSlice({
  name: 'subtasks',
  initialState: {
    subtasks: [],
    currentSubtask: null,
    loading: false,
    error: null
  },
  reducers: {
    setCurrentSubtask: (state, action) => {
      state.currentSubtask = action.payload;
    },
    clearCurrentSubtask: (state) => {
      state.currentSubtask = null;
    },
    reorderSubtasks: (state, action) => {
      state.subtasks = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch subtask
      .addCase(fetchSubtask.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSubtask.fulfilled, (state, action) => {
        state.loading = false;
        state.currentSubtask = action.payload;
      })
      .addCase(fetchSubtask.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create subtask
      .addCase(createSubtask.fulfilled, (state, action) => {
        state.subtasks.push(action.payload);
      })
      // Update subtask
      .addCase(updateSubtask.fulfilled, (state, action) => {
        const index = state.subtasks.findIndex(task => task._id === action.payload._id);
        if (index !== -1) {
          state.subtasks[index] = action.payload;
        }
        if (state.currentSubtask?._id === action.payload._id) {
          state.currentSubtask = action.payload;
        }
      })
      // Delete subtask
      .addCase(deleteSubtask.fulfilled, (state, action) => {
        state.subtasks = state.subtasks.filter(task => task._id !== action.payload);
        if (state.currentSubtask?._id === action.payload) {
          state.currentSubtask = null;
        }
      });
  }
});

export const { 
  setCurrentSubtask, 
  clearCurrentSubtask, 
  reorderSubtasks 
} = subtaskSlice.actions;

export default subtaskSlice.reducer;
