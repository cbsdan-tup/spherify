import React, { useState, useEffect } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { createCard, updateCard } from '../../../redux/kanbanSlice';

const CardForm = ({ show, onHide, card = null, listId }) => {
  const dispatch = useDispatch();
  const currentTeamId = useSelector(state => state.team.currentTeamId);
  const boardId = useSelector(state => state.kanban.currentBoard?._id);

  const [formData, setFormData] = useState({
    cardTitle: '',
    description: '',
    priority: 'low',
    dueDate: '',
    assignedTo: []
  });

  useEffect(() => {
    if (card) {
      setFormData({
        cardTitle: card.cardTitle,
        description: card.description || '',
        priority: card.priority,
        dueDate: card.dueDate ? new Date(card.dueDate).toISOString().split('T')[0] : '',
        assignedTo: card.assignedTo || []
      });
    }
  }, [card]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (card) {
        await dispatch(updateCard({
          cardId: card._id,
          cardData: { ...formData }
        })).unwrap();
      } else {
        await dispatch(createCard({
          ...formData,
          listId,
          boardId,
          teamId: currentTeamId
        })).unwrap();
      }
      onHide();
    } catch (error) {
      console.error('Failed to save card:', error);
    }
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>{card ? 'Edit Card' : 'Create Card'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Title</Form.Label>
            <Form.Control
              type="text"
              value={formData.cardTitle}
              onChange={(e) => setFormData({...formData, cardTitle: e.target.value})}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Priority</Form.Label>
            <Form.Select
              value={formData.priority}
              onChange={(e) => setFormData({...formData, priority: e.target.value})}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Due Date</Form.Label>
            <Form.Control
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
            />
          </Form.Group>
          <Button variant="primary" type="submit">
            {card ? 'Update' : 'Create'}
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default CardForm;
