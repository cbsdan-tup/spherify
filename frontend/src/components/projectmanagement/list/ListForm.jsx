import React, { useState, useEffect } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { createList, updateList } from '../../../redux/kanbanSlice';

const ListForm = ({ show, onHide, list = null }) => {
  const dispatch = useDispatch();
  const currentTeamId = useSelector(state => state.team.currentTeamId);
  const boardId = useSelector(state => state.kanban.currentBoard?._id);
  
  const [formData, setFormData] = useState({
    listTitle: '',
    position: 0
  });

  useEffect(() => {
    if (list) {
      setFormData({
        listTitle: list.listTitle,
        position: list.position
      });
    }
  }, [list]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (list) {
        await dispatch(updateList({
          listId: list._id,
          listData: formData
        })).unwrap();
      } else {
        await dispatch(createList({
          ...formData,
          boardId,
          teamId: currentTeamId,
          position: Date.now() // Will be adjusted by backend
        })).unwrap();
      }
      onHide();
    } catch (error) {
      console.error('Failed to save list:', error);
    }
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>{list ? 'Edit List' : 'Create New List'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>List Title</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter list title"
              value={formData.listTitle}
              onChange={(e) => setFormData({ ...formData, listTitle: e.target.value })}
              required
            />
          </Form.Group>
          <div className="d-flex justify-content-end">
            <Button variant="secondary" className="me-2" onClick={onHide}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {list ? 'Update' : 'Create'}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default ListForm;
