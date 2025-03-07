import React from 'react';
import { Modal, Badge } from 'react-bootstrap';
import moment from 'moment';
import './FileHistoryModal.css';

const FileHistoryModal = ({ isOpen, onClose, item }) => {
  if (!item) return null;

  const getActionColor = (action) => {
    switch (action) {
      case 'created': return 'success';
      case 'renamed': return 'primary';
      case 'moved': return 'info';
      case 'edited': return 'warning';
      case 'deleted': return 'danger';
      case 'restored': return 'secondary';
      default: return 'dark';
    }
  };

  const formatActionText = (action) => {
    switch(action) {
      case 'created': return 'Created';
      case 'renamed': return 'Renamed';
      case 'moved': return 'Moved';
      case 'edited': return 'Edited';
      case 'deleted': return 'Moved to trash';
      case 'restored': return 'Restored';
      default: return action;
    }
  };
  
  // Get all history entries plus creation event if not in history
  const allHistoryEvents = [];
  
  // Add creation event if not found in history
  if (!item.history?.some(entry => entry.action === 'created')) {
    allHistoryEvents.push({
      action: 'created',
      timestamp: item.createdAt,
      performedBy: item.owner,
      details: {
        comment: `${item.type === 'folder' ? 'Folder' : 'File'} created`
      }
    });
  }
  
  // Add all history entries
  if (item.history && item.history.length > 0) {
    allHistoryEvents.push(...item.history);
  }
  
  // Sort by timestamp (newest first)
  const sortedHistory = allHistoryEvents.sort((a, b) => 
    new Date(b.timestamp) - new Date(a.timestamp)
  );

  return (
    <Modal 
      show={isOpen} 
      onHide={onClose}
      className="file-history-modal"
      size="lg"
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title style={{gap: "1rem"}}>
          <i className={item.type === 'folder' ? 'fa-solid fa-folder me-2' : 'fa-solid fa-file me-2'}></i>
          History of {item.name}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {sortedHistory.length === 0 ? (
          <p className="text-center">No history available</p>
        ) : (
          <div className="history-timeline">
            {sortedHistory.map((entry, index) => (
              <div key={index} className="timeline-item">
                <div className="timeline-icon">
                  <Badge bg={getActionColor(entry.action)} className="action-badge">
                    <i className={`fa-solid ${
                      entry.action === 'created' ? 'fa-plus' :
                      entry.action === 'renamed' ? 'fa-pencil' :
                      entry.action === 'moved' ? 'fa-arrows-up-down-left-right' :
                      entry.action === 'edited' ? 'fa-pen-to-square' :
                      entry.action === 'deleted' ? 'fa-trash' : 'fa-arrow-rotate-left'
                    }`}></i>
                  </Badge>
                </div>
                <div className="timeline-content">
                  <div className="timeline-header">
                    <span className="action-type">
                      <strong>{formatActionText(entry.action)}</strong>
                    </span>
                    <span className="timestamp">
                      {moment(entry.timestamp).format('MMM D, YYYY [at] h:mm A')}
                    </span>
                  </div>
                  <div className="timeline-body">
                    {entry.performedBy && (
                      <div className="user-info">
                        {entry.performedBy.avatar.url && (
                          <img 
                            src={entry.performedBy.avatar.url} 
                            alt="User avatar" 
                            className="user-avatar"
                          />
                        )}
                        <span>
                          {entry.performedBy.firstName} {entry.performedBy.lastName}
                        </span>
                      </div>
                    )}
                    
                    {entry.details?.comment && (
                      <div className="comment">{entry.details.comment}</div>
                    )}
                    
                    {entry.action === 'renamed' && entry.details?.previousName && (
                      <div className="detail-item">
                        <span className="detail-label">Previous name:</span> 
                        <span className="detail-value">{entry.details.previousName}</span>
                      </div>
                    )}
                    {entry.action === 'renamed' && entry.details?.newName && (
                      <div className="detail-item">
                        <span className="detail-label">New name:</span> 
                        <span className="detail-value">{entry.details.newName}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default FileHistoryModal;
