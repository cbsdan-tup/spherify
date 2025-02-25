import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { createCard } from '../../../redux/cardSlice';

function AddCard({ listId }) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const dispatch = useDispatch();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (title.trim()) {
      dispatch(createCard({ title, listId }));
      setTitle('');
      setShowForm(false);
    }
  };

  if (!showForm) {
    return (
      <button 
        onClick={() => setShowForm(true)}
        style={{
          width: '100%',
          padding: '0.5rem',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left'
        }}
      >
        + Add a card
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Enter card title..."
        autoFocus
        style={{
          width: '100%',
          padding: '0.5rem',
          marginBottom: '0.5rem',
          resize: 'vertical'
        }}
      />
      <button type="submit">Add Card</button>
      <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
    </form>
  );
}

export default AddCard;
