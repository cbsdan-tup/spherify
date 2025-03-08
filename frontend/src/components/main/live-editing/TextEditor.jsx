import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
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
const PAGE_HEIGHT = 850; // Arbitrary page height in pixels (adjust as needed)

export default function TextEditor() {
  const { documentId } = useParams(); 
  const [socket, setSocket] = useState(null);
  const [quill, setQuill] = useState(null);
  const [lastFormat, setLastFormat] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [editingUsers, setEditingUsers] = useState([]);
  const currentUserRef = useRef(currentUser);
  const [cursors, setCursors] = useState(null);
  const user = useSelector((state) => state.auth.user);
  

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

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

  useEffect(() => {
    const s = io(`${import.meta.env.VITE_SOCKET_API}`);
    s.removeAllListeners();
    console.log("[SOCKET] Connecting to server at:", import.meta.env.VITE_SOCKET_API);
    setSocket(s);
    
    // Add generic error handler
    s.on("connect_error", (err) => {
      console.error("[SOCKET] Connection error:", err);
    });
    
    s.on("connect", () => {
      console.log("[SOCKET] Connected with ID:", s.id);
    });
    
    return () => {
      console.log("[SOCKET] Disconnecting socket");
      s.disconnect();
    };
  }, []);

  useEffect(() => {
    if (socket == null || quill == null) return;

    const textHandler = (delta) => {
      if (!quill || !delta || typeof delta !== "object" || !delta.ops) return;
      quill.updateContents(delta, "silent");
    };

    socket.off("receive-changes", textHandler);
    socket.on("receive-changes", textHandler);

    return () => socket.off("receive-changes", textHandler);
  }, [socket, quill]);

  useEffect(() => {
    if (socket == null || quill == null) return;

    const loadDocumentHandler = (document) => {
      quill.setContents(document);
      quill.enable();
    };

    socket.off("load-document", loadDocumentHandler);
    socket.once("load-document", loadDocumentHandler);
    socket.emit("get-document", documentId);

    return () => socket.off("load-document", loadDocumentHandler);
  }, [socket, quill, documentId]);

  useEffect(() => {
    if (socket == null || quill == null) return;

    const interval = setInterval(() => {
      socket.emit('save-document', quill.getContents());
    }, SAVE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [socket, quill]);

  useEffect(() => {
    if (socket == null || quill == null) return;

    const textChangeHandler = (delta, oldDelta, source) => {
      if (source !== 'user') return;
      socket.emit('send-changes', delta);
    };

    const formatChangeHandler = (range, oldRange, source) => {
      if (source !== 'user' || range == null) return;
      const format = quill.getFormat(range.index);
      if (format) {
        setLastFormat(format);
        socket.emit('send-format', { format, range });
      }
    };

    quill.on('text-change', textChangeHandler);
    quill.on('selection-change', formatChangeHandler);

    return () => {
      quill.off('text-change', textChangeHandler);
      quill.off('selection-change', formatChangeHandler);
    };
  }, [socket, quill]);

  useEffect(() => {
    if (quill == null) return;

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
  }, [quill, lastFormat]);

  // IMPROVED cursor initialization and tracking
  const wrapperRef = useCallback((wrapper) => {
    if (wrapper == null) return;
    console.log("[QUILL] Initializing editor");
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
            hideDelayMs: 15000, // Increased to 15 seconds for better visibility
            hideSpeedMs: 500,   // Slower fade for better visibility
            selectionChangeSource: null 
          },
        },
        placeholder: 'Start typing...',
      });
      
      q.disable();
      q.setText('Loading...');
      setQuill(q);
      
      // Initialize the cursors module
      const cursorsModule = q.getModule('cursors');
      if (!cursorsModule) {
        console.error("[CURSORS] Failed to get cursors module!");
      } else {
        console.log("[CURSORS] Cursors module initialized:", cursorsModule);
        setCursors(cursorsModule);
      }
    } catch (error) {
      console.error("[QUILL] Error initializing Quill:", error);
    }
  }, []);

  // SIMPLIFIED cursor update handler - for better reliability
  useEffect(() => {
    if (!socket || !quill || !cursors || !user) return;
  
    console.log("[CURSORS+SELECTION] Setting up simplified handlers");
    
    // Single handler for cursor updates
    const handleCursorUpdate = (data) => {
      try {
        console.log("[CURSORS] Received cursor update:", data);
        const { userId, range, name, color } = data;
        
        // Skip if missing data or own cursor
        if (!userId || !range) return;
        if (userId === user._id || userId === user.id) return;
        
        // Create cursor if needed
        const userCursors = cursors.cursors();
        if (!userCursors.find(c => c.id === userId)) {
          const userName = name || 'Anonymous';
          const userColor = color || getUniqueColor(userId);
          console.log(`[CURSORS] Creating new cursor: ${userName} (${userId}) with color ${userColor}`);
          cursors.createCursor(userId, userName, userColor);
        }
        
        // Move the cursor
        console.log(`[CURSORS] Moving cursor for user ${userId}`);
        cursors.moveCursor(userId, range);
        
        // Force visibility refresh (workaround for QuillCursors bug)
        setTimeout(() => {
          const cursor = document.querySelector(`[data-user-id="${userId}"]`);
          if (cursor) {
            cursor.style.opacity = "1";
            cursor.style.transition = "opacity 0.5s ease";
            // Re-hide after delay if needed
            setTimeout(() => {
              cursor.style.opacity = "0.5"; 
            }, 5000);
          }
        }, 50);
      } catch (error) {
        console.error("[CURSORS] Error in handleCursorUpdate:", error);
      }
    };
    
    // Simplified selection change handler
    const handleSelectionChange = throttle((range) => {
      if (!range) return;
      
      const userId = user._id || user.id;
      if (!userId) return;
      
      console.log(`[CURSOR] Sending my cursor position:`, range);
      socket.emit('update-cursor-position', {
        documentId,
        userId,
        cursorPosition: range
      });
    }, 100);
    
    // Set up event listeners
    socket.on('cursor-position-updated', handleCursorUpdate);
    quill.on('selection-change', handleSelectionChange);
    
    // Force initial cursor broadcast
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
  }, [socket, quill, cursors, user, documentId, getUniqueColor]);

  // IMPROVED user editing status handler with debug
  useEffect(() => {
    if (!socket || !documentId) return;
  
    const userStatusHandler = (data) => {
      console.log("[USERS] Received user-editing data:", data);
      const { documentId: receivedDocumentId, users } = data;
      
      if (!users || receivedDocumentId !== documentId) {
        console.log("[USERS] Ignored user-editing data - document ID mismatch or no users");
        return;
      }
  
      console.log("[USERS] Processing users:", users);
      console.log("[USERS] Current user:", user);
      
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
      
      console.log("[USERS] Normalized users:", normalizedUsers);
      setEditingUsers(normalizedUsers);
    };
  
    // Listen for user editing updates
    socket.off('user-editing');
    socket.on('user-editing', userStatusHandler);
    
    return () => {
      socket.off('user-editing', userStatusHandler);
    };
  }, [socket, documentId, getUniqueColor, user]);
  
  // IMPROVED document joining
  useEffect(() => {
    if (!socket || !documentId || !user) return;

    console.log("[JOIN] Joining document with user:", user);
    
    // Create a complete user object with all required fields
    const userToSend = {
      id: user._id || user.id,
      _id: user._id || user.id,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      avatar: user.avatar || {},
      color: getUniqueColor(user._id || user.id)
    };
    
    // Join the document with this user info
    socket.emit('join-document', documentId, userToSend);
    
    // Force updates after short delay
    setTimeout(() => {
      console.log("[JOIN] Sending refresh signals");
      
      // 1. Update user status
      socket.emit('update-user-status', { documentId, user: userToSend });
      
      // 2. Send cursor position
      const range = quill?.getSelection() || { index: 0, length: 0 };
      socket.emit('update-cursor-position', {
        documentId,
        userId: userToSend.id,
        cursorPosition: range
      });
    }, 1000);
    
    // Set up debug ping to keep user in the editing list
    const pingInterval = setInterval(() => {
      socket.emit('update-user-status', { documentId, user: userToSend });
    }, 10000);
    
    return () => {
      clearInterval(pingInterval);
      console.log("[JOIN] Leaving document:", documentId);
      socket.emit('leave-document', documentId, userToSend);
    };
  }, [socket, documentId, user, getUniqueColor, quill]);
  
  // Improved rendering of editing users
  const renderEditingUsers = () => {
    console.log("[RENDER] Rendering editing users:", editingUsers);
    
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
      console.log(`[RENDER] Rendering user: ${user.firstName} ${user.lastName} (${userId}) with color ${userColor}`);
      
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
                  console.log("[IMAGE] Avatar loading error");
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

  useEffect(() => {
    if (user) {
      console.log("[USER] Setting current user from Redux:", user);
      setCurrentUser(user);
      currentUserRef.current = user;
    }
  }, [user]);

  const handleGeneratePDFHtml2Pdf = () => {
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
  };

  const insertDynamicTable = () => {
    if (quill) {
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
    }
  };

  // Updated render with debugging info
  return (
    <div className="container live-editting">
      <div className="editor-header">
        <div className="editing-users d-flex align-items-center justify-content-between">
          <h4 className='m-0'>Editing Users: ({editingUsers.length})</h4>
          <ul>
            {renderEditingUsers()}
          </ul>
        </div>

        <div className="header-menu">
          <button onClick={handleGeneratePDFHtml2Pdf} className="download-btn">
            <i className="fa fa-download"></i> Download
          </button>
          <button onClick={insertDynamicTable} className="download-btn">
            <i className="fa fa-table"></i> Table
          </button>
        </div>
      </div>
      <div className="wrapper" ref={wrapperRef}></div>
    </div>
  );
}