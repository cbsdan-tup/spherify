import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Draggable } from 'react-beautiful-dnd';
import { Menu, Transition } from '@headlessui/react';
import { FiMoreHorizontal, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { updateCard, deleteCard } from '../../../../redux/cardSlice';

const Card = ({ card, index, isDragging }) => {
  const dispatch = useDispatch();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(card.cardTitle);

  const handleUpdateTitle = async (e) => {
    e.preventDefault();
    if (title.trim() && title !== card.cardTitle) {
      await dispatch(updateCard({
        cardId: card._id,
        cardData: { cardTitle: title }
      }));
    }
    setIsEditing(false);
  };

  const handleDeleteCard = async () => {
    if (window.confirm('Are you sure you want to delete this card?')) {
      await dispatch(deleteCard(card._id));
    }
  };

  return (
    <Draggable draggableId={card._id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`
            mb-2 p-3 bg-white rounded-lg shadow
            ${snapshot.isDragging ? 'shadow-lg' : ''}
            ${isDragging ? 'opacity-100' : ''}
          `}
        >
          <div className="flex items-start justify-between gap-2">
            {isEditing ? (
              <form onSubmit={handleUpdateTitle} className="flex-1">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-2 py-1 border rounded text-sm"
                  autoFocus
                  onBlur={handleUpdateTitle}
                />
              </form>
            ) : (
              <div
                className="flex-1 text-sm cursor-pointer"
                onClick={() => setIsEditing(true)}
              >
                {card.cardTitle}
              </div>
            )}

            <Menu as="div" className="relative">
              <Menu.Button className="p-1 hover:bg-gray-100 rounded">
                <FiMoreHorizontal className="w-4 h-4" />
              </Menu.Button>

              <Transition
                enter="transition duration-100 ease-out"
                enterFrom="transform scale-95 opacity-0"
                enterTo="transform scale-100 opacity-100"
                leave="transition duration-75 ease-out"
                leaveFrom="transform scale-100 opacity-100"
                leaveTo="transform scale-95 opacity-0"
              >
                <Menu.Items className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        className={`${
                          active ? 'bg-gray-100' : ''
                        } flex items-center w-full px-4 py-2 text-sm`}
                        onClick={() => setIsEditing(true)}
                      >
                        <FiEdit2 className="mr-2" />
                        Edit Card Title
                      </button>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        className={`${
                          active ? 'bg-gray-100' : ''
                        } flex items-center w-full px-4 py-2 text-sm text-red-600`}
                        onClick={handleDeleteCard}
                      >
                        <FiTrash2 className="mr-2" />
                        Delete Card
                      </button>
                    )}
                  </Menu.Item>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>

          {card.assignedTo && (
            <div className="mt-2 flex items-center gap-1">
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                {card.assignedTo.firstName[0]}
                {card.assignedTo.lastName[0]}
              </div>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
};

export default Card;
