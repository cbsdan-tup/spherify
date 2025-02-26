import React, { useState } from 'react';
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDispatch } from 'react-redux';
import { deleteCard } from '../../../redux/cardSlice';
import CardModal from './CardModal';
import "./CardItem.css";

const CardItem = ({ card }) => {
  const [showModal, setShowModal] = useState(false);
  const dispatch = useDispatch();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: card._id,
    data: {
      type: "CARD",
      card
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
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

  const handleCardClick = (e) => {
    e.stopPropagation();
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this card?')) {
      try {
        await dispatch(deleteCard(card._id));
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
        {...attributes} 
        {...listeners}
        className="card-item"
        onClick={handleCardClick}
      >
        {card.assignedTo && card.assignedTo.length > 0 && (
          <div className="card-assigned-user">
            <img 
              src={card.assignedTo[0].avatar?.url || "/images/account.png"}
              alt={card.assignedTo[0].firstName}
              className="assigned-avatar"
              title={`${card.assignedTo[0].firstName} ${card.assignedTo[0].lastName}`}
            />
          </div>
        )}
        
        <div className="card-content">
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
          listId={card.listId}
          teamId={card.teamId}
          mode="edit" // Changed from "view" to "edit"
          initialData={card}
        />
      )}
    </>
  );
};

export default CardItem;
