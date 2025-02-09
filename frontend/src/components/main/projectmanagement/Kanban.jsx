import React from 'react';
import KanbanBoard from '../../Board/KanbanBoard';
import { useFetchBoards } from '../../../hooks/useFetchData';
import { Container, ErrorMessage, LoadingMessage } from '../../common/styles';

const Kanban = ({ teamId }) => {
    const { boards, loading, error, refresh } = useFetchBoards(teamId);

 const handleDragEnd = (result) => {
        if (!result.destination) return;
        // Implement drag and drop logic here
        console.log(result);
    };
    if (loading) {
        return <LoadingMessage>Loading boards...</LoadingMessage>;
    }
    if (error) {
        return (
            <ErrorMessage>
                {error}
                <button onClick={refresh}>Retry</button>
            </ErrorMessage>
        );
    }
    return (
        <Container>
            <KanbanBoard boards={boards} onDragEnd={handleDragEnd} />
        </Container>
    );

}
export default Kanban;