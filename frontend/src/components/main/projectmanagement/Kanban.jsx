import React, { useEffect, useState, memo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchLists, createList, updateList, deleteList, updateListPositions, addOptimistic, deleteOptimistic, updateOptimistic } from "../../../redux/listSlice";
import { updateCardPositions, fetchCards } from "../../../redux/cardSlice";
import { useParams } from "react-router-dom";
import ListItem from "./ListItem";
import "./Kanban.css";

// Import dnd-kit
import { DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors, DragOverlay, pointerWithin } from "@dnd-kit/core";
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
  const [activeCard, setActiveCard] = useState(null);
  const [activeCardListId, setActiveCardListId] = useState(null);
  
  // Get all cards from Redux for dragging between lists
  const cardsByList = useSelector(state => state.cards.cardsByList);
  
  // Create flat array of all card IDs for DnD context
  const allCardIds = Object.values(cardsByList).flat().map(card => card._id);

  // Configure sensors for better drag detection
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100, // Reduce delay for mobile
        tolerance: 5,
      },
    })
  );

  useEffect(() => {
    dispatch(fetchLists(teamId));
  }, [dispatch, teamId]);

  // Fetch cards for all lists
  useEffect(() => {
    if (lists.length > 0) {
      lists.forEach(list => {
        dispatch(fetchCards({ teamId, listId: list._id }));
      });
    }
  }, [dispatch, teamId, lists]);

  const handleOpenDialog = () => setOpenDialog(true);
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setNewListTitle("");
  };

  const handleAddList = (e) => {
    e.preventDefault();
    if (newListTitle.trim()) {
      // Create optimistic list with a specific temporary ID pattern
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

  const handleDragStart = (event) => {
    const { active } = event;
    setActiveId(active.id);
    
    const activeType = active.data?.current?.type;
    
    if (activeType === "LIST") {
      // List dragging
      const draggedList = lists.find(list => list._id === active.id);
      setActiveList(draggedList);
    } else if (activeType === "CARD") {
      // Card dragging
      setActiveCard(active.data.current.card);
      setActiveCardListId(active.data.current.listId);
    }
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    
    // Skip if nothing is being dragged over
    if (!active || !over) return;
    
    const activeType = active.data?.current?.type;
    
    // We only care about card dragging
    if (activeType !== "CARD") return;
    
    // Get the over element's data
    const overId = over.id;
    let overListId = null;
    
    // First, check if we're directly over a list (by checking if the over element is a list)
    if (over.data?.current?.type === "LIST") {
      overListId = over.data.current.list._id;
    }
    // If not directly over a list, check if we're over a card, then find that card's list
    else {
      // Find the card we're hovering over
      let overCard = null;
      let overCardListId = null;
      
      // Search through all cards in all lists
      Object.entries(cardsByList).forEach(([listId, cardsInList]) => {
        const foundCard = cardsInList.find(card => card._id === overId);
        if (foundCard) {
          overCard = foundCard;
          overCardListId = listId;
        }
      });
      
      // If we found the card, use its list ID
      if (overCardListId) {
        overListId = overCardListId;
      }
    }
    
    // If we identified the list we're over, and it's different from the current active card list
    if (overListId && overListId !== activeCardListId) {
      setActiveCardListId(overListId);
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    // Reset state variables
    setActiveId(null);
    setActiveList(null);
    
    if (!active || !over) {
      setActiveCard(null);
      setActiveCardListId(null);
      return;
    }

    const activeType = active.data?.current?.type;

    if (activeType === "LIST") {
      // Handle list reordering (existing code)
      if (active.id !== over.id) {
        const oldIndex = lists.findIndex((list) => list._id === active.id);
        const newIndex = lists.findIndex((list) => list._id === over.id);
        
        const newLists = arrayMove(lists, oldIndex, newIndex).map((list, index) => ({
          ...list,
          position: index * 1000
        }));
        
        dispatch(updateListPositions({ teamId, lists: newLists }));
      }
    } 
    else if (activeType === "CARD") {
      // Handle card dragging
      const card = active.data.current.card;
      const sourceListId = active.data.current.listId;
      const destinationListId = activeCardListId;
      
      console.log("Card Drop - Source:", sourceListId, "Destination:", destinationListId);
      
      // If source and destination are different, move the card between lists
      if (sourceListId && destinationListId && sourceListId !== destinationListId) {
        const updatedCard = {
          ...card,
          listId: destinationListId,
          position: cardsByList[destinationListId]?.length 
            ? (cardsByList[destinationListId][cardsByList[destinationListId].length - 1].position + 16384)
            : 16384
        };
        
        console.log("Moving card between lists:", updatedCard);
        
        dispatch(updateCardPositions({
          teamId,
          sourceListId,
          destinationListId,
          cards: [updatedCard]
        }));
      }
      // Same list reordering is handled by finding which card it was dropped on
      else if (sourceListId === destinationListId) {
        const sourceCards = cardsByList[sourceListId] || [];
        const sourceCardIndex = sourceCards.findIndex(c => c._id === card._id);
        const overCardIndex = sourceCards.findIndex(c => c._id === over.id);
        
        // Only proceed if we have valid indices (dropped on another card)
        if (sourceCardIndex !== -1 && overCardIndex !== -1 && sourceCardIndex !== overCardIndex) {
          const updatedCards = Array.from(sourceCards);
          const [movedCard] = updatedCards.splice(sourceCardIndex, 1);
          updatedCards.splice(overCardIndex, 0, movedCard);
          
          const cardsWithNewPositions = updatedCards.map((card, index) => ({
            ...card,
            position: index * 16384,
            listId: sourceListId
          }));
          
          dispatch(updateCardPositions({
            teamId,
            sourceListId,
            destinationListId: sourceListId,
            cards: cardsWithNewPositions
          }));
        }
      }
    }
    
    setActiveCard(null);
    setActiveCardListId(null);
  };

  const collisionDetectionStrategy = (args) => {
    const pointerIntersections = pointerWithin(args);
    if (pointerIntersections.length > 0) {
      return pointerIntersections;
    }
    return closestCenter(args);
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
        collisionDetection={collisionDetectionStrategy}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="lists-container">
          <SortableContext 
            items={lists.map(list => list._id)}
            strategy={horizontalListSortingStrategy}
          >
            {lists.map((list) => (
              <React.Fragment key={list._id}>
                <ListItem
                  id={list._id}
                  list={list}
                  teamId={teamId}
                  onEdit={(newTitle) => handleEditList(list._id, newTitle)}
                  onDelete={() => handleDeleteList(list._id)}
                  cards={cardsByList[list._id] || []}
                />
              </React.Fragment>
            ))}
          </SortableContext>
        </div>
        
        <DragOverlay adjustScale={true}>
          {activeId && activeList ? (
            <div className="list-drag-preview">
              <div className="list-drag-header">{activeList.title}</div>
            </div>
          ) : activeId && activeCard ? (
            <div className="card-drag-preview">
              <div className="card-preview-content">{activeCard.cardTitle}</div>
              <div className="card-preview-priority">
                <span className={`priority-tag ${activeCard.priority}`}>
                  {activeCard.priority}
                </span>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {openDialog && (
        <div className="kanban-card modal-overlay" onClick={handleCloseDialog}>
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