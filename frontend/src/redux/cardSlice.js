import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { getToken } from '../utils/helper';

const getAuthHeader = (getState) => ({
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken(getState().auth)}`
  }
});

export const fetchCards = createAsyncThunk(
  'cards/fetchCards',
  async ({teamId, listId}, { getState, rejectWithValue }) => {
    try {
      console.log(`Fetching cards for teamId: ${teamId}, listId: ${listId}`);
      const response = await axios.get(
        `${import.meta.env.VITE_API}/getCards/${teamId}/${listId}`,
        getAuthHeader(getState)
      );
      console.log('Cards fetched:', response.data);
      return { 
        listId, 
        cards: Array.isArray(response.data) ? response.data : [] 
      };
    } catch (error) {
      console.error('Error fetching cards:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch cards');
    }
  }
);

export const createCard = createAsyncThunk(
  'cards/createCard',
  async (cardData, { getState, rejectWithValue }) => {
    try {
      console.log('Making API call to create card:', cardData);
      const response = await axios.post(
        `${import.meta.env.VITE_API}/createCard`,
        cardData,
        getAuthHeader(getState)
      );
      
      console.log('API Response:', response.data);
      
      if (!response.data || !response.data._id) {
        throw new Error('Invalid response from server');
      }
      
      return { ...response.data, listId: cardData.listId };
    } catch (error) {
      console.error('API Error:', error.response || error);
      return rejectWithValue(
        error.response?.data?.message || 
        error.message || 
        'Failed to create card'
      );
    }
  }
);

export const updateCard = createAsyncThunk(
  'cards/updateCard',
  async ({ cardId, updateData }, { getState, rejectWithValue }) => {
    try {
      const response = await axios.put(
        `${import.meta.env.VITE_API}/updateCard/${cardId}`,
        updateData,
        getAuthHeader(getState)
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update card');
    }
  }
);

export const deleteCard = createAsyncThunk(
  'cards/deleteCard',
  async (cardId, { getState, rejectWithValue }) => {
    try {
      const response = await axios.delete(
        `${import.meta.env.VITE_API}/deleteCard/${cardId}`,
        getAuthHeader(getState)
      );
      return { cardId: response.data.cardId, listId: response.data.listId };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete card');
    }
  }
);

export const updateCardPositions = createAsyncThunk(
  'cards/updatePositions',
  async (positionData, { getState, rejectWithValue }) => {
    try {
      const response = await axios.put(
        `${import.meta.env.VITE_API}/updateCardPositions/${positionData.teamId}`,
        {
          sourceListId: positionData.sourceListId,
          destinationListId: positionData.destinationListId,
          cards: positionData.cards
        },
        getAuthHeader(getState)
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update card positions');
    }
  }
);

const cardSlice = createSlice({
  name: 'cards',
  initialState: {
    cardsByList: {}, // Will store cards organized by listId
    loading: false,
    error: null,
    success: false
  },
  reducers: {
    clearCards: (state) => {
      state.cardsByList = {};
      state.error = null;
      state.success = false;
    },
    clearCardErrors: (state) => {
      state.error = null;
      state.success = false;
    },
    addOptimisticCard: (state, action) => {
      const { listId, card } = action.payload;
      if (!state.cardsByList[listId]) {
        state.cardsByList[listId] = [];
      }
      state.cardsByList[listId].push(card);
    },
    updateOptimisticCard: (state, action) => {
      const { listId, card } = action.payload;
      if (state.cardsByList[listId]) {
        const index = state.cardsByList[listId].findIndex(c => c._id === card._id);
        if (index !== -1) {
          state.cardsByList[listId][index] = card;
        }
      }
    },
    deleteOptimisticCard: (state, action) => {
      const { listId, cardId } = action.payload;
      if (state.cardsByList[listId]) {
        state.cardsByList[listId] = state.cardsByList[listId].filter(card => card._id !== cardId);
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch cards
      .addCase(fetchCards.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCards.fulfilled, (state, action) => {
        const { listId, cards } = action.payload;
        state.cardsByList[listId] = cards;
        state.loading = false;
        state.error = null;
        console.log(`Updated cards for list ${listId}:`, state.cardsByList[listId]);
      })
      .addCase(fetchCards.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        console.error('Failed to fetch cards:', action.payload);
      })
      
      // Create card
      .addCase(createCard.fulfilled, (state, action) => {
        const { listId } = action.payload;
        if (!state.cardsByList[listId]) {
          state.cardsByList[listId] = [];
        }
        // Ensure we don't add duplicate cards
        const existingCardIndex = state.cardsByList[listId].findIndex(
          card => card._id === action.payload._id
        );
        if (existingCardIndex === -1) {
          state.cardsByList[listId].push(action.payload);
          // Sort cards by position
          state.cardsByList[listId].sort((a, b) => a.position - b.position);
        }
        state.success = true;
        state.error = null;
      })
      
      // Update card
      .addCase(updateCard.fulfilled, (state, action) => {
        const { listId, _id } = action.payload;
        if (state.cardsByList[listId]) {
          const index = state.cardsByList[listId].findIndex(card => card._id === _id);
          if (index !== -1) {
            state.cardsByList[listId][index] = action.payload;
          }
        }
        state.success = true;
      })
      
      // Delete card
      .addCase(deleteCard.fulfilled, (state, action) => {
        const { cardId, listId } = action.payload;
        if (state.cardsByList[listId]) {
          state.cardsByList[listId] = state.cardsByList[listId].filter(card => card._id !== cardId);
        }
        state.success = true;
      })
      
      // Update card positions
      .addCase(updateCardPositions.fulfilled, (state, action) => {
        const { sourceListCards, destinationListCards } = action.payload;
        
        if (sourceListCards.length > 0) {
          const sourceListId = sourceListCards[0].listId;
          state.cardsByList[sourceListId] = sourceListCards;
        }
        
        if (destinationListCards.length > 0) {
          const destinationListId = destinationListCards[0].listId;
          state.cardsByList[destinationListId] = destinationListCards;
        }
        
        state.success = true;
      });
  }
});

export const { 
  clearCards, 
  clearCardErrors, 
  addOptimisticCard, 
  updateOptimisticCard, 
  deleteOptimisticCard 
} = cardSlice.actions;

export default cardSlice.reducer;
