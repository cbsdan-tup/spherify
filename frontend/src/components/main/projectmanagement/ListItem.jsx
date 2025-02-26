import React, { useState, memo, useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import "./ListItem.css"; // We'll create this CSS file

const ListItem = memo(function ListItem({ list, id, onEdit, onDelete }) {
  const [editingTitle, setEditingTitle] = useState(list.title);
  const [isEditing, setIsEditing] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: 320,
    minHeight: 100,
    cursor: "grab",
    flexShrink: 0,
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
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="list-item-container">
      <div className="list-card">
        <div className="list-header">
          {isEditing ? (
            <div className="list-title-edit">
              <input
                type="text"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={handleEdit}
                onKeyPress={handleKeyPress}
                autoFocus
                className="title-input"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          ) : (
            <div className="list-title-container">
              <h3 className="list-title">{list.title}</h3>
              <div className="list-actions" onClick={(e) => e.stopPropagation()}>
                <button 
                  className="icon-button edit-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                    setEditingTitle(list.title);
                  }}
                >
                  ✏️
                </button>
                <button className="icon-button delete-button" onClick={handleDelete}>
                  🗑️
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
