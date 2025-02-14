import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Async thunks
export const fetchEvents = createAsyncThunk(
  'calendar/fetchEvents',
  async (teamId) => {
    const response = await axios.get(`${import.meta.env.VITE_API}/events/team/${teamId}`);
    return response.data;
  }
);

export const createEvent = createAsyncThunk(
  'calendar/createEvent',
  async (eventData) => {
    const response = await axios.post(`${import.meta.env.VITE_API}/events`, eventData);
    return response.data.event;
  }
);

export const updateEvent = createAsyncThunk(
  'calendar/updateEvent',
  async ({ eventId, eventData }) => {
    const response = await axios.put(`${import.meta.env.VITE_API}/events/${eventId}`, eventData);
    return response.data.event;
  }
);

export const deleteEvent = createAsyncThunk(
  'calendar/deleteEvent',
  async (eventId) => {
    await axios.delete(`${import.meta.env.VITE_API}/events/${eventId}`);
    return eventId;
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
        state.events = action.payload;
      })
      .addCase(fetchEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(createEvent.fulfilled, (state, action) => {
        state.events.push(action.payload);
      })
      .addCase(updateEvent.fulfilled, (state, action) => {
        const index = state.events.findIndex(event => event._id === action.payload._id);
        if (index !== -1) {
          state.events[index] = action.payload;
        }
      })
      .addCase(deleteEvent.fulfilled, (state, action) => {
        state.events = state.events.filter(event => event._id !== action.payload);
      });
  }
});

export default calendarSlice.reducer;
