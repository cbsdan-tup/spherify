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

// Fetch list by ID
export const fetchList = createAsyncThunk(
  'lists/fetchList',
  async (listId, { getState, rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API}/list/${listId}`,
        getAuthHeader(getState)
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch list');
    }
  }
);

// Create new list
export const createList = createAsyncThunk(
  'lists/createList',
  async (listData, { getState, rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API}/list/create`,
        listData,
        getAuthHeader(getState)
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create list');
    }
  }
);

// Update list
export const updateList = createAsyncThunk(
  'lists/updateList',
  async ({ listId, listData }, { getState, rejectWithValue }) => {
    try {
      const response = await axios.put(
        `${import.meta.env.VITE_API}/list/${listId}`,
        listData,
        getAuthHeader(getState)
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update list');
    }
  }
);

// Delete list
export const deleteList = createAsyncThunk(
  'lists/deleteList',
  async (listId, { getState, rejectWithValue }) => {
    try {
      await axios.delete(
        `${import.meta.env.VITE_API}/list/${listId}`,
        getAuthHeader(getState)
      );
      return listId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete list');
    }
  }
);

const listSlice = createSlice({
  name: 'lists',
  initialState: {
    lists: [],
    currentList: null,
    loading: false,
    error: null
  },
  reducers: {
    setCurrentList: (state, action) => {
      state.currentList = action.payload;
    },
    clearCurrentList: (state) => {
      state.currentList = null;
    },
    reorderLists: (state, action) => {
      state.lists = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch list
      .addCase(fetchList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchList.fulfilled, (state, action) => {
        state.loading = false;
        state.currentList = action.payload;
      })
      .addCase(fetchList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create list
      .addCase(createList.fulfilled, (state, action) => {
        state.lists.push(action.payload);
      })
      // Update list
      .addCase(updateList.fulfilled, (state, action) => {
        const index = state.lists.findIndex(list => list._id === action.payload._id);
        if (index !== -1) {
          state.lists[index] = action.payload;
        }
        if (state.currentList?._id === action.payload._id) {
          state.currentList = action.payload;
        }
      })
      // Delete list
      .addCase(deleteList.fulfilled, (state, action) => {
        state.lists = state.lists.filter(list => list._id !== action.payload);
        if (state.currentList?._id === action.payload) {
          state.currentList = null;
        }
      });
  }
});

export const { setCurrentList, clearCurrentList, reorderLists } = listSlice.actions;

export default listSlice.reducer;
