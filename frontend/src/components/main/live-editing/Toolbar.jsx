// Toolbar.js
import React from 'react';

function Toolbar() {
  return (
    <div className="ql-toolbar ql-snow">
      <button className="ql-bold">B</button>
      <button className="ql-italic">I</button>
      <button className="ql-underline">U</button>
      <button className="ql-list" value="ordered">OL</button>
      <button className="ql-list" value="bullet">UL</button>
      <button className="ql-link">Link</button>
      {/* Add more buttons as needed */}
    </div>
  );
}

export default Toolbar;
