import axios from 'axios';
import { getAuthHeader } from '../../utils/helper';

const API_URL = import.meta.env.VITE_API;

export const listApi = {
  getList: async (listId, getState) => {
    const response = await axios.get(
      `${API_URL}/list/${listId}`,
      getAuthHeader(getState)
    );
    return response.data;
  },

  createList: async (listData, getState) => {
    const response = await axios.post(
      `${API_URL}/list/create`,
      listData,
      getAuthHeader(getState)
    );
    return response.data;
  },

  updateList: async ({ listId, listData }, getState) => {
    const response = await axios.put(
      `${API_URL}/list/${listId}`,
      listData,
      getAuthHeader(getState)
    );
    return response.data;
  },

  deleteList: async (listId, getState) => {
    await axios.delete(
      `${API_URL}/list/${listId}`,
      getAuthHeader(getState)
    );
    return listId;
  }
};
