import axios from 'axios';
import { getAuthHeader } from '../../utils/helper';

const API_URL = import.meta.env.VITE_API;

export const cardApi = {
  getCard: async (cardId, getState) => {
    const response = await axios.get(
      `${API_URL}/card/${cardId}`,
      getAuthHeader(getState)
    );
    return response.data;
  },

  createCard: async (cardData, getState) => {
    const response = await axios.post(
      `${API_URL}/card/create`,
      cardData,
      getAuthHeader(getState)
    );
    return response.data;
  },

  updateCard: async ({ cardId, cardData }, getState) => {
    const response = await axios.put(
      `${API_URL}/card/${cardId}`,
      cardData,
      getAuthHeader(getState)
    );
    return response.data;
  },

  deleteCard: async (cardId, getState) => {
    await axios.delete(
      `${API_URL}/card/${cardId}`,
      getAuthHeader(getState)
    );
    return cardId;
  },

  // Subtask operations
  createSubtask: async (subtaskData, getState) => {
    const response = await axios.post(
      `${API_URL}/card/subtask/create`,
      subtaskData,
      getAuthHeader(getState)
    );
    return response.data;
  },

  updateSubtask: async ({ subtaskId, subtaskData }, getState) => {
    const response = await axios.put(
      `${API_URL}/card/subtask/${subtaskId}`,
      subtaskData,
      getAuthHeader(getState)
    );
    return response.data;
  },

  deleteSubtask: async (subtaskId, getState) => {
    await axios.delete(
      `${API_URL}/card/subtask/${subtaskId}`,
      getAuthHeader(getState)
    );
    return subtaskId;
  }
};
