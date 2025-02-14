// Header.js
import React from 'react';

function Header() {
  return (
    <div className="header">
      <div className="document-title">Untitled document</div>
      <div className="header-actions">
        <button>File</button>
        <button>Edit</button>
        <button>View</button>
        <button>Insert</button>
        <button>Share</button>
      </div>
    </div>
  );
}

export default Header;
