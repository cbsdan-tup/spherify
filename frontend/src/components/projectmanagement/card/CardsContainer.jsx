import React from 'react';
import { Droppable } from 'react-beautiful-dnd';
import { AnimatePresence } from 'framer-motion';
import Card from './Card';

const CardsContainer = ({ listId, cards }) => {
  return (
    <Droppable droppableId={listId} type="CARD">
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`cards-container ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
        >
          <AnimatePresence>
            {cards.map((card, index) => (
              <Card
                key={card._id}
                card={card}
                index={index}
                onEdit={() => {/* Handle edit */}}
                onDelete={() => {/* Handle delete */}}
              />
            ))}
          </AnimatePresence>
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
};

export default CardsContainer;
