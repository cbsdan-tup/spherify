import React, { useEffect, useState, useRef, useCallback } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { jsPDF } from 'jspdf'; // Import jsPDF
import html2pdf from 'html2pdf.js'; // Import html2pdf.js
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { FONT_OPTIONS } from './Live-Editing Functionalities/quillFonts';
import './styles.css';
import { io } from 'socket.io-client';  // <-- Add this line
import { useSelector } from 'react-redux';


const TOOLBAR_OPTIONS = [
  [{ undo: 'undo' }, { redo: 'redo' }], // ✅ Undo & Redo
  [{ header: [1, 2, 3, 4, 5, 6, false] }], // Headers
  [{ font: FONT_OPTIONS }], // Font options
  ['bold', 'italic', 'underline'], // Text formatting
  [{ color: [] }, { background: [] }], // Text color & background
  [{ align: [] }, { list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }], // Alignment & lists
  [{ script: 'sub' }, { script: 'super' }], // Subscript & superscript
  // [{ lineHeight: ['1', '1.5', '2', '2.5', '3', '4'] }], // ✅ Line Spacing
  [{ list: 'check' }], // ✅ Checklist
  ['image', 'link'], // Media & links
  ['clean'], // Remove formatting
];

const SAVE_INTERVAL_MS = 2000;
const PAGE_HEIGHT = 850; // Arbitrary page height in pixels (adjust as needed)

