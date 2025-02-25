import React, { useState, memo } from 'react';
import { motion } from "framer-motion";
import { Draggable } from 'react-beautiful-dnd';
import {
  TextField,
  IconButton,
  Card,
  CardHeader,
  CardContent,
  Box,
} from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon } from "@mui/icons-material";

const ListItem = memo(function ListItem({ list, index, onEdit, onDelete }) {
  const [editingTitle, setEditingTitle] = useState(list.title);
  const [isEditing, setIsEditing] = useState(false);
  
  const handleEdit = () => {
    onEdit(editingTitle);
    setIsEditing(false);
  };

  return (
    <Draggable draggableId={String(list._id)} index={index}>
      {(provided, snapshot) => (
        <motion.div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          initial={{ opacity: 0, x: -20 }}
          animate={{ 
            opacity: 1, 
            x: 0,
            scale: snapshot.isDragging ? 1.02 : 1,
            rotate: snapshot.isDragging ? 2 : 0
          }}
          exit={{ opacity: 0, x: 20 }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30
          }}
          style={{
            ...provided.draggableProps.style,
          }}
        >
          <Card
            sx={{
              width: 300,
              minHeight: 100,
              '& .MuiCardHeader-root': {
                borderBottom: 1,
                borderColor: 'divider',
              },
              backgroundColor: snapshot.isDragging 
                ? 'rgba(200, 200, 200, 0.2)' 
                : 'background.paper',
              transform: snapshot.isDragging ? 'rotate(2deg)' : 'none',
            }}
          >
            {isEditing ? (
              <CardHeader
                title={
                  <TextField
                    fullWidth
                    size="small"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={handleEdit}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleEdit();
                      }
                    }}
                    autoFocus
                  />
                }
              />
            ) : (
              <CardHeader
                title={list.title}
                action={
                  <Box>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setIsEditing(true);
                        setEditingTitle(list.title);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={onDelete}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                }
              />
            )}
            <CardContent>
              {/* Cards will be added here later */}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </Draggable>
  );
});

export default ListItem;
