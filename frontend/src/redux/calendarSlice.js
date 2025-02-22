import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { getToken } from '../utils/helper';

// Helper function to get auth header
const getAuthHeader = (getState) => {
  const token = getToken(getState().auth);
  return {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
};

export const fetchEvents = createAsyncThunk(
  'calendar/fetchEvents',
  async (teamId, { getState, rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API}/getEventsByTeam/${teamId}`,
        getAuthHeader(getState)
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch events');
    }
  }
);

export const createEvent = createAsyncThunk(
  'calendar/createEvent',
  async (eventData, { getState, rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API}/createEvent`,
        eventData,
        getAuthHeader(getState)
      );
      // The backend returns { event: {...} }
      return response.data.event;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create event');
    }
  }
);

export const updateEvent = createAsyncThunk(
  'calendar/updateEvent',
  async ({ eventId, eventData }, { getState, rejectWithValue }) => {
    try {
      const response = await axios.put(
        `${import.meta.env.VITE_API}/updateEvent/${eventId}`,
        eventData,
        getAuthHeader(getState)
      );
      return response.data.event;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update event');
    }
  }
);

export const deleteEvent = createAsyncThunk(
  'calendar/deleteEvent',
  async (eventId, { getState, rejectWithValue }) => {
    try {
      await axios.delete(
        `${import.meta.env.VITE_API}/deleteEvent/${eventId}`,
        getAuthHeader(getState)
      );
      return eventId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete event');
    }
  }
);

const calendarSlice = createSlice({
  name: 'calendar',
  initialState: {
    events: [],
    loading: false,
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEvents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEvents.fulfilled, (state, action) => {
        state.loading = false;
        // Ensure dates are properly parsed
        state.events = action.payload.map(event => ({
          ...event,
          start: new Date(event.start || event.startDate).toISOString(),
          end: new Date(event.end || event.endDate).toISOString()
        }));
      })
      .addCase(fetchEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createEvent.fulfilled, (state, action) => {
        const newEvent = {
          ...action.payload,
          start: new Date(action.payload.start || action.payload.startDate).toISOString(),
          end: new Date(action.payload.end || action.payload.endDate).toISOString()
        };
        state.events.push(newEvent);
        state.error = null;
      })
      .addCase(createEvent.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(updateEvent.fulfilled, (state, action) => {
        const index = state.events.findIndex(event => event._id === action.payload._id);
        if (index !== -1) {
          state.events[index] = {
            ...action.payload,
            start: new Date(action.payload.start || action.payload.startDate).toISOString(),
            end: new Date(action.payload.end || action.payload.endDate).toISOString(),
            title: action.payload.title || action.payload.name // Handle both title and name
          };
        }
        state.error = null;
      })
      .addCase(updateEvent.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(deleteEvent.fulfilled, (state, action) => {
        state.events = state.events.filter(event => event._id !== action.payload);
        state.error = null;
      })
      .addCase(deleteEvent.rejected, (state, action) => {
        state.error = action.payload;
      });
  }
});

export default calendarSlice.reducer;
