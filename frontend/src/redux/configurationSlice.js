import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const initialState = {
  site: {},
  conferencing: {},
  isLoading: false,
  error: null
};

export const fetchConfigurations = createAsyncThunk(
  "configurations/fetchConfigurations",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API}/admin-configuration/site-conferencing-info`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Error fetching configurations");
    }
  }
);

const configurationSlice = createSlice({
  name: "configurations",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchConfigurations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchConfigurations.fulfilled, (state, action) => {
        state.site = action.payload.site || {};
        state.conferencing = action.payload.conferencing || {};
        state.isLoading = false;
      })
      .addCase(fetchConfigurations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  }
});

export default configurationSlice.reducer;
