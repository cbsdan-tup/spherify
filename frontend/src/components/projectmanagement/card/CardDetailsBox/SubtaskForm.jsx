import React, { useState } from 'react';
import { Form, Button } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { createSubtask } from '../../../../redux/kanbanSlice';

const SubtaskForm = ({ cardId }) => {
  const dispatch = useDispatch();
  const [taskName, setTaskName] = useState('');
  const currentBoard = useSelector(state => state.kanban.currentBoard);
  const currentTeam = useSelector(state => state.team.currentTeamId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!taskName.trim()) return;

    try {
      await dispatch(createSubtask({
        taskName,
        cardId,
        boardId: currentBoard._id,
        teamId: currentTeam,
        position: 1000 // Will be adjusted by backend
      })).unwrap();
      setTaskName('');
    } catch (error) {
      console.error('Failed to create subtask:', error);
    }
  };

  return (
    <Form onSubmit={handleSubmit} className="mt-2">
      <div className="d-flex">
        <Form.Control
          type="text"
          placeholder="Add a subtask..."
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
          className="me-2"
        />
        <Button type="submit" variant="outline-primary" size="sm">
          Add
        </Button>
      </div>
    </Form>
  );
};

export default SubtaskForm;
