import React, { useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { FaEllipsisH } from 'react-icons/fa';
import { useDispatch } from 'react-redux';
import { deleteList } from '../../../redux/kanbanSlice';
import ListForm from './ListForm';

const ListOptionsBox = ({ list }) => {
  const dispatch = useDispatch();
  const [showEditForm, setShowEditForm] = useState(false);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this list and all its cards?')) {
      try {
        await dispatch(deleteList(list._id)).unwrap();
      } catch (error) {
        console.error('Failed to delete list:', error);
      }
    }
  };

  return (
    <>
      <Dropdown align="end" className="list-options">
        <Dropdown.Toggle variant="light" size="sm" id={`list-options-${list._id}`}>
          <FaEllipsisH />
        </Dropdown.Toggle>
        <Dropdown.Menu>
          <Dropdown.Item onClick={() => setShowEditForm(true)}>
            Edit List
          </Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Item onClick={handleDelete} className="text-danger">
            Delete List
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>

      <ListForm
        show={showEditForm}
        onHide={() => setShowEditForm(false)}
        list={list}
      />

      <style jsx>{`
        .list-options .dropdown-toggle::after {
          display: none;
        }
        .list-options .btn-light {
          padding: 0.25rem 0.5rem;
          background: transparent;
          border: none;
        }
        .list-options .btn-light:hover,
        .list-options .btn-light:focus {
          background: rgba(0, 0, 0, 0.05);
        }
      `}</style>
    </>
  );
};

export default ListOptionsBox;
