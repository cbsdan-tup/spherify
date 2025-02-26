import React, { useState, memo, useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import "./ListItem.css";

const ListItem = memo(function ListItem({ list, id, onEdit, onDelete }) {
  const [editingTitle, setEditingTitle] = useState(list.title);
  const [isEditing, setIsEditing] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id,
    data: {
      type: "LIST",
      list
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: 320,
    opacity: isDragging ? 0.4 : 1,
    flexShrink: 0
  };

  const handleEdit = useCallback((e) => {
    e.stopPropagation();
    if (editingTitle.trim() && editingTitle !== list.title) {
      onEdit(editingTitle);
    }
    setIsEditing(false);
  }, [editingTitle, list.title, onEdit]);

  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    onDelete();
  }, [onDelete]);

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleEdit(e);
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="list-item-container">
      <div className="list-card">
        <div className="list-header" {...attributes} {...listeners}>
          {isEditing ? (
            <div className="list-title-edit">
              <input
                type="text"
                className="title-input"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={handleEdit}
                onKeyPress={handleKeyPress}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          ) : (
            <div className="list-title-container">
              <div className="list-title">
                <span className="drag-handle">⋮⋮</span> {list.title}
              </div>
              <div className="list-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  className="icon-button edit-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                    setEditingTitle(list.title);
                  }}
                >
                  ✎
                </button>
                <button className="icon-button delete-button" onClick={handleDelete}>
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="list-content">
          {/* Cards will be added here later */}
        </div>
      </div>
    </div>
  );
});

export default ListItem;

