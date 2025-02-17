import React from 'react';
import { Form } from 'react-bootstrap';
import { useDispatch } from 'react-redux';
import { updateSubtask, deleteSubtask } from '../../../../redux/kanbanSlice';
import { FaTrash } from 'react-icons/fa';

const Subtask = ({ subtask }) => {
  const dispatch = useDispatch();

  const handleToggle = () => {
    dispatch(updateSubtask({
      subtaskId: subtask._id,
      subtaskData: { isDone: !subtask.isDone }
    }));
  };

  const handleDelete = () => {
    dispatch(deleteSubtask(subtask._id));
  };

  return (
    <div className="d-flex align-items-center mb-2">
      <Form.Check
        type="checkbox"
        checked={subtask.isDone}
        onChange={handleToggle}
        label={subtask.taskName}
        className="flex-grow-1"
      />
      <FaTrash
        className="text-danger ms-2"
        role="button"
        onClick={handleDelete}
      />
    </div>
  );
};

export default Subtask;
