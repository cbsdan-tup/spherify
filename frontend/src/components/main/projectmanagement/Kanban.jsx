import React, {
  useEffect,
  useState,
  memo,
  useCallback,
  useContext,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchLists,
  createList,
  updateList,
  deleteList,
  updateListPositions,
  addOptimistic,
  deleteOptimistic,
  updateOptimistic,
} from "../../../redux/listSlice";
import { updateCardPositions, fetchCards } from "../../../redux/cardSlice";
import { useParams } from "react-router-dom";
import ListItem from "./ListItem";
import "./Kanban.css";
import { TeamConfigContext } from "../Team"; // Import TeamConfigContext
import { toast } from "react-toastify"; // Import toast for notifications

// Import dnd-kit
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  pointerWithin,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";

function Kanban({ isFull }) {
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
  const cardsByList = useSelector((state) => state.cards.cardsByList);

  // Create flat array of all card IDs for DnD context
  const allCardIds = Object.values(cardsByList)
    .flat()
    .map((card) => card._id);

  // Add permission check state
  const [hasKanbanPermission, setHasKanbanPermission] = useState(false);
  const [userRole, setUserRole] = useState(null);

  // Get team context
  const teamContext = useContext(TeamConfigContext);
  const user = useSelector((state) => state.auth.user);

  // Configure sensors for better drag detection - only enable if user has permission
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: hasKanbanPermission ? 5 : Infinity, // Disable dragging if no permission
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: hasKanbanPermission ? 100 : Infinity, // Disable touch dragging if no permission
        tolerance: 5,
      },
    })
  );

  // Check if user has permission to modify Kanban
  useEffect(() => {
    if (teamContext?.teamInfo && teamContext?.teamConfiguration && user) {
      const currentMember = teamContext.teamInfo.members.find(
        (member) =>
          member.user && member.user._id === user._id && member.leaveAt === null
      );

      if (currentMember) {
        setUserRole(currentMember.role);

        // Check permissions: leader, admin, or role in AllowedRoleToModifyKanban
        const hasPermission =
          currentMember.role === "leader" ||
          currentMember.isAdmin ||
          (
            teamContext.teamConfiguration?.AllowedRoleToModifyKanban || []
          ).includes(currentMember.role);

        setHasKanbanPermission(hasPermission);
      }
    }
  }, [teamContext, user]);

  // Always fetch data regardless of permissions
  useEffect(() => {
    dispatch(fetchLists(teamId));
  }, [dispatch, teamId]);

  // Fetch cards for all lists
  useEffect(() => {
    if (lists.length > 0) {
      lists.forEach((list) => {
        dispatch(fetchCards({ teamId, listId: list._id }));
      });
    }
  }, [dispatch, teamId, lists]);

  const handleOpenDialog = () => {
    if (!hasKanbanPermission) {
      toast.error("You don't have permission to add lists to the Kanban board");
      return;
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setNewListTitle("");
  };

  const handleAddList = (e) => {
    e.preventDefault();
    if (!hasKanbanPermission) {
      toast.error("You don't have permission to add lists to the Kanban board");
      return;
    }
    if (newListTitle.trim()) {
      // Create optimistic list with a specific temporary ID pattern
      const optimisticList = {
        _id: `temp-${Date.now()}`,
        title: newListTitle.trim(),
        teamId,
        position: lists.length * 1000,
        createdAt: new Date().toISOString(),
      };

      // Add optimistic list to UI immediately
      dispatch(addOptimistic(optimisticList));

      // Then dispatch actual API request
      dispatch(createList({ title: newListTitle.trim(), teamId }));
      handleCloseDialog();
    }
  };

  const handleEditList = useCallback(
    (listId, newTitle) => {
      if (!hasKanbanPermission) {
        toast.error("You don't have permission to edit Kanban lists");
        return false; // Return false to indicate permission denied
      }
      if (!listId || !newTitle?.trim()) return false;

      // Find the list to update
      const listToUpdate = lists.find((list) => list._id === listId);
      if (!listToUpdate) return false;

      // Create updated list with new title
      const updatedList = {
        ...listToUpdate,
        title: newTitle,
      };

      // Update UI optimistically
      dispatch(updateOptimistic(updatedList));

      // Then dispatch actual API request
      dispatch(updateList({ listId, updateData: { title: newTitle } }))
        .unwrap()
        .catch((error) => {
          console.error("Failed to update list:", error);
          dispatch(fetchLists(teamId));
        });

      return true; // Return true to indicate success
    },
    [dispatch, lists, teamId, hasKanbanPermission]
  );

  const handleDeleteList = useCallback(
    (listId) => {
      if (!hasKanbanPermission) {
        toast.error("You don't have permission to delete Kanban lists");
        return false;
      }
      if (!listId) return false;

      if (window.confirm("Are you sure you want to delete this list?")) {
        // Remove from UI immediately
        dispatch(deleteOptimistic(listId));

        // Then dispatch actual delete request
        dispatch(deleteList(listId))
          .unwrap()
          .catch((error) => {
            console.error("Failed to delete list:", error);
            dispatch(fetchLists(teamId));
          });
        return true;
      }
      return false;
    },
    [dispatch, teamId, hasKanbanPermission]
  );

  const handleDragStart = (event) => {
    // Don't allow dragging if no permission
    if (!hasKanbanPermission) {
      event.cancel();
      toast.error("You don't have permission to modify the Kanban board");
      return;
    }

    const { active } = event;
    setActiveId(active.id);

    const activeType = active.data?.current?.type;

    if (activeType === "LIST") {
      // List dragging
      const draggedList = lists.find((list) => list._id === active.id);
      setActiveList(draggedList);
    } else if (activeType === "CARD") {
      // Card dragging
      setActiveCard(active.data.current.card);
      setActiveCardListId(active.data.current.listId);
    }
  };

  const handleDragOver = (event) => {
    // Don't proceed if user doesn't have permission
    if (!hasKanbanPermission) return;

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
        const foundCard = cardsInList.find((card) => card._id === overId);
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
    // Don't process drag end if no permission
    if (!hasKanbanPermission) return;

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

        const newLists = arrayMove(lists, oldIndex, newIndex).map(
          (list, index) => ({
            ...list,
            position: index * 1000,
          })
        );

        dispatch(updateListPositions({ teamId, lists: newLists }));
      }
    } else if (activeType === "CARD") {
      // Handle card dragging
      const card = active.data.current.card;
      const sourceListId = active.data.current.listId;
      const destinationListId = activeCardListId;

      console.log(
        "Card Drop - Source:",
        sourceListId,
        "Destination:",
        destinationListId
      );

      // If source and destination are different, move the card between lists
      if (
        sourceListId &&
        destinationListId &&
        sourceListId !== destinationListId
      ) {
        const updatedCard = {
          ...card,
          listId: destinationListId,
          position: cardsByList[destinationListId]?.length
            ? cardsByList[destinationListId][
                cardsByList[destinationListId].length - 1
              ].position + 16384
            : 16384,
        };

        console.log("Moving card between lists:", updatedCard);

        dispatch(
          updateCardPositions({
            teamId,
            sourceListId,
            destinationListId,
            cards: [updatedCard],
          })
        );
      }
      // Same list reordering is handled by finding which card it was dropped on
      else if (sourceListId === destinationListId) {
        const sourceCards = cardsByList[sourceListId] || [];
        const sourceCardIndex = sourceCards.findIndex(
          (c) => c._id === card._id
        );
        const overCardIndex = sourceCards.findIndex((c) => c._id === over.id);

        // Only proceed if we have valid indices (dropped on another card)
        if (
          sourceCardIndex !== -1 &&
          overCardIndex !== -1 &&
          sourceCardIndex !== overCardIndex
        ) {
          const updatedCards = Array.from(sourceCards);
          const [movedCard] = updatedCards.splice(sourceCardIndex, 1);
          updatedCards.splice(overCardIndex, 0, movedCard);

          const cardsWithNewPositions = updatedCards.map((card, index) => ({
            ...card,
            position: index * 16384,
            listId: sourceListId,
          }));

          dispatch(
            updateCardPositions({
              teamId,
              sourceListId,
              destinationListId: sourceListId,
              cards: cardsWithNewPositions,
            })
          );
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

  // Add refresh function to refetch lists and cards
  const handleRefresh = () => {
    dispatch(fetchLists(teamId)).then(() => {
      lists.forEach((list) => {
        dispatch(fetchCards({ teamId, listId: list._id }));
      });
    });
  };

  // Create a function to pass permission status to child components
  const getPermissionProps = () => ({
    hasPermission: hasKanbanPermission,
    onPermissionDenied: () =>
      toast.error("You don't have permission to modify the Kanban board"),
  });

  return (
    <div className={`kanban-container ${isFull ? "full" : ""}`}>
      <div className="kanban-header">
        <h2 className="kanban-title" style={{ fontSize: "2rem" }}>
          TEAM KANBAN BOARD
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            className="refresh-button"
            onClick={handleRefresh}
            title="Refresh Board"
          >
            <i className="fas fa-refresh"></i>
          </button>
          {/* Only show Add List button if user has permission */}
          {hasKanbanPermission && (
            <button className="add-list-button" onClick={handleOpenDialog}>
              <span className="add-icon">+</span> Add List
            </button>
          )}
        </div>
      </div>

      {/* Add a permission notice if user doesn't have permission */}
      {!hasKanbanPermission && (
        <div className="alert alert-info mt-2 mb-3">
          <i className="fa-solid fa-info-circle me-2"></i>
          You can view the Kanban board, but you don't have permission to modify
          it.
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetectionStrategy}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="lists-container">
          <SortableContext
            items={lists.map((list) => list._id)}
            strategy={horizontalListSortingStrategy}
          >
            {lists?.length > 0 ? (
              lists.map((list) => (
                <React.Fragment key={list._id}>
                  <ListItem
                    id={list._id}
                    list={list}
                    teamId={teamId}
                    onEdit={(newTitle) => handleEditList(list._id, newTitle)}
                    onDelete={() => handleDeleteList(list._id)}
                    cards={cardsByList[list._id] || []}
                    permissionProps={getPermissionProps()} // Pass permission props to child
                  />
                </React.Fragment>
              ))
            ) : (
              <>
                <div className="alert alert-info mt-2 mb-3 w-100 text-center">
                  <i className="fa-solid fa-info-circle me-2"></i>
                  No List found
                </div>
              </>
            )}
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
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Add New List</h3>
            <form onSubmit={handleAddList}>
              <input
                className="modal-input"
                type="text"
                value={newListTitle}
                onChange={(e) => setNewListTitle(e.target.value)}
                placeholder="Enter list title"
                autoFocus
              />
              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={handleCloseDialog}
                >
                  Cancel
                </button>
                <button type="submit" className="submit-button">
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(Kanban);
