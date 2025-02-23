import React from 'react';
import { Droppable } from 'react-beautiful-dnd';
import List from '../list/List';
import AddList from '../list/AddList';

const BoardLists = ({ board, isDragging }) => {
  const sortedLists = [...board.lists].sort((a, b) => a.position - b.position);

  return (
    <Droppable
      droppableId="all-lists"
      direction="horizontal"
      type="list"
    >
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className="flex-1 flex overflow-x-auto overflow-y-hidden p-4 gap-4"
        >
          {sortedLists.map((list, index) => (
            <List
              key={list._id}
              list={list}
              index={index}
              cards={board.cards.filter(card => card.listId === list._id)}
              isDragging={isDragging}
            />
          ))}
          {provided.placeholder}
          <AddList boardId={board._id} />
        </div>
      )}
    </Droppable>
  );
};

export default BoardLists;
