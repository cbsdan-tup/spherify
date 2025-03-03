import React, { useState, useRef } from 'react';
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDispatch } from 'react-redux';
import { deleteCard, updateCardPositions } from '../../../redux/cardSlice';
import CardModal from './CardModal';
import "./CardItem.css";

const CardItem = ({ card, listId, teamId }) => {
  const [showModal, setShowModal] = useState(false);
  const dragTimeoutRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dispatch = useDispatch();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: card._id,
    data: {
      type: "CARD",
      card,
      listId
    }
  });

  // Modified drag handler
  const handleDragStart = () => {
    isDraggingRef.current = true;
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
    }
  };

  // Modified click handler
  const handleCardClick = (e) => {
    e.preventDefault();
    // If we're dragging, don't trigger click
    if (isDraggingRef.current) {
      return;
    }
    setShowModal(true);
  };

  // Add drag end handler
  const handleDragEnd = () => {
    // Reset dragging state after a short delay
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 100);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
    zIndex: isDragging ? 1000 : 1
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'low': return '#61bd4f'; // green
      case 'medium': return '#f2d600'; // yellow
      case 'high': return '#ff9f1a'; // orange
      case 'urgent': return '#eb5a46'; // red
      default: return '#61bd4f';
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation(); // Prevent card click event
    if (window.confirm('Are you sure you want to delete this card?')) {
      try {
        const resultAction = await dispatch(deleteCard({
          cardId: card._id,
          listId: listId
        }));
        
        if (!deleteCard.fulfilled.match(resultAction)) {
          console.error('Failed to delete card:', resultAction.error);
        }
      } catch (error) {
        console.error('Error deleting card:', error);
      }
    }
  };

  const calculateProgress = () => {
    if (!card.checklist || card.checklist.length === 0) return null;
    
    const completedItems = card.checklist.filter(item => item.isCompleted).length;
    const totalItems = card.checklist.length;
    return Math.round((completedItems / totalItems) * 100);
  };

  return (
    <>
      <div 
        ref={setNodeRef} 
        style={style} 
        className="card-item"
      >
        {/* Drag handle area */}
        <div 
          className="card-drag-handle"
          {...attributes}
          {...listeners}
        >
          <span className="drag-dots">⋮⋮</span>
        </div>

        {/* Card content - now clickable for modal */}
        <div className="card-content" onClick={handleCardClick}>
          <div className="card-title">
            {card.cardTitle || card.title}
          </div>
          
          <div className="card-metadata">
            <span className={`priority-tag ${card.priority}`}>
              {card.priority}
            </span>
            
            {card.checklist && card.checklist.length > 0 && (
              <div className="checklist-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${calculateProgress()}%` }}
                  />
                </div>
                <span className="progress-text">
                  {calculateProgress()}%
                </span>
              </div>
            )}
          </div>

          {card.assignedTo && card.assignedTo.length > 0 && (
            <div className="card-members">
              {card.assignedTo.map(member => (
                <img 
                  key={member._id}
                  src={member.avatar?.url || "/images/account.png"}
                  alt={member.firstName}
                  className="member-avatar"
                  title={`${member.firstName} ${member.lastName}`}
                />
              ))}
            </div>
          )}
        </div>
        
        <div className="card-actions">
          <button 
            className="delete-button"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
          >
            ×
          </button>
        </div>
      </div>

      {showModal && (
        <CardModal 
          onClose={() => setShowModal(false)}
          listId={listId}
          teamId={teamId}
          mode="view"
          initialData={card}
        />
      )}
    </>
  );
};

export default CardItem;