export default function TextEditor() {
  const { documentId } = useParams(); 
  const [socket, setSocket] = useState(null);
  const [quill, setQuill] = useState(null);
  const [lastFormat, setLastFormat] = useState({}); // Store last format used
  const [currentUser, setCurrentUser] = useState(null); // State to store current user
  const [editingUsers, setEditingUsers] = useState([]); // State for users editing the document
  const currentUserRef = useRef(currentUser); // Use a ref to store the currentUser value


  // Update the ref whenever currentUser changes
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  console.log(documentId);
  // 🔹 Connect to Socket.io
  useEffect(() => {
    const s = io(`${import.meta.env.VITE_SOCKET_API}`); 

    s.removeAllListeners(); 
    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);
  
  // 🔹 Receive text changes
  useEffect(() => {
    if (socket == null || quill == null) return;
  
    const textHandler = (delta) => {
      if (!quill || !delta || typeof delta !== "object" || !delta.ops) return;
      quill.updateContents(delta, "silent");
    };
  
    socket.off("receive-changes", textHandler); // Remove previous listener
    socket.on("receive-changes", textHandler);
  
    return () => {
      socket.off("receive-changes", textHandler); // Cleanup on unmount
    };
  }, [socket, quill]);

  // 🔹 Receive format changes
  useEffect(() => {
    if (socket == null || quill == null) return;
  
    const formatHandler = ({ format, value, range }) => {
      if (!format || range == null) return;
      quill.formatText(range.index, range.length, format, value, "silent");
    };
  
    socket.off("receive-format", formatHandler);
    socket.on("receive-format", formatHandler);
  
    return () => {
      socket.off("receive-format", formatHandler);
    };
  }, [socket, quill]);

  // 🔹 Load document contents from server
  useEffect(() => {
    if (socket == null || quill == null) return;
  
    const loadDocumentHandler = (document) => {
      quill.setContents(document);
      quill.enable();
    };
  
    socket.off("load-document", loadDocumentHandler);
    socket.once("load-document", loadDocumentHandler);
  
    socket.emit("get-document", documentId);
  
    return () => {
      socket.off("load-document", loadDocumentHandler);
    };
  }, [socket, quill, documentId]);

  // 🔹 Save document periodically
  useEffect(() => {
    if (socket == null || quill == null) return;

    const interval = setInterval(() => {
      socket.emit('save-document', quill.getContents());
    }, SAVE_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [socket, quill]);

  // 🔹 Handle text & format changes and send to server
  useEffect(() => { 
    if (socket == null || quill == null) return;

    const textChangeHandler = (delta, oldDelta, source) => {
      if (source !== 'user') return;
      socket.emit('send-changes', delta);
    };

    const formatChangeHandler = (range, oldRange, source) => {
      if (source !== 'user' || range == null) return;
      const format = quill.getFormat(range.index); // 🔥 Ensure we get the format at the cursor
      if (format) {
        setLastFormat(format); // Store last format used
        socket.emit('send-format', { format, range }); // Send format update
      }
    };
    

    quill.on('text-change', textChangeHandler);
    quill.on('selection-change', formatChangeHandler);

    return () => {
      quill.off('text-change', textChangeHandler);
      quill.off('selection-change', formatChangeHandler);
    };
  }, [socket, quill]);

  // 🔹 Ensure font persists when pressing "Enter"
  useEffect(() => {
    if (quill == null) return;

    quill.keyboard.addBinding({ key: 13 }, {
      handler: function(range, context) {
        setTimeout(() => {
          const format = quill.getFormat(range.index - 1); // Get previous line's format
          if (format) {
            Object.keys(format).forEach((key) => {
              quill.format(key, format[key], 'silent'); // Apply previous format
            });
          }
        }, 0);
      }
    });
    
  }, [quill, lastFormat]);

  // ✅ Add Undo & Redo Buttons Manually
  function addUndoRedoButtons(quill) {
const undoButton = document.querySelector('.ql-undo');
const redoButton = document.querySelector('.ql-redo');

if (undoButton) {
  undoButton.addEventListener('click', () => {
    quill.history.undo(); // 🔄 Undo last change
  });
}

if (redoButton) {
  redoButton.addEventListener('click', () => {
    quill.history.redo(); // 🔄 Redo last undone change
  });
}
}

  // Access the user from the Redux store
  const user = useSelector((state) => state.auth.user);
  console.log("User from Redux:", user); // Log user data to ensure it's being set correctly

  // Fetch user from Redux and set currentUser
  useEffect(() => {
  if (user) {
    setCurrentUser(user); // Set full name of user
  } else {
    console.log("User is not yet available in Redux");
  }
  }, [user]);

  // Listen for user-editing socket events and handle Quill editor changes
  useEffect(() => {
  if (!currentUser) {
    console.error("Current User is not set yet.");
    return; // Exit early if currentUser is undefined
  }

  // Listen for other users editing the document
  const userStatusHandler = (data) => {
    const { documentId: receivedDocumentId, users } = data;
    if (!users) return; // Ensure valid users array

    if (receivedDocumentId === documentId) {
      console.log("Editing Users: ", users);
      setEditingUsers(users);
    }
  };

  socket.on("user-editing", userStatusHandler);

  // Emit user status when Quill editor changes
  const updateUserStatus = () => {
    if (!currentUser) {
      console.error("Cannot emit user status, currentUser is undefined.");
      return; // Prevent emitting empty user data
    }
    socket.emit('update-user-status', { documentId, user: currentUser });
  };

  // Emit user status once when the component mounts
  updateUserStatus();

  // Cleanup listeners on unmount
  return () => {
    socket.off("user-editing", userStatusHandler);
  };
  }, [socket, quill, currentUser, documentId]); // Re-run whenever currentUser or documentId changes

  
  

  // Handle the PDF export using html2pdf.js
  const handleGeneratePDFHtml2Pdf = () => {
    if (!quill) return;
  
    // Get the Quill editor content as HTML
    let editorContent = quill.root.innerHTML;
  
    // Apply a default font size of 12px in the editor content
    editorContent = editorContent.replace(/font-size:\s*\d+px/g, 'font-size: 12px'); // Ensure all inline font sizes are set to 12px
  
    // Add a global style tag to ensure font size applies
    editorContent = `
      <style>
        body { font-size: 12px; }
      </style>
      ${editorContent}
    `;
  
    // Define margin options (top, left, right, bottom)
    const options = {
      margin: [20, 20, 20, 20], // top, left, bottom, right (in mm)
      filename: 'document.pdf',  // PDF filename
      html2canvas: { scale: 2 }, // Optional: for higher quality rendering
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },  // PDF format and orientation
    };
  
    // Generate PDF using html2pdf.js with the defined margin options
    html2pdf().from(editorContent).set(options).save();
  };
  

  // Function to insert a dynamic table into the Quill editor
  const insertDynamicTable = () => {
    if (quill) {
      const rows = prompt('Enter number of rows:'); // Prompt for number of rows
      const columns = prompt('Enter number of columns:'); // Prompt for number of columns
      
      if (rows && columns) {
        const rowCount = parseInt(rows, 10);
        const colCount = parseInt(columns, 10);

        if (isNaN(rowCount) || isNaN(colCount)) {
          alert('Please enter valid numbers for rows and columns.');
          return;
        }

        // Create table HTML dynamically
        let tableHTML = `<table border="1" cellpadding="5" cellspacing="0">`;

        // Add table rows and columns
        for (let i = 0; i < rowCount; i++) {
          tableHTML += `<tr>`;
          for (let j = 0; j < colCount; j++) {
            tableHTML += `<td> </td>`; // Empty cell
          }
          tableHTML += `</tr>`;
        }

        tableHTML += `</table>`;

        // Get the current selection in Quill
        const range = quill.getSelection();
        if (range) {
          // Insert the table at the current cursor position
          quill.clipboard.dangerouslyPasteHTML(range.index, tableHTML);
        }
      }
    }
  };

   // Function to add a page break
   function insertPageBreak() {
    const range = quill.getSelection();
    const pageBreak = '<div class="page-break"></div>';

    // Insert page break at the cursor location
    if (range) {
      quill.clipboard.dangerouslyPasteHTML(range.index, pageBreak);
    }
  }
  function checkForPageBreak() {
    if (quill && quill.root) {
      const editorHeight = quill.root.scrollHeight;
      const PAGE_HEIGHT = window.innerHeight * 0.8; // Adjust based on the window's height or container
  
      if (editorHeight > PAGE_HEIGHT) {
        insertPageBreak(); // Only insert page break if necessary
      }
    }
  }
  
  

// 🔹 Initialize Quill editor
  const wrapperRef = useCallback((wrapper) => {
  if (wrapper == null) return;
  wrapper.innerHTML = '';

  // Create the Quill editor inside the wrapper
  const editor = document.createElement('div');
  wrapper.append(editor);

  const q = new Quill(editor, {
    theme: 'snow',
    modules: { toolbar: TOOLBAR_OPTIONS, history: { delay: 1000, maxStack: 500, userOnly: true } },
  });

  q.disable();
  q.setText('Loading...');
  setQuill(q);

  // ✅ Attach Undo & Redo event listeners
addUndoRedoButtons(q);

 // Attach event listener for text changes
 q.on('text-change', () => {
  checkForPageBreak(); // Call checkForPageBreak on text changes
});

// Also check initially after loading the editor
checkForPageBreak();

}, []); // Re-run on fileMenuOpen change

return (
  <div className="container live-editting">
    <div className="editor-header">

      <div className="editing-users">
      <h4>Editing Users:</h4>
      <ul>
        {editingUsers.length > 0 ? (
          editingUsers.map((user, index) => (
            <li key={index} className="editing-user">
              <img src={user?.avatar?.url || "/images/account.png"} alt={user?.firstName} />
              <div className="tooltip d-none">{`${user?.firstName} ${user?.lastName}`} </div>
            </li>
          ))
        ) : (
          <li className="no-users-editing" key={1}>
            {currentUser ? `${currentUser?.firstName} ${currentUser?.lastName} is editing` : 'No users editing'}
          </li> // Display current user or 'No users editing'
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
