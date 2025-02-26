import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { getToken } from '../utils/helper';

const getAuthHeader = (getState) => ({
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken(getState().auth)}`
  }
});

export const fetchLists = createAsyncThunk(
  'lists/fetchLists',
  async (teamId, { getState, rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API}/getLists/${teamId}`,
        getAuthHeader(getState)
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch lists');
    }
  }
);

export const createList = createAsyncThunk(
  'lists/createList',
  async ({ teamId, title }, { getState, rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API}/createList`,
        { teamId, title },
        getAuthHeader(getState)
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create list');
    }
  }
);

export const updateList = createAsyncThunk(
  'lists/updateList',
  async ({ listId, updateData }, { getState, rejectWithValue }) => {
    try {
      const response = await axios.put(
        `${import.meta.env.VITE_API}/updateList/${listId}`,
        updateData,
        getAuthHeader(getState)
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update list');
    }
  }
);

export const deleteList = createAsyncThunk(
  'lists/deleteList',
  async (listId, { getState, rejectWithValue }) => {
    try {
      const response = await axios.delete(
        `${import.meta.env.VITE_API}/deleteList/${listId}`,
        getAuthHeader(getState)
      );
      return response.data.listId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete list');
    }
  }
);

export const updateListPositions = createAsyncThunk(
  'lists/updatePositions',
  async ({ teamId, lists }, { getState, rejectWithValue }) => {
    try {
      const response = await axios.put(
        `${import.meta.env.VITE_API}/updatePositions/${teamId}`,
        { lists },
        getAuthHeader(getState)
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update list positions');
    }
  }
);

const listSlice = createSlice({
  name: 'lists',
  initialState: {
    lists: [], // Will now contain lists with their cards
    loading: false,
    error: null,
    success: false
  },
  reducers: {
    clearLists: (state) => {
      state.lists = [];
      state.error = null;
      state.success = false;
    },
    clearListErrors: (state) => {
      state.error = null;
      state.success = false;
    },
    addOptimistic: (state, action) => {
      state.lists.push(action.payload);
    },
    updateOptimistic: (state, action) => {
      const index = state.lists.findIndex(list => list._id === action.payload._id);
      if (index !== -1) {
        state.lists[index] = action.payload;
      }
    },
    deleteOptimistic: (state, action) => {
      state.lists = state.lists.filter(list => list._id !== action.payload);
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch lists
      .addCase(fetchLists.fulfilled, (state, action) => {
        state.loading = false;
        // Each list now includes its cards array
        state.lists = Array.isArray(action.payload) ? action.payload : [];
        state.success = true;
      })
      .addCase(fetchLists.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })
      // Create list
      .addCase(createList.fulfilled, (state, action) => {
        // Find and remove any temporary list
        state.lists = state.lists.filter(list => !list._id.startsWith('temp-'));
        // Initialize empty cards array for new list
        const newList = {
          ...action.payload,
          cards: []
        };
        state.lists.push(newList);
        state.loading = false;
        state.success = true;
      })
      // Update list
      .addCase(updateList.fulfilled, (state, action) => {
        const index = state.lists.findIndex(list => list._id === action.payload._id);
        if (index !== -1) {
          state.lists[index] = action.payload;
        }
        state.loading = false;
        state.success = true;
      })
      .addCase(updateList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })
      // Delete list
      .addCase(deleteList.fulfilled, (state, action) => {
        state.lists = state.lists.filter(list => list._id !== action.payload);
        state.loading = false;
        state.success = true;
      })
      .addCase(deleteList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })
      // Update list positions - remove the pending state
      .addCase(updateListPositions.fulfilled, (state, action) => {
        state.lists = action.payload;
        state.success = true;
      })
      .addCase(updateListPositions.rejected, (state, action) => {
        state.error = action.payload;
        state.success = false;
      });
  }
});

export const { clearLists, clearListErrors, addOptimistic, updateOptimistic, deleteOptimistic } = listSlice.actions;
export default listSlice.reducer;
