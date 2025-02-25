import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { createList } from '../../../../redux/listSlice';
import { FiPlus } from 'react-icons/fi';

const AddList = ({ boardId }) => {
  const dispatch = useDispatch();
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (title.trim()) {
      await dispatch(createList({
        boardId,
        listTitle: title,
        position: Date.now() // This ensures the new list is added at the end
      }));
      setTitle('');
      setIsAdding(false);
    }
  };

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="w-72 flex-shrink-0 p-3 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2"
      >
        <FiPlus />
        Add List
      </button>
    );
  }

  return (
    <div className="w-72 flex-shrink-0 bg-gray-100 rounded-lg p-3">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter list title..."
          className="w-full px-3 py-2 rounded border border-gray-300 mb-2"
          autoFocus
        />
        <div className="flex gap-2">
          <button
            type="submit"
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Add List
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAdding(false);
              setTitle('');
            }}
            className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddList;
