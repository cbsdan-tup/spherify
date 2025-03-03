import React, { useState, memo, useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import "./ListItem.css";
import CardItem from "./CardItem";
import CardModal from "./CardModal";
import { fetchCards, updateCardPositions } from "../../../redux/cardSlice";
import { DndContext } from '@dnd-kit/core';
import { calculatePosition } from '../../../utils/dragDropUtils';

const ListItem = memo(function ListItem({ list, id, onEdit, onDelete, teamId }) {
  const dispatch = useDispatch();
  
  // Get cards from the Redux store instead of the list prop
  const cards = useSelector(state => state.cards.cardsByList[list._id] || []);

  // Fetch cards when the component mounts
  useEffect(() => {
    dispatch(fetchCards({ teamId, listId: list._id }));
  }, [dispatch, teamId, list._id]);

  // State and sortable setup
  const [isEditing, setIsEditing] = useState(false);
  const [editingTitle, setEditingTitle] = useState(list.title);
  const [showCardModal, setShowCardModal] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    over
  } = useSortable({
    id,
    data: {
      type: "LIST",
      list
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    position: 'relative',
    width: 320,
    marginRight: isDragging ? 0 : '16px',
    height: 'fit-content',
    flexShrink: 0
  };

  const handleEdit = useCallback((e) => {
    e.stopPropagation();
    if (editingTitle.trim() && editingTitle !== list.title) {
      onEdit(editingTitle);
    }
    setIsEditing(false);
  }, [editingTitle, list.title, onEdit]);

  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    onDelete();
  }, [onDelete]);

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleEdit(e);
    }
  };

  const openAddCardModal = () => {
    setShowCardModal(true);
  };

  const closeCardModal = () => {
    setShowCardModal(false);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeIndex = cards.findIndex(card => card._id === active.id);
    const overIndex = cards.findIndex(card => card._id === over.id);
    
    if (activeIndex === -1 || overIndex === -1) return;

    const updatedCards = Array.from(cards);
    const [movedCard] = updatedCards.splice(activeIndex, 1);
    updatedCards.splice(overIndex, 0, movedCard);

    const cardsWithNewPositions = updatedCards.map((card, index) => ({
      ...card,
      position: index * 16384,
      listId: list._id
    }));

    try {
      await dispatch(updateCardPositions({
        teamId,
        sourceListId: list._id,
        destinationListId: list._id,
        cards: cardsWithNewPositions
      }));

      // Refresh the cards after updating positions
      dispatch(fetchCards({ teamId, listId: list._id }));
    } catch (error) {
      console.error('Error updating card positions:', error);
    }
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`list-item-container ${isDragging ? 'is-dragging' : ''}`}
    >
      <div className="list-card">
        {/* List Header */}
        <div className="list-header" {...attributes} {...listeners}>
          {isEditing ? (
            <div className="list-title-edit">
              <input
                type="text"
                className="title-input"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={handleEdit}
                onKeyPress={handleKeyPress}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          ) : (
            <div className="list-title-container">
              <div className="list-title">
                <span className="drag-handle">⋮⋮</span> {list.title}
              </div>
              <div className="list-actions">
                <button className="icon-button edit-button" onClick={() => setIsEditing(true)}>✎</button>
                <button className="icon-button delete-button" onClick={handleDelete}>✕</button>
              </div>
            </div>
          )}
        </div>

        {/* Cards Container */}
        <div className="list-content">
          <DndContext onDragEnd={handleDragEnd}>
            <SortableContext 
              items={cards.map(card => card._id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="cards-container">
                {cards && cards.length > 0 ? (
                  cards.map((card, index) => (
                    <CardItem 
                      key={card._id} 
                      card={card}
                      listId={list._id}
                      teamId={teamId}
                      index={index}
                    />
                  ))
                ) : (
                  <div className="empty-list-message">
                    No cards in {list.title}
                  </div>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* List Footer */}
        <div className="list-footer">
          <button className="add-card-button" onClick={() => setShowCardModal(true)}>
            <span className="add-icon">+</span> Add Card
          </button>
        </div>
      </div>

      {/* Card Modal */}
      {showCardModal && (
        <CardModal 
          onClose={() => setShowCardModal(false)}
          listId={list._id}
          teamId={teamId}
          mode="create"
        />
      )}
    </div>
  );
});

export default ListItem;

