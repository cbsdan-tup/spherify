import React from 'react';
import { DragDropContext, Droppable } from 'react-beautiful-dnd';
import styled from 'styled-components';

const BoardContainer = styled.div`
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 1rem;
    padding: 1rem;
    width: 100%;
    overflow-x: auto;

    @media (max-width: 1200px) {
        grid-template-columns: repeat(3, 1fr);
    }

    @media (max-width: 768px) {
        grid-template-columns: 1fr;
    }
`;

const Board = styled.div`
    background: #f4f5f7;
    border-radius: 8px;
    min-width: 280px;
    height: fit-content;
    min-height: 500px;
    padding: 1rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
`;

const BoardTitle = styled.h3`
    margin-bottom: 1rem;
    color: #172b4d;
    font-size: 1rem;
    font-weight: 600;
    padding: 0.5rem;
    border-bottom: 2px solid #dfe1e6;
`;

const DEFAULT_BOARDS = [
    { _id: 'backlog', type: 'Backlog' },
    { _id: 'planned', type: 'Planned' },
    { _id: 'in-progress', type: 'In Progress' },
    { _id: 'review', type: 'Review' },
    { _id: 'completed', type: 'Completed' }
];

const KanbanBoard = ({ boards = [], onDragEnd }) => {
    const displayBoards = boards.length ? boards : DEFAULT_BOARDS;

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <BoardContainer>
                {displayBoards.map((board) => (
                    <Board key={board._id}>
                        <BoardTitle>{board.type}</BoardTitle>
                        <Droppable droppableId={board._id}>
                            {(provided) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                >
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </Board>
                ))}
            </BoardContainer>
        </DragDropContext>
    );
};

export default KanbanBoard;
