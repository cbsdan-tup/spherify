import React from 'react';
import { Badge } from 'react-bootstrap';

const priorityColors = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
  urgent: 'dark'
};

const CardPriority = ({ priority }) => {
  return (
    <Badge bg={priorityColors[priority]} className="mb-2">
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </Badge>
  );
};

export default CardPriority;
