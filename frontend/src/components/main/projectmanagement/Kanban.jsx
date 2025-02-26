import React, { useEffect, useState, memo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchLists, createList, updateList, deleteList, updateListPositions, addOptimistic, deleteOptimistic, updateOptimistic } from "../../../redux/listSlice";
import { useParams } from "react-router-dom";
import ListItem from "./ListItem";
import "./Kanban.css";

// Import dnd-kit
import { DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors, DragOverlay } from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy } from "@dnd-kit/sortable";

function Kanban({isFull}) {
  const dispatch = useDispatch();
  const { teamId } = useParams();
  const listsFromRedux = useSelector((state) => state.lists.lists);
  const lists = Array.isArray(listsFromRedux) ? listsFromRedux : [];
  const [newListTitle, setNewListTitle] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [activeList, setActiveList] = useState(null);

  useEffect(() => {
    console.log("kanban");
  }, []);

  useEffect(() => {
    dispatch(fetchLists(teamId));
  }, [dispatch, teamId]);

  const handleOpenDialog = () => setOpenDialog(true);
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setNewListTitle("");
  };

  const handleAddList = (e) => {
    e.preventDefault();
    if (newListTitle.trim()) {
      // Create optimistic list
      const optimisticList = {
        _id: `temp-${Date.now()}`,
        title: newListTitle.trim(),
        teamId,
        position: lists.length * 1000,
        createdAt: new Date().toISOString()
      };
      
      // Add optimistic list to UI immediately
      dispatch(addOptimistic(optimisticList));
      
      // Then dispatch actual API request
      dispatch(createList({ title: newListTitle.trim(), teamId }));
      handleCloseDialog();
    }
  };

  const handleEditList = useCallback((listId, newTitle) => {
    if (!listId || !newTitle?.trim()) return;
    
    // Find the list to update
    const listToUpdate = lists.find(list => list._id === listId);
    if (!listToUpdate) return;
    
    // Create updated list with new title
    const updatedList = {
      ...listToUpdate,
      title: newTitle
    };
    
    // Update UI optimistically
    dispatch(updateOptimistic(updatedList));
    
    // Then dispatch actual API request
    dispatch(updateList({ listId, updateData: { title: newTitle } }))
      .unwrap()
      .catch(error => {
        console.error('Failed to update list:', error);
        dispatch(fetchLists(teamId));
      });
  }, [dispatch, lists, teamId]);

  const handleDeleteList = useCallback((listId) => {
    if (!listId) return;
    
    if (window.confirm("Are you sure you want to delete this list?")) {
      // Remove from UI immediately
      dispatch(deleteOptimistic(listId));
      
      // Then dispatch actual delete request
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
        distance: 5, // Reduce the distance required to start dragging
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100, // Reduce delay for mobile
        tolerance: 5,
      },
    })
  );

  const handleDragStart = (event) => {
    const { active } = event;
    setActiveId(active.id);
    
    // Find the list being dragged
    const draggedList = lists.find(list => list._id === active.id);
    setActiveList(draggedList);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveList(null);
    
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = lists.findIndex((list) => list._id === active.id);
    const newIndex = lists.findIndex((list) => list._id === over.id);
    
    // Create a new array with updated positions
    const newLists = arrayMove(lists, oldIndex, newIndex).map((list, index) => ({
      ...list,
      position: index * 1000
    }));
    
    // Update UI optimistically
    newLists.forEach(list => {
      dispatch(updateOptimistic(list));
    });
    
    // Then dispatch actual API request
    dispatch(updateListPositions({ teamId, lists: newLists }))
      .unwrap()
      .catch(() => {
        dispatch(fetchLists(teamId));
      });
  };

  return (
    <div className={`kanban-container ${isFull ? "full" : ""}`}>
      <div className="kanban-header">
        <h1 className="kanban-title">Team Kanban Board</h1>
        <button className="add-list-button" onClick={handleOpenDialog}>
          <span className="add-icon">+</span> Add List
        </button>
      </div>

      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="lists-container">
          <SortableContext 
            items={lists.map(list => list._id)}
            strategy={horizontalListSortingStrategy}
          >
            {lists.map((list) => (
              <ListItem
                key={list._id}
                id={list._id}
                list={list}
                onEdit={(newTitle) => handleEditList(list._id, newTitle)}
                onDelete={() => handleDeleteList(list._id)}
              />
            ))}
          </SortableContext>
        </div>
        
        <DragOverlay>
          {activeId && activeList ? (
            <div className="drag-overlay">
              <div className="drag-overlay-header">{activeList.title}</div>
              <div className="drag-overlay-content"></div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {openDialog && (
        <div className="modal-overlay" onClick={handleCloseDialog}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Add New List</h3>
            <form onSubmit={handleAddList}>
              <input 
                className="modal-input" 
                type="text" 
                value={newListTitle} 
                onChange={e => setNewListTitle(e.target.value)} 
                placeholder="Enter list title"
                autoFocus
              />
              <div className="modal-actions">
                <button type="button" className="cancel-button" onClick={handleCloseDialog}>Cancel</button>
                <button type="submit" className="submit-button">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(Kanban);