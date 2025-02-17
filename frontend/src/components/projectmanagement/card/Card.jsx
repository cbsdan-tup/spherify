import React from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { motion } from 'framer-motion';
import { Card as BCard } from 'react-bootstrap';
import CardPriority from './CardDetailsBox/CardPriority';
import ProgressBar from './CardDetailsBox/ProgressBar';
import { FaEdit, FaTrash } from 'react-icons/fa';

const Card = ({ card, index, onEdit, onDelete }) => {
  return (
    <Draggable draggableId={card._id} index={index}>
      {(provided, snapshot) => (
        <motion.div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          whileHover={{ scale: 1.02 }}
        >
          <BCard className={`mb-2 ${snapshot.isDragging ? 'dragging' : ''}`}>
            <BCard.Body>
              <div className="d-flex justify-content-between align-items-start">
                <BCard.Title>{card.cardTitle}</BCard.Title>
                <div>
                  <FaEdit className="me-2" onClick={() => onEdit(card)} role="button" />
                  <FaTrash onClick={() => onDelete(card._id)} role="button" />
                </div>
              </div>
              <CardPriority priority={card.priority} />
              {card.description && (
                <BCard.Text className="text-muted small">
                  {card.description}
                </BCard.Text>
              )}
              <ProgressBar card={card} />
              <div className="mt-2 d-flex justify-content-between">
                {card.dueDate && (
                  <small className="text-muted">
                    Due: {new Date(card.dueDate).toLocaleDateString()}
                  </small>
                )}
                {card.assignedTo?.length > 0 && (
                  <div className="assigned-users">
                    {/* Add user avatars here */}
                  </div>
                )}
              </div>
            </BCard.Body>
          </BCard>
        </motion.div>
      )}
    </Draggable>
  );
};

export default Card;
