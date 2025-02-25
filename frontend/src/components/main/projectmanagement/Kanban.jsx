import React from 'react';
import { useParams } from 'react-router-dom';

const Kanban = () => {
  const { boardId } = useParams();

  return (
    <div className="h-full bg-gray-100 p-4">
      <h1>Kanban Board</h1>
    </div>
  );
};

export default Kanban;