import axios from 'axios';
const BASE_URL = 'http://localhost:4000/api';
const kanbanApi = {
    fetchBoardsByTeam: async (teamId) => {
        try {
            const response = await axios.get(`${BASE_URL}/boards/team/${teamId}`);
            // Ensure we return an empty array if no data
            return response.data || [];
        } catch (error) {
            console.error('Error fetching boards:', error);
            throw new Error(error.response?.data?.message || 'Failed to fetch boards');
        }
    },
    initializeBoards: async (teamId) => {
        try {
            const response = await axios.post(`${BASE_URL}/boards/initialize/${teamId}`);
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Failed to initialize boards');
        }
    }
};
export default kanbanApi;