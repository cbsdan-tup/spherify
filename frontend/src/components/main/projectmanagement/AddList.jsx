import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { createList } from '../../../redux/listSlice';

function AddList({ teamId }) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const dispatch = useDispatch();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (title.trim()) {
      dispatch(createList({ title, teamId }));
      setTitle('');
      setShowForm(false);
    }
  };

  if (!showForm) {
    return (
      <button 
        onClick={() => setShowForm(true)}
        style={{
          minWidth: '300px',
          padding: '1rem',
          background: '#ebecf0',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          textAlign: 'left'
        }}
      >
        + Add another list
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ minWidth: '300px' }}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Enter list title..."
        autoFocus
        style={{
          width: '100%',
          padding: '0.5rem',
          marginBottom: '0.5rem'
        }}
      />
      <button type="submit">Add List</button>
      <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
    </form>
  );
}

export default AddList;
