import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { boardApi } from '../api/kanban/boardApi';
import { listApi } from '../api/kanban/listApi';
import { cardApi } from '../api/kanban/cardApi';

// Board thunks
export const fetchUserBoards = createAsyncThunk(
  'kanban/fetchUserBoards',
  async (_, { getState, rejectWithValue }) => {
    try {
      return await boardApi.getUserBoards(getState);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch boards');
    }
  }
);

// Similar thunks for other board operations...

// List thunks
export const createList = createAsyncThunk(
  'kanban/createList',
  async (listData, { getState, rejectWithValue }) => {
    try {
      return await listApi.createList(listData, getState);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create list');
    }
  }
);

// Similar thunks for other list operations...

// Card thunks
export const createCard = createAsyncThunk(
  'kanban/createCard',
  async (cardData, { getState, rejectWithValue }) => {
    try {
      return await cardApi.createCard(cardData, getState);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create card');
    }
  }
);

// Similar thunks for other card operations...

const kanbanSlice = createSlice({
  name: 'kanban',
  initialState: {
    boards: [],
    currentBoard: null,
    loading: false,
    error: null
  },
  reducers: {
    // ...existing reducers...
  },
  extraReducers: (builder) => {
    // ...existing extra reducers...
  }
});

export default kanbanSlice.reducer;
