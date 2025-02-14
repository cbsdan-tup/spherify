  import React, { useEffect, useState, useCallback } from 'react';
  import Quill from 'quill';
  import 'quill/dist/quill.snow.css';
  import { io } from 'socket.io-client';
  import { useParams } from 'react-router-dom';
  import { FONT_OPTIONS } from './Live-Editing Functionalities/quillFonts';
  import './styles.css';

  
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

  export default function TextEditor() {
    const { documentId } = useParams();
    const [socket, setSocket] = useState(null);
    const [quill, setQuill] = useState(null);
    const [lastFormat, setLastFormat] = useState({}); // Store last format used

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

    // 🔹 Initialize Quill editor
    const wrapperRef = useCallback((wrapper) => {
      if (wrapper == null) return;
      wrapper.innerHTML = '';

      const editor = document.createElement('div');
      wrapper.append(editor);

      const q = new Quill(editor, {
        theme: 'snow',
        modules: { toolbar: TOOLBAR_OPTIONS, history: { delay: 1000, maxStack: 500, userOnly: true }

         },
      });

      q.disable();
      q.setText('Loading...');
      setQuill(q);

        // ✅ Attach Undo & Redo event listeners
  addUndoRedoButtons(q);
    }, []);

    return (
      <div className="container live-editting">
        <div className="wrapper" ref={wrapperRef}></div>
        <div>Document ID: {documentId}</div>
      </div>
    );
  }
