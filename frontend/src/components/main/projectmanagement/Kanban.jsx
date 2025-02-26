import React, { useEffect, useState, memo, useCallback } from "react";
import { DragDropContext, Droppable } from 'react-beautiful-dnd';
import { useDispatch, useSelector } from "react-redux";
import { fetchLists, createList, updateList, deleteList, updateListPositions } from "../../../redux/listSlice";
import { useParams } from "react-router-dom";
import ListItem from './ListItem';
import { AnimatePresence } from "framer-motion";

function Kanban() {
  const dispatch = useDispatch();
  const { teamId } = useParams();
  const listsFromRedux = useSelector((state) => state.lists.lists);
  const { loading } = useSelector((state) => state.lists);
  
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
      dispatch(createList({ 
        title: newListTitle.trim(), 
        teamId 
      }));
      handleCloseDialog();
    }
  };

  const handleEditList = useCallback((listId, newTitle) => {
    if (newTitle?.trim()) {
      dispatch(updateList({ listId, updateData: { title: newTitle } }));
    }
  }, [dispatch]);

  const handleDeleteList = useCallback((listId) => {
    if (listId && window.confirm("Are you sure you want to delete this list?")) {
      dispatch(deleteList(listId));
    }
  }, [dispatch]);

  const onDragEnd = useCallback((result) => {
    const { destination, source } = result;

    // Validate the drag operation
    if (!destination || !lists?.length) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) return;

    const reorderedLists = Array.from(lists);
    const [removed] = reorderedLists.splice(source.index, 1);
    reorderedLists.splice(destination.index, 0, removed);

    // Update positions in sequential order
    const updatedLists = reorderedLists.map((list, index) => ({
      ...list,
      position: index
    }));

    dispatch(updateListPositions(updatedLists));
  }, [dispatch, lists]);

  return (
    <Box sx={{ mt: 15, p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Team Kanban Board
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
        >
          Add List
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <Typography>Loading...</Typography>
        </Box>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="board" direction="horizontal" type="LIST">
            {(provided, snapshot) => (
              <Box
                ref={provided.innerRef}
                {...provided.droppableProps}
                sx={{
                  display: 'flex',
                  gap: 2,
                  overflowX: 'auto',
                  minHeight: '70vh',
                  p: 1,
                  transition: 'background-color 0.2s ease',
                  backgroundColor: snapshot.isDraggingOver ? 'action.hover' : 'transparent',
                  '&::-webkit-scrollbar': {
                    height: 8,
                  },
                  '&::-webkit-scrollbar-track': {
                    backgroundColor: 'grey.100',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'grey.400',
                    borderRadius: 2,
                  },
                }}
              >
                <AnimatePresence>
                  {lists.map((list, index) => (
                    <ListItem
                      key={list._id}
                      list={list}
                      index={index}
                      onEdit={(newTitle) => handleEditList(list._id, newTitle)}
                      onDelete={() => handleDeleteList(list._id)}
                    />
                  ))}
                </AnimatePresence>
                {provided.placeholder}
              </Box>
            )}
          </Droppable>
        </DragDropContext>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Add New List</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="List Title"
            fullWidth
            value={newListTitle}
            onChange={(e) => setNewListTitle(e.target.value)}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleAddList} variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default memo(Kanban);