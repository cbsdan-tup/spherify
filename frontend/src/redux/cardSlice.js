import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { getToken } from '../utils/helper';

const getAuthHeader = (getState) => ({
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken(getState().auth)}`
  }
});

// Get card by ID
export const fetchCard = createAsyncThunk(
  'cards/fetchCard',
  async (cardId, { getState, rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API}/card/${cardId}`,
        getAuthHeader(getState)
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch card');
    }
  }
);

// Create new card
export const createCard = createAsyncThunk(
  'cards/createCard',
  async (cardData, { getState, rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API}/card/create`,
        cardData,
        getAuthHeader(getState)
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create card');
    }
  }
);

// Update card
export const updateCard = createAsyncThunk(
  'cards/updateCard',
  async ({ cardId, cardData }, { getState, rejectWithValue }) => {
    try {
      const response = await axios.put(
        `${import.meta.env.VITE_API}/card/${cardId}`,
        cardData,
        getAuthHeader(getState)
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update card');
    }
  }
);

// Delete card
export const deleteCard = createAsyncThunk(
  'cards/deleteCard',
  async (cardId, { getState, rejectWithValue }) => {
    try {
      await axios.delete(
        `${import.meta.env.VITE_API}/card/${cardId}`,
        getAuthHeader(getState)
      );
      return cardId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete card');
    }
  }
);

const cardSlice = createSlice({
  name: 'cards',
  initialState: {
    cards: [],
    currentCard: null,
    loading: false,
    error: null
  },
  reducers: {
    setCurrentCard: (state, action) => {
      state.currentCard = action.payload;
    },
    clearCurrentCard: (state) => {
      state.currentCard = null;
    },
    reorderCards: (state, action) => {
      state.cards = action.payload;
    },
    updateCardPosition: (state, action) => {
      const { cardId, newPosition, newListId } = action.payload;
      const cardIndex = state.cards.findIndex(card => card._id === cardId);
      if (cardIndex !== -1) {
        state.cards[cardIndex].position = newPosition;
        if (newListId) {
          state.cards[cardIndex].listId = newListId;
        }
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch card
      .addCase(fetchCard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCard.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCard = action.payload;
      })
      .addCase(fetchCard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create card
      .addCase(createCard.fulfilled, (state, action) => {
        state.cards.push(action.payload);
      })
      // Update card
      .addCase(updateCard.fulfilled, (state, action) => {
        const index = state.cards.findIndex(card => card._id === action.payload._id);
        if (index !== -1) {
          state.cards[index] = action.payload;
        }
        if (state.currentCard?._id === action.payload._id) {
          state.currentCard = action.payload;
        }
      })
      // Delete card
      .addCase(deleteCard.fulfilled, (state, action) => {
        state.cards = state.cards.filter(card => card._id !== action.payload);
        if (state.currentCard?._id === action.payload) {
          state.currentCard = null;
        }
      });
  }
});

export const { 
  setCurrentCard, 
  clearCurrentCard, 
  reorderCards,
  updateCardPosition
} = cardSlice.actions;

export default cardSlice.reducer;
