import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { createCard } from '../../../../redux/cardSlice';
import { FiPlus } from 'react-icons/fi';

const AddCard = ({ listId }) => {
  const dispatch = useDispatch();
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (title.trim()) {
      await dispatch(createCard({
        listId,
        cardTitle: title,
        position: Date.now() // This ensures the new card is added at the end
      }));
      setTitle('');
      setIsAdding(false);
    }
  };

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="w-full p-2 text-gray-600 hover:bg-gray-200 rounded flex items-center gap-2 text-sm"
      >
        <FiPlus />
        Add Card
      </button>
    );
  }

  return (
    <div className="p-2">
      <form onSubmit={handleSubmit}>
        <textarea
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter card title..."
          className="w-full px-3 py-2 rounded border border-gray-300 mb-2 text-sm resize-none"
          rows={3}
          autoFocus
        />
        <div className="flex gap-2">
          <button
            type="submit"
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
          >
            Add Card
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAdding(false);
              setTitle('');
            }}
            className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400 text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddCard;
