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
    setSocket(s);
    return () => s.disconnect();
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

  const wrapperRef = useCallback((wrapper) => {
    if (wrapper == null) return;
    wrapper.innerHTML = '';
    const editor = document.createElement('div');
    wrapper.append(editor);
    const q = new Quill(editor, {
      theme: 'snow',
      modules: {
        toolbar: TOOLBAR_OPTIONS,
        history: { delay: 1000, maxStack: 500, userOnly: true },
        cursors: { transformOnTextChange: true },
      },
    });
    q.disable();
    q.setText('Loading...');
    setQuill(q);
    const cursorsModule = q.getModule('cursors');
    setCursors(cursorsModule);
  }, []);

  useEffect(() => {
    if (!socket || !cursors) return;
  
    const handleCursorUpdate = (data) => {
      const { userId, range, name, color } = data;
      if (!cursors.cursors().find((cursor) => cursor.id === userId)) {
        cursors.createCursor(userId, name, color);
      }
      cursors.moveCursor(userId, range);
    };
  
    socket.on('cursor-position-updated', handleCursorUpdate);
    return () => socket.off('cursor-position-updated', handleCursorUpdate);
  }, [socket, cursors]);

  useEffect(() => {
    if (!socket || !quill || !currentUserRef.current) return;

    const handleSelectionChange = throttle((range) => {
      if (range) {
        const { id, firstName, lastName } = currentUserRef.current;
        const color = getUniqueColor(id);
        socket.emit('update-cursor-position', {
          documentId,
          userId: id,
          cursorPosition: { index: range.index, length: range.length },
        });
      }
    }, 100);

    quill.on('selection-change', handleSelectionChange);
    return () => {
      quill.off('selection-change', handleSelectionChange);
      handleSelectionChange.cancel();
    };
  }, [socket, quill, documentId, currentUserRef, getUniqueColor]);

  useEffect(() => {
    if (!socket || !cursors) return;
  
    const handleUserDisconnected = (userId) => {
      cursors.removeCursor(userId);
    };
  
    socket.on('user-disconnected', handleUserDisconnected);
    return () => socket.off('user-disconnected', handleUserDisconnected);
  }, [socket, cursors]);

  useEffect(() => {
    if (user && user !== currentUser) {
      setCurrentUser(user);
    }
  }, [user, currentUser]);

  useEffect(() => {
    if (!socket || !documentId || !currentUser) return;

    socket.emit('join-document', documentId, currentUser);
    return () => socket.emit('leave-document', documentId, currentUser);
  }, [socket, documentId, currentUser]);

  useEffect(() => {
    if (!socket || !quill || !currentUser) return;
  
    const userStatusHandler = (data) => {
      console.log("Received data from backend:", data); // Log the entire data object
      const { documentId: receivedDocumentId, users } = data;
      if (!users || receivedDocumentId !== documentId) return;
  
      console.log("Received users:", users); // Log received data
  
      // Use a Map to ensure unique users
      const uniqueUsersMap = new Map();
      users.forEach((user) => {
        if (!uniqueUsersMap.has(user.id)) {
          user.color = getUniqueColor(user.id); // Assign a unique color to each user
          uniqueUsersMap.set(user.id, user);
        }
      });
  
      // Update the state with the list of unique users
      setEditingUsers(Array.from(uniqueUsersMap.values()));
      console.log("Updated editingUsers:", Array.from(uniqueUsersMap.values())); // Log updated state
    };
  
    const updateUserStatus = throttle(() => {
      socket.emit('update-user-status', { documentId, user: currentUser });
    }, 1000);
  
    // Listen for user editing updates
    socket.on('user-editing', userStatusHandler);
    quill.on('text-change', updateUserStatus);
  
    return () => {
      socket.off('user-editing', userStatusHandler);
      quill.off('text-change', updateUserStatus);
    };
  }, [socket, quill, currentUser, documentId, getUniqueColor]);

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

  return (
    <div className="container live-editting">
      <div className="editor-header">
      <div className="editing-users">
  <h4>Editing Users:</h4>
  <ul>
    {editingUsers.length > 0 ? (
      editingUsers.map((user) => (
        <li key={user._id} className="editing-user">
          <div className="avatar-container" style={{ borderColor: user.color || "#ccc" }}>
            {user.avatar ? (
              <img src={user.avatar.url} alt={`${user.firstName} ${user.lastName}`} className="user-avatar" />
            ) : (
              <i className="fa-solid fa-user default-avatar"></i>
            )}
            <span className="user-name-tooltip">{user.firstName} {user.lastName}</span>
          </div>
        </li>
      ))
    ) : (
      <li className="no-users-editing">
        {currentUser ? (
          <div className="avatar-container" style={{ borderColor: getUniqueColor(currentUser._id) || "#3f5585" }}>
            {currentUser.avatar ? (
              <img src={currentUser.avatar.url} alt={`${currentUser.firstName} ${currentUser.lastName}`} className="user-avatar" />
            ) : (
              <i className="fa-solid fa-user default-avatar"></i>
            )}
            <span className="user-name-tooltip">{currentUser.firstName} {currentUser.lastName} is editing</span>
          </div>
        ) : (
          "No users editing"
        )}
      </li>
    )}
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