import { useState, useEffect, useCallback } from 'react';
import kanbanApi from '../api/kanbanApi';
export const useFetchData = (fetchFunction, dependencies = []) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await fetchFunction();
            setData(result);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [fetchFunction]);
    useEffect(() => {
        fetchData();
    }, [...dependencies]);
    return { data, loading, error, refresh: fetchData };
};
export const useFetchBoards = (teamId) => {
    const fetchBoards = useCallback(() => {
        if (!teamId) {
            return Promise.resolve([]);
        }
        return kanbanApi.fetchBoardsByTeam(teamId);
    }, [teamId]);
    const { data: boards, loading, error, refresh } = useFetchData(fetchBoards, [teamId]);
    return { boards, loading, error, refresh };
};