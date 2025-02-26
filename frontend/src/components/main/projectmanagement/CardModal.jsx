import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from 'axios';
import { createCard, updateCard, addOptimisticCard, deleteOptimisticCard, fetchCards } from "../../../redux/cardSlice";
import { getToken } from "../../../utils/helper";
import "./CardModal.css";

const CardModal = ({ onClose, listId, teamId, mode = "create", initialData = {} }) => {
  const [isEditing, setIsEditing] = useState(mode !== "view");
  const [cardData, setCardData] = useState({
    cardTitle: initialData.cardTitle || "",
    checklist: initialData.checklist || [],
    priority: initialData.priority || "low",
    assignedTo: initialData.assignedTo || [],
    listId,
    teamId
  });

  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [error, setError] = useState(null);
  const [members, setMembers] = useState([]);
  const dispatch = useDispatch();
  const authState = useSelector((state) => state.auth);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCardData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API}/getTeamMembers/${teamId}`, {
        headers: {
          Authorization: `Bearer ${getToken(authState)}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data && response.data.members) {
        setMembers(response.data.members);
      }
    } catch (error) {
      console.error("Error fetching team members:", error);
    }
  };

  useEffect(() => {
    if (teamId) {
      fetchTeamMembers();
    }
  }, [teamId, authState]);

  const handleAddChecklistItem = () => {
    if (newChecklistItem.trim()) {
      setCardData(prev => ({
        ...prev,
        checklist: [...prev.checklist, { item: newChecklistItem, isCompleted: false }]
      }));
      setNewChecklistItem("");
    }
  };

  const removeChecklistItem = (index) => {
    setCardData(prev => ({
      ...prev,
      checklist: prev.checklist.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Create a new object with only the necessary data
    const newCardData = {
      cardTitle: cardData.cardTitle,
      checklist: cardData.checklist,
      priority: cardData.priority,
      assignedTo: cardData.assignedTo,
      listId: cardData.listId,
      teamId: cardData.teamId
    };

    try {
      const resultAction = await dispatch(createCard(newCardData));
      if (createCard.fulfilled.match(resultAction)) {
        console.log('Card created successfully:', resultAction.payload);
        // Refresh the cards for this list
        dispatch(fetchCards({ teamId, listId }));
        onClose();
      } else {
        setError(resultAction.error.message || 'Failed to create card');
      }
    } catch (error) {
      console.error('Error creating card:', error);
      setError('Failed to create card');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const updateData = {
        cardTitle: cardData.cardTitle,
        checklist: cardData.checklist,
        priority: cardData.priority,
        assignedTo: cardData.assignedTo,
      };

      const resultAction = await dispatch(updateCard({
        cardId: initialData._id,
        updateData
      }));

      if (updateCard.fulfilled.match(resultAction)) {
        // Close the modal instead of setting isEditing to false
        onClose();
      } else {
        setError(resultAction.error.message || 'Failed to update card');
      }
    } catch (error) {
      console.error('Error updating card:', error);
      setError('Failed to update card');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this card?')) {
      try {
        await dispatch(deleteCard(initialData._id));
        onClose();
      } catch (error) {
        setError('Failed to delete card');
      }
    }
  };

  const renderViewMode = () => (
    <div className="card-view-content">
      <div className="card-header">
        <h2>{cardData.cardTitle}</h2>
        <div className="card-actions">
          <button 
            className="edit-button" 
            onClick={() => setIsEditing(true)}
          >
            Edit
          </button>
        </div>
      </div>

      <div className="card-section">
        <h4>Priority</h4>
        <div className={`priority-badge ${cardData.priority}`}>
          {cardData.priority}
        </div>
      </div>

      {cardData.checklist.length > 0 && (
        <div className="card-section">
          <h4>Checklist</h4>
          <div className="checklist-view">
            {cardData.checklist.map((item, index) => (
              <div key={index} className="checklist-item-view">
                <input
                  type="checkbox"
                  checked={item.isCompleted}
                  disabled
                />
                <span>{item.item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {cardData.assignedTo.length > 0 && (
        <div className="card-section">
          <h4>Assigned Members</h4>
          <div className="assigned-members">
            {cardData.assignedTo.map(member => (
              <div key={member._id} className="assigned-member">
                <img 
                  src={member.avatar?.url || "/images/account.png"}
                  alt={member.firstName}
                />
                <span>{member.firstName} {member.lastName}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="card-modal-overlay" onClick={onClose}>
      <div className="card-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="card-modal-header">
          <h3>{mode === "create" ? "Add New Card" : isEditing ? "Edit Card" : "Card Details"}</h3>
          <div className="modal-header-actions">
            {mode === "view" && !isEditing && (
              <>
                <button className="edit-button" onClick={() => setIsEditing(true)}>
                  Edit
                </button>
                <button className="delete-button" onClick={handleDelete}>
                  Delete
                </button>
              </>
            )}
            <button className="close-button" onClick={onClose}>×</button>
          </div>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        {isEditing ? (
          <form onSubmit={mode === "create" ? handleSubmit : handleUpdate}>
            <div className="form-group">
              <label htmlFor="cardTitle">Title *</label>
              <input
                id="cardTitle"
                name="cardTitle"
                type="text"
                value={cardData.cardTitle}
                onChange={handleChange}
                placeholder="Enter card title"
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="priority">Priority</label>
              <select
                id="priority"
                name="priority"
                value={cardData.priority}
                onChange={(e) => setCardData(prev => ({
                  ...prev,
                  priority: e.target.value
                }))}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="form-group">
              <label>Checklist</label>
              <div className="checklist-input">
                <input
                  type="text"
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  placeholder="Add a checklist item..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddChecklistItem())}
                />
                <button type="button" onClick={handleAddChecklistItem}>
                  Add
                </button>
              </div>
              <div className="checklist-items">
                {cardData.checklist.map((item, index) => (
                  <div 
                    key={index} 
                    className={`checklist-item ${item.isCompleted ? 'completed' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={item.isCompleted}
                      onChange={() => {
                        const newChecklist = cardData.checklist.map((checkItem, idx) => 
                          idx === index 
                            ? { ...checkItem, isCompleted: !checkItem.isCompleted }
                            : checkItem
                        );
                        setCardData(prev => ({ ...prev, checklist: newChecklist }));
                      }}
                    />
                    <span>{item.item}</span>
                    <button type="button" onClick={() => removeChecklistItem(index)}>×</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Assign Members</label>
              <div className="members-list">
                {members.map((member) => (
                  <div key={member.user._id} className="member-item">
                    <label className="member-label">
                      <input
                        type="checkbox"
                        checked={cardData.assignedTo.includes(member.user._id)}
                        onChange={(e) => {
                          setCardData(prev => ({
                            ...prev,
                            assignedTo: e.target.checked
                              ? [...prev.assignedTo, member.user._id]
                              : prev.assignedTo.filter(id => id !== member.user._id)
                          }));
                        }}
                      />
                      <img 
                        src={member.user.avatar?.url || "/images/account.png"}
                        alt={member.user.firstName}
                        className="member-avatar"
                      />
                      <span>{member.user.firstName} {member.user.lastName}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              {mode !== "create" && (
                <button type="button" className="cancel-button" onClick={() => setIsEditing(false)}>
                  Cancel
                </button>
              )}
              <button type="button" className="cancel-button" onClick={onClose}>
                Close
              </button>
              <button type="submit" className="submit-button">
                {mode === "create" ? "Add Card" : "Save Changes"}
              </button>
            </div>
          </form>
        ) : (
          renderViewMode()
        )}
      </div>
    </div>
  );
};

export default CardModal;
