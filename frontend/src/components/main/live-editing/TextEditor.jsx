import React, { useEffect, useState, useRef, useCallback, useMemo, memo } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { jsPDF } from 'jspdf';
import html2pdf from 'html2pdf.js';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { FONT_OPTIONS } from './Live-Editing Functionalities/quillFonts';
import './styles.css';
import { io } from 'socket.io-client';
import { useSelector } from 'react-redux';
import QuillCursors from 'quill-cursors';
import { throttle } from 'lodash';

Quill.register('modules/cursors', QuillCursors);

const TOOLBAR_OPTIONS = [
  [{ undo: 'undo' }, { redo: 'redo' }],
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ font: FONT_OPTIONS }],
  ['bold', 'italic', 'underline'],
  [{ color: [] }, { background: [] }],
  [{ align: [] }, { list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
  [{ script: 'sub' }, { script: 'super' }],
  [{ list: 'check' }],
  ['image', 'link'],
  ['clean'],
];

const SAVE_INTERVAL_MS = 2000;
const PAGE_HEIGHT = 850;

// Extract editing users component to prevent parent rerenders
const EditingUsers = memo(({ editingUsers, currentUser, getUniqueColor }) => {
  const renderUsers = () => {
    if (!editingUsers || editingUsers.length === 0) {
      return (
        <li className="no-users-editing">
          {currentUser ? (
            <div className="avatar-container" style={{ borderColor: getUniqueColor(currentUser.id || currentUser._id) }}>
              {currentUser.avatar && currentUser.avatar.url ? (
                <img 
                  src={currentUser.avatar.url} 
                  alt={`${currentUser.firstName} ${currentUser.lastName}`} 
                  className="editing-user-avatar"
                  style={{width: "36px", height: "36px"}}
                  onError={(e) => {
                    e.target.onerror = null; 
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <i className="fa-solid fa-user default-avatar"></i>
              )}
              <span className="user-name-tooltip">{currentUser.firstName} {currentUser.lastName} is editing</span>
            </div>
          ) : (
            "No users editing"
          )}
        </li>
      );
    }
    
    return editingUsers.map((user) => {
      const userId = user.id || user._id;
      const userColor = user.color || getUniqueColor(userId);
      
      return (
        <li key={userId} className="editing-user">
          <div 
            className="avatar-container" 
            style={{ borderColor: userColor }}
            title={`${user.firstName} ${user.lastName}`}
          >
            {user.avatar && user.avatar.url ? (
              <img 
                src={user.avatar.url} 
                alt={`${user.firstName} ${user.lastName}`} 
                className="editing-user-avatar"
                style={{width: "36px", height: "36px", borderRadius: "50%"}}
                onError={(e) => {
                  e.target.onerror = null; 
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
            ) : (
              <i className="fa-solid fa-user default-avatar"></i>
            )}
            <span className="user-name-tooltip">{user.firstName} {user.lastName}</span>
          </div>
        </li>
      );
    });
  };
  
  return (
    <div className="editing-users d-flex align-items-center justify-content-between">
      <h4 className='m-0'>Editing Users: ({editingUsers.length})</h4>
      <ul>{renderUsers()}</ul>
    </div>
  );
});

// Extract header buttons to prevent parent rerenders
const EditorControls = memo(({ onGeneratePDF, onInsertTable }) => {
  return (
    <div className="header-menu">
      <button onClick={onGeneratePDF} className="download-btn">
        <i className="fa fa-download"></i> Download
      </button>
      <button onClick={onInsertTable} className="download-btn">
        <i className="fa fa-table"></i> Table
      </button>
    </div>
  );
});

export default function TextEditor() {
  const { documentId } = useParams();
  // Use refs for values that don't need to trigger rerenders
  const socketRef = useRef(null);
  const quillRef = useRef(null);
  const cursorsRef = useRef(null);
  const lastFormatRef = useRef({});
  const userRef = useRef(null);
  
  // Keep minimal state that requires rerenders
  const [editingUsers, setEditingUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Use Redux selector for user data
  const user = useSelector((state) => state.auth.user);
  
  // Memoize color generator function
  const getUniqueColor = useMemo(() => {
    return (userId) => {
      if (!userId) return "#ccc";
      const colors = [
        "#FF6633", "#FFB399", "#FF33FF", "#FFFF99", "#00B3E6",
        "#E6B333", "#3366E6", "#999966", "#99FF99", "#B34D4D",
        "#80B300", "#809900", "#E6B3B3", "#6680B3", "#66991A",
        "#FF99E6", "#CCFF1A", "#FF1A66", "#E6331A", "#33FFCC",
        "#66994D", "#B366CC", "#4D8000", "#B33300", "#CC80CC",
        "#66664D", "#991AFF", "#E666FF", "#4DB3FF", "#1AB399",
        "#E666B3", "#33991A", "#CC9999", "#B3B31A", "#00E680",
        "#4D8066", "#809980", "#E6FF80", "#1AFF33", "#999933",
        "#FF3380", "#CCCC00", "#66E64D", "#4D80CC", "#9900B3",
        "#E64D66", "#4DB380", "#FF4D4D", "#99E6E6", "#6666FF"
      ];
      let hash = 5381;
      for (let i = 0; i < userId.length; i++) {
        hash = (hash * 33) ^ userId.charCodeAt(i);
      }
      const index = Math.abs(hash) % colors.length;
      return colors[index];
    };
  }, []);

  // Keep reference to user updated
  useEffect(() => {
    if (user) {
      userRef.current = user;
      setCurrentUser(user);
    }
  }, [user]);

  // Initialize socket once
  useEffect(() => {
    const s = io(`${import.meta.env.VITE_SOCKET_API}`);
    s.removeAllListeners();
    
    s.on("connect_error", (err) => {
      console.error("[SOCKET] Connection error:", err);
    });
    
    s.on("connect", () => {
      console.log("[SOCKET] Connected with ID:", s.id);
    });
    
    socketRef.current = s;
    
    return () => {
      console.log("[SOCKET] Disconnecting socket");
      s.disconnect();
    };
  }, []);

  // Combine socket event handlers to reduce effect dependencies
  useEffect(() => {
    const socket = socketRef.current;
    const quill = quillRef.current;
    
    if (!socket || !quill || !documentId) return;

    // Document loading handler
    const loadDocumentHandler = (document) => {
      quill.setContents(document);
      quill.enable();
    };

    // Text change handlers
    const receiveChangesHandler = (delta) => {
      if (!delta || typeof delta !== "object" || !delta.ops) return;
      quill.updateContents(delta, "silent");
    };

    const sendChangesHandler = (delta, oldDelta, source) => {
      if (source !== 'user') return;
      socket.emit('send-changes', delta);
    };

    // Format change handler
    const formatChangeHandler = (range, oldRange, source) => {
      if (source !== 'user' || range == null) return;
      const format = quill.getFormat(range.index);
      if (format) {
        lastFormatRef.current = format;
        socket.emit('send-format', { format, range });
      }
    };

    // Set up event listeners
    socket.once("load-document", loadDocumentHandler);
    socket.on("receive-changes", receiveChangesHandler);
    quill.on('text-change', sendChangesHandler);
    quill.on('selection-change', formatChangeHandler);

    // Request document data
    socket.emit("get-document", documentId);

    // Auto-save document
    const saveInterval = setInterval(() => {
      socket.emit('save-document', quill.getContents());
    }, SAVE_INTERVAL_MS);

    return () => {
      socket.off("load-document", loadDocumentHandler);
      socket.off("receive-changes", receiveChangesHandler);
      quill.off('text-change', sendChangesHandler);
      quill.off('selection-change', formatChangeHandler);
      clearInterval(saveInterval);
    };
  }, [documentId]);

  // Setup format preservation on enter
  useEffect(() => {
    const quill = quillRef.current;
    if (!quill) return;

    quill.keyboard.addBinding({ key: 13 }, {
      handler: function(range, context) {
        setTimeout(() => {
          const format = quill.getFormat(range.index - 1);
          if (format) {
            Object.keys(format).forEach((key) => {
              quill.format(key, format[key], 'silent');
            });
          }
        }, 0);
      }
    });
  }, []);

  // Optimize Quill editor initialization
  const wrapperRef = useCallback((wrapper) => {
    if (wrapper == null) return;
    
    wrapper.innerHTML = '';
    const editor = document.createElement('div');
    wrapper.append(editor);
    
    try {
      const q = new Quill(editor, {
        theme: 'snow',
        modules: {
          toolbar: TOOLBAR_OPTIONS,
          history: { delay: 1000, maxStack: 500, userOnly: true },
          cursors: { 
            transformOnTextChange: true,
            hideDelayMs: 15000,
            hideSpeedMs: 500,
            selectionChangeSource: null 
          },
        },
        placeholder: 'Start typing...',
      });
      
      q.disable();
      q.setText('Loading...');
      
      // Store references to avoid state updates
      quillRef.current = q;
      cursorsRef.current = q.getModule('cursors');
      
    } catch (error) {
      console.error("[QUILL] Error initializing Quill:", error);
    }
  }, []);

  // Optimize cursor management
  useEffect(() => {
    const socket = socketRef.current;
    const quill = quillRef.current;
    const cursors = cursorsRef.current;
    const user = userRef.current;
    
    if (!socket || !quill || !cursors || !user || !documentId) return;
    
    // Throttled selection change handler
    const handleSelectionChange = throttle((range) => {
      if (!range || !socket.connected) return;
      
      const userId = user._id || user.id;
      if (!userId) return;
      
      socket.emit('update-cursor-position', {
        documentId,
        userId,
        cursorPosition: range
      });
    }, 100);
    
    // Cursor update handler
    const handleCursorUpdate = (data) => {
      try {
        const { userId, range, name, color } = data;
        
        // Skip if missing data or own cursor
        if (!userId || !range || userId === (user._id || user.id)) return;
        
        // Create cursor if needed
        const userCursors = cursors.cursors();
        if (!userCursors.find(c => c.id === userId)) {
          const userName = name || 'Anonymous';
          const userColor = color || getUniqueColor(userId);
          cursors.createCursor(userId, userName, userColor);
        }
        
        // Move the cursor
        cursors.moveCursor(userId, range);
        
        // Force visibility refresh
        setTimeout(() => {
          const cursor = document.querySelector(`[data-user-id="${userId}"]`);
          if (cursor) {
            cursor.style.opacity = "1";
            cursor.style.transition = "opacity 0.5s ease";
            setTimeout(() => {
              cursor.style.opacity = "0.5"; 
            }, 5000);
          }
        }, 50);
      } catch (error) {
        console.error("[CURSORS] Error:", error);
      }
    };
    
    // Set up event listeners
    socket.on('cursor-position-updated', handleCursorUpdate);
    quill.on('selection-change', handleSelectionChange);
    
    // Initial cursor position
    setTimeout(() => {
      const range = quill.getSelection() || { index: 0, length: 0 };
      socket.emit('update-cursor-position', {
        documentId,
        userId: user._id || user.id,
        cursorPosition: range
      });
    }, 1000);
    
    return () => {
      socket.off('cursor-position-updated', handleCursorUpdate);
      quill.off('selection-change', handleSelectionChange);
      handleSelectionChange.cancel();
    };
  }, [documentId, getUniqueColor]);

  // User status updates
  useEffect(() => {
    const socket = socketRef.current;
    const user = userRef.current;
    
    if (!socket || !documentId || !user) return;
    
    // User status handler
    const userStatusHandler = (data) => {
      const { documentId: receivedDocumentId, users } = data;
      
      if (!users || receivedDocumentId !== documentId) return;
      
      // Ensure we're getting an array
      const userArray = Array.isArray(users) ? users : Object.values(users);
      
      // Map users to consistent format
      const normalizedUsers = userArray.map((u) => ({
        _id: u._id || u.id,
        id: u._id || u.id,
        firstName: u.firstName || '',
        lastName: u.lastName || '',
        avatar: u.avatar || null,
        color: u.color || getUniqueColor(u._id || u.id)
      }));
      
      setEditingUsers(normalizedUsers);
    };
    
    // Join document
    const userToSend = {
      id: user._id || user.id,
      _id: user._id || user.id,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      avatar: user.avatar || {},
      color: getUniqueColor(user._id || user.id)
    };
    
    socket.on('user-editing', userStatusHandler);
    socket.emit('join-document', documentId, userToSend);
    
    // Presence ping interval
    const pingInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('update-user-status', { documentId, user: userToSend });
      }
    }, 10000);
    
    return () => {
      socket.off('user-editing', userStatusHandler);
      clearInterval(pingInterval);
      socket.emit('leave-document', documentId, userToSend);
    };
  }, [documentId, getUniqueColor]);

  // Memoize action handlers
  const handleGeneratePDF = useCallback(() => {
    const quill = quillRef.current;
    if (!quill) return;
    
    let editorContent = quill.root.innerHTML;
    editorContent = editorContent.replace(/font-size:\s*\d+px/g, 'font-size: 12px');
    editorContent = `<style>body { font-size: 12px; }</style>${editorContent}`;
    
    const options = {
      margin: [20, 20, 20, 20],
      filename: 'document.pdf',
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };
    
    html2pdf().from(editorContent).set(options).save();
  }, []);

  const insertTable = useCallback(() => {
    const quill = quillRef.current;
    if (!quill) return;
    
    const rows = prompt('Enter number of rows:');
    const columns = prompt('Enter number of columns:');
    
    if (rows && columns) {
      const rowCount = parseInt(rows, 10);
      const colCount = parseInt(columns, 10);
      
      if (isNaN(rowCount) || isNaN(colCount)) {
        alert('Please enter valid numbers for rows and columns.');
        return;
      }
      
      let tableHTML = `<table border="1" cellpadding="5" cellspacing="0">`;
      for (let i = 0; i < rowCount; i++) {
        tableHTML += `<tr>`;
        for (let j = 0; j < colCount; j++) {
          tableHTML += `<td> </td>`;
        }
        tableHTML += `</tr>`;
      }
      tableHTML += `</table>`;
      
      const range = quill.getSelection();
      if (range) {
        quill.clipboard.dangerouslyPasteHTML(range.index, tableHTML);
      }
    }
  }, []);

  return (
    <div className="container live-editting">
      <div className="editor-header">
        <EditingUsers 
          editingUsers={editingUsers} 
          currentUser={currentUser} 
          getUniqueColor={getUniqueColor} 
        />
        <EditorControls 
          onGeneratePDF={handleGeneratePDF} 
          onInsertTable={insertTable} 
        />
      </div>
      <div className="wrapper" ref={wrapperRef}></div>
    </div>
  );
}