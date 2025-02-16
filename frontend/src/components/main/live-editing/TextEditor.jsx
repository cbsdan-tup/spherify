import React, { useEffect, useState, useCallback } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { io } from "socket.io-client";
import { useParams } from "react-router-dom";
import { FONT_OPTIONS } from "./Live-Editing Functionalities/quillFonts";
import "./styles.css";

const TOOLBAR_OPTIONS = [
  [{ undo: "undo" }, { redo: "redo" }],
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ font: FONT_OPTIONS }],
  ["bold", "italic", "underline"],
  [{ color: [] }, { background: [] }],
  [{ align: [] }, { list: "ordered" }, { list: "bullet" }, { indent: "-1" }, { indent: "+1" }],
  [{ script: "sub" }, { script: "super" }],
  [{ list: "check" }],
  ["image", "link"],
  ["clean"],
];

const SAVE_INTERVAL_MS = 100;

export default function TextEditor() {
  const { documentId } = useParams();
  const [socket, setSocket] = useState(null);
  const [quill, setQuill] = useState(null);
  const [lastFormat, setLastFormat] = useState({});

  // 🔹 Initialize socket connection once
  useEffect(() => {
    const s = io(import.meta.env.VITE_SOCKET_API);
    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  // 🔹 Receive text changes
  useEffect(() => {
    if (!socket || !quill) return;

    const textHandler = (delta) => {
      if (delta?.ops) quill.updateContents(delta, "silent");
    };

    socket.on("receive-changes", textHandler);

    return () => {
      socket.off("receive-changes", textHandler);
    };
  }, [socket, quill]);

  // 🔹 Receive format changes
  useEffect(() => {
    if (!socket || !quill) return;

    const formatHandler = ({ format, range }) => {
      if (format && range) quill.formatText(range.index, range.length, format, "silent");
    };

    socket.on("receive-format", formatHandler);

    return () => {
      socket.off("receive-format", formatHandler);
    };
  }, [socket, quill]);

  // 🔹 Load document contents
  useEffect(() => {
    if (!socket || !quill) return;

    socket.on("load-document", (document) => {
      quill.setContents(document);
      quill.enable();
    });

    socket.emit("get-document", documentId);

    return () => {
      socket.off("load-document");
    };
  }, [socket, quill, documentId]);

  // 🔹 Save document periodically
  useEffect(() => {
    if (!socket || !quill) return;

    const interval = setInterval(() => {
      socket.emit("save-document", quill.getContents());
    }, SAVE_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [socket, quill]);

  // 🔹 Handle text & format changes
  useEffect(() => {
    if (!socket || !quill) return;

    const textChangeHandler = (delta, _, source) => {
      if (source === "user") socket.emit("send-changes", delta);
    };

    const formatChangeHandler = (range, _, source) => {
      if (source === "user" && range) {
        const format = quill.getFormat(range.index);
        setLastFormat(format);
        socket.emit("send-format", { format, range });
      }
    };

    quill.on("text-change", textChangeHandler);
    quill.on("selection-change", formatChangeHandler);

    return () => {
      quill.off("text-change", textChangeHandler);
      quill.off("selection-change", formatChangeHandler);
    };
  }, [socket, quill]);

  // 🔹 Ensure format persists on "Enter"
  useEffect(() => {
    if (!quill) return;

    quill.keyboard.addBinding(
      { key: 13 },
      {
        handler: function (range) {
          setTimeout(() => {
            const format = quill.getFormat(range.index - 1);
            if (format) {
              Object.keys(format).forEach((key) => quill.format(key, format[key], "silent"));
            }
          }, 0);
        },
      }
    );
  }, [quill]);

  // ✅ Add Undo & Redo Buttons
  const addUndoRedoButtons = (quill) => {
    document.querySelector(".ql-undo")?.addEventListener("click", () => quill.history.undo());
    document.querySelector(".ql-redo")?.addEventListener("click", () => quill.history.redo());
  };

  // 🔹 Initialize Quill
  const wrapperRef = useCallback((wrapper) => {
    if (!wrapper) return;

    wrapper.innerHTML = "";
    const editor = document.createElement("div");
    wrapper.append(editor);

    const q = new Quill(editor, {
      theme: "snow",
      modules: {
        toolbar: TOOLBAR_OPTIONS,
        history: { delay: 1000, maxStack: 500, userOnly: true },
      },
    });

    q.disable();
    q.setText("Loading...");
    setQuill(q);

    addUndoRedoButtons(q);
  }, []);

  return (
    <div className="container live-editing">
      <div className="wrapper" ref={wrapperRef}></div>
      <div>Document ID: {documentId}</div>
    </div>
  );
}
