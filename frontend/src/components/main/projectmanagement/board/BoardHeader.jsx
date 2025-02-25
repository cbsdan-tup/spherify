import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { updateBoard, deleteBoard } from '../../../../redux/boardSlice';
import { FiMoreHorizontal, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { Menu, Transition } from '@headlessui/react';
import { useNavigate } from 'react-router-dom';

const BoardHeader = ({ board }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(board.boardTitle);

  const handleUpdateTitle = async (e) => {
    e.preventDefault();
    if (title.trim() && title !== board.boardTitle) {
      await dispatch(updateBoard({
        boardId: board._id,
        updateData: { boardTitle: title }
      }));
    }
    setIsEditing(false);
  };

  const handleDeleteBoard = async () => {
    if (window.confirm('Are you sure you want to delete this board?')) {
      await dispatch(deleteBoard(board._id));
      navigate('/boards');
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white border-b">
      <div className="flex items-center gap-4">
        {isEditing ? (
          <form onSubmit={handleUpdateTitle} className="flex items-center">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="px-2 py-1 border rounded"
              autoFocus
              onBlur={handleUpdateTitle}
            />
          </form>
        ) : (
          <h1 
            className="text-xl font-semibold cursor-pointer"
            onClick={() => setIsEditing(true)}
          >
            {board.boardTitle}
          </h1>
        )}
      </div>

      <Menu as="div" className="relative">
        <Menu.Button className="p-2 hover:bg-gray-100 rounded-full">
          <FiMoreHorizontal className="w-5 h-5" />
        </Menu.Button>

        <Transition
          enter="transition duration-100 ease-out"
          enterFrom="transform scale-95 opacity-0"
          enterTo="transform scale-100 opacity-100"
          leave="transition duration-75 ease-out"
          leaveFrom="transform scale-100 opacity-100"
          leaveTo="transform scale-95 opacity-0"
        >
          <Menu.Items className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg">
            <Menu.Item>
              {({ active }) => (
                <button
                  className={`${
                    active ? 'bg-gray-100' : ''
                  } flex items-center w-full px-4 py-2 text-sm`}
                  onClick={() => setIsEditing(true)}
                >
                  <FiEdit2 className="mr-2" />
                  Edit Board Title
                </button>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <button
                  className={`${
                    active ? 'bg-gray-100' : ''
                  } flex items-center w-full px-4 py-2 text-sm text-red-600`}
                  onClick={handleDeleteBoard}
                >
                  <FiTrash2 className="mr-2" />
                  Delete Board
                </button>
              )}
            </Menu.Item>
          </Menu.Items>
        </Transition>
      </Menu>
    </div>
  );
};

export default BoardHeader;
