import React, { useState } from 'react';
import { Draggable, Droppable } from 'react-beautiful-dnd';
import { useDispatch } from 'react-redux';
import { updateList, deleteList } from '../../../../redux/listSlice';
import { FiMoreHorizontal, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { Menu, Transition } from '@headlessui/react';
import Card from '../card/Card';
import AddCard from '../card/AddCard';

const List = ({ list, index, cards, isDragging }) => {
  const dispatch = useDispatch();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(list.listTitle);

  const handleUpdateTitle = async (e) => {
    e.preventDefault();
    if (title.trim() && title !== list.listTitle) {
      await dispatch(updateList({
        listId: list._id,
        updateData: { listTitle: title }
      }));
    }
    setIsEditing(false);
  };

  const handleDeleteList = async () => {
    if (window.confirm('Are you sure you want to delete this list?')) {
      await dispatch(deleteList(list._id));
    }
  };

  const sortedCards = [...cards].sort((a, b) => a.position - b.position);

  return (
    <Draggable draggableId={list._id} index={index}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className="w-72 flex-shrink-0"
        >
          <div className="bg-gray-100 rounded-lg shadow">
            <div 
              {...provided.dragHandleProps}
              className="p-3 flex items-center justify-between"
            >
              {isEditing ? (
                <form onSubmit={handleUpdateTitle} className="flex-1">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-2 py-1 border rounded"
                    autoFocus
                    onBlur={handleUpdateTitle}
                  />
                </form>
              ) : (
                <h3 
                  className="font-medium cursor-pointer"
                  onClick={() => setIsEditing(true)}
                >
                  {list.listTitle}
                </h3>
              )}

              <Menu as="div" className="relative">
                <Menu.Button className="p-1 hover:bg-gray-200 rounded">
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
                          Edit List Title
                        </button>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          className={`${
                            active ? 'bg-gray-100' : ''
                          } flex items-center w-full px-4 py-2 text-sm text-red-600`}
                          onClick={handleDeleteList}
                        >
                          <FiTrash2 className="mr-2" />
                          Delete List
                        </button>
                      )}
                    </Menu.Item>
                  </Menu.Items>
                </Transition>
              </Menu>
            </div>

            <Droppable droppableId={list._id} type="card">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`p-2 min-h-[2rem] ${
                    snapshot.isDraggingOver ? 'bg-gray-200' : ''
                  }`}
                >
                  {sortedCards.map((card, index) => (
                    <Card
                      key={card._id}
                      card={card}
                      index={index}
                      isDragging={isDragging}
                    />
                  ))}
                  {provided.placeholder}
                  <AddCard listId={list._id} />
                </div>
              )}
            </Droppable>
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default List;
