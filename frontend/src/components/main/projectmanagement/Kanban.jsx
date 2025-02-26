import React, { useEffect, useState, memo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchLists, createList, updateList, deleteList, updateListPositions } from "../../../redux/listSlice";
import { useParams } from "react-router-dom";
import ListItem from "./ListItem";
import "./Kanban.css"; // We'll create this CSS file

// Import dnd-kit
import { DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy } from "@dnd-kit/sortable";

function Kanban() {
  const dispatch = useDispatch();
  const { teamId } = useParams();
  const listsFromRedux = useSelector((state) => state.lists.lists);
  const lists = Array.isArray(listsFromRedux) ? listsFromRedux : [];
  const [newListTitle, setNewListTitle] = useState("");
  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    dispatch(fetchLists(teamId));
  }, [dispatch, teamId]);

  const handleOpenDialog = () => setOpenDialog(true);
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setNewListTitle("");
  };

  const handleAddList = () => {
    if (newListTitle.trim()) {
      dispatch(createList({ title: newListTitle.trim(), teamId }));
      handleCloseDialog();
    }
  };

  const handleEditList = useCallback((listId, newTitle) => {
    if (!listId || !newTitle?.trim()) return;
    
    dispatch(updateList({ listId, updateData: { title: newTitle } }))
      .unwrap()
      .catch(error => {
        console.error('Failed to update list:', error);
        dispatch(fetchLists(teamId));
      });
  }, [dispatch, teamId]);

  const handleDeleteList = useCallback((listId) => {
    if (!listId) return;
    
    if (window.confirm("Are you sure you want to delete this list?")) {
      dispatch(deleteList(listId))
        .unwrap()
        .catch(error => {
          console.error('Failed to delete list:', error);
          dispatch(fetchLists(teamId));
        });
    }
  }, [dispatch, teamId]);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = lists.findIndex((list) => list._id === active.id);
    const newIndex = lists.findIndex((list) => list._id === over.id);
    
    const newLists = arrayMove(lists, oldIndex, newIndex);
    dispatch(updateListPositions({ teamId, lists: newLists }))
      .unwrap()
      .catch(() => {
        dispatch(fetchLists(teamId));
      });
  };

  return (
    <div className="kanban-container">
      <div className="kanban-header">
        <h1 className="kanban-title">Team Kanban Board</h1>
        <button className="add-list-button" onClick={handleOpenDialog}>
          + Add List
        </button>
      </div>

      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={lists.map(list => list._id)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="lists-container">
            {lists.map((list) => (
              <ListItem
                key={list._id}
                id={list._id}
                list={list}
                onEdit={(newTitle) => handleEditList(list._id, newTitle)}
                onDelete={() => handleDeleteList(list._id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {openDialog && (
        <div className="modal-overlay" onClick={handleCloseDialog}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Add New List</h2>
            <input
              type="text"
              className="modal-input"
              placeholder="List Title"
              value={newListTitle}
              onChange={(e) => setNewListTitle(e.target.value)}
              autoFocus
            />
            <div className="modal-actions">
              <button className="cancel-button" onClick={handleCloseDialog}>Cancel</button>
              <button className="submit-button" onClick={handleAddList}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(Kanban);
