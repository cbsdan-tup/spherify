import axios from 'axios';
import { getAuthHeader } from '../../utils/helper';

const API_URL = import.meta.env.VITE_API;

export const boardApi = {
  getUserBoards: async (getState) => {
    const response = await axios.get(
      `${API_URL}/userBoards`,
      getAuthHeader(getState)
    );
    return response.data;
  },

  getTeamBoards: async (teamId, getState) => {
    const response = await axios.get(
      `${API_URL}/teamBoards/${teamId}`,
      getAuthHeader(getState)
    );
    return response.data;
  },

  getBoardDetails: async (boardId, getState) => {
    const response = await axios.get(
      `${API_URL}/board/${boardId}`,
      getAuthHeader(getState)
    );
    return response.data;
  },

  createBoard: async (boardData, getState) => {
    const response = await axios.post(
      `${API_URL}/board/create`,
      boardData,
      getAuthHeader(getState)
    );
    return response.data;
  },

  updateBoard: async ({ boardId, updateData }, getState) => {
    const response = await axios.patch(
      `${API_URL}/board/${boardId}`,
      updateData,
      getAuthHeader(getState)
    );
    return response.data;
  },

  deleteBoard: async (boardId, getState) => {
    await axios.delete(
      `${API_URL}/board/${boardId}`,
      getAuthHeader(getState)
    );
    return boardId;
  }
};
