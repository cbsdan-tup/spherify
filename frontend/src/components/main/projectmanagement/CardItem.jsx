import React, { useState } from 'react';
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import "./CardItem.css";

const CardItem = ({ card }) => {
  // Add debug logging
  console.log('CardItem received:', card);

  const [showModal, setShowModal] = useState(false);
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

  const closeModal = () => {
    setShowModal(false);
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
        <div 
          className="priority-marker" 
          style={{ backgroundColor: getPriorityColor(card.priority) }}
        ></div>
        {/* Use both title variations to ensure display */}
        <div className="card-title">{card.cardTitle || card.title}</div>
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
        <div className="card-priority">
          <span className={`priority-badge ${card.priority}`}>
            {card.priority}
          </span>
        </div>
      </div>
      {showModal && (
        <CardModal 
          onClose={closeModal}
          listId={card.listId}
          teamId={card.teamId}
          mode="view"
          initialData={card}
        />
      )}
    </>
  );
};

export default CardItem;
