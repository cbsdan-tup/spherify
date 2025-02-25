import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DragDropContext } from 'react-beautiful-dnd';
import { useParams } from 'react-router-dom';
import { 
  fetchBoardDetails, 
  updateBoard 
} from '../../../redux/boardSlice';
import BoardHeader from './board/BoardHeader';
import BoardLists from './board/BoardLists';
import LoadingSpinner from '../../layout/LoadingSpinner';
import ErrorAlert from '../../common/ErrorAlert';
import { updateList } from '../../../redux/listSlice';
import { updateCard } from '../../../redux/cardSlice';

const Kanban = () => {
  const dispatch = useDispatch();
  const { boardId } = useParams();
  const { currentBoard, loading, error } = useSelector(state => state.boards);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (boardId) {
      dispatch(fetchBoardDetails(boardId));
    }
  }, [dispatch, boardId]);

  const handleDragEnd = (result) => {
    setIsDragging(false);
    const { destination, source, draggableId, type } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) return;

    // Handle list reordering
    if (type === 'list') {
      const newLists = Array.from(currentBoard.lists);
      const [removed] = newLists.splice(source.index, 1);
      newLists.splice(destination.index, 0, removed);

      // Calculate new positions
      const updatedLists = newLists.map((list, index) => ({
        ...list,
        position: (index + 1) * 1000
      }));

      // Update each list's position
      updatedLists.forEach(list => {
        dispatch(updateList({
          listId: list._id,
          updateData: { position: list.position }
        }));
      });

      return;
    }

    // Handle card reordering
    if (type === 'card') {
      const sourceList = currentBoard.lists.find(
        list => list._id === source.droppableId
      );
      const destList = currentBoard.lists.find(
        list => list._id === destination.droppableId
      );

      if (!sourceList || !destList) return;

      const sourceCards = Array.from(
        currentBoard.cards.filter(card => card.listId === sourceList._id)
      );
      const destCards = source.droppableId === destination.droppableId
        ? sourceCards
        : Array.from(currentBoard.cards.filter(card => card.listId === destList._id));

      // Remove card from source
      const [movedCard] = sourceCards.splice(source.index, 1);

      // Add card to destination
      if (source.droppableId === destination.droppableId) {
        sourceCards.splice(destination.index, 0, movedCard);
        const updatedCards = sourceCards.map((card, index) => ({
          ...card,
          position: (index + 1) * 1000
        }));

        // Update moved cards
        updatedCards.forEach(card => {
          dispatch(updateCard({
            cardId: card._id,
            cardData: { position: card.position }
          }));
        });
      } else {
        destCards.splice(destination.index, 0, movedCard);
        const updatedCards = destCards.map((card, index) => ({
          ...card,
          listId: destList._id,
          position: (index + 1) * 1000
        }));

        // Update moved card
        dispatch(updateCard({
          cardId: movedCard._id,
          cardData: {
            listId: destList._id,
            position: updatedCards[destination.index].position
          }
        }));
      }
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorAlert message={error} />;
  if (!currentBoard) return null;

  return (
    <div className="flex flex-col h-full bg-gray-100">
      <BoardHeader board={currentBoard} />
      <DragDropContext
        onDragEnd={handleDragEnd}
        onDragStart={() => setIsDragging(true)}
      >
        <div className="flex-1 overflow-x-auto">
          <BoardLists 
            board={currentBoard} 
            isDragging={isDragging}
          />
        </div>
      </DragDropContext>
    </div>
  );
};

export default Kanban;