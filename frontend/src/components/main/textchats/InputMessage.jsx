import React, { useState } from "react";
import EmojiPicker from "emoji-picker-react"; // Import the emoji picker

const InputMessage = ({ newMessage, setNewMessage, sendMessage }) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false); // State to toggle emoji picker visibility

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && newMessage.trim()) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleEmojiClick = (emojiData) => {
    setNewMessage((prevMessage) => prevMessage + emojiData.emoji); // Append selected emoji to the message
    setShowEmojiPicker(false); // Close emoji picker after selecting an emoji
  };

  return (
    <div className="input-message-container">
      <input
        type="text"
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        placeholder="Type your message..."
        onKeyDown={handleKeyDown}
      />
      {/* Toggle Emoji Picker */}
      <button
        className="emoji-picker"
        onClick={() => setShowEmojiPicker((prev) => !prev)}
      >
        😊
      </button>
      <button onClick={sendMessage}>
        <i className="fa-solid fa-paper-plane"></i>
      </button>

      {/* Conditionally render the emoji picker */}
      {showEmojiPicker && (
        <div className="emoji-picker-container">
          <EmojiPicker onEmojiClick={handleEmojiClick} className="picker" />
        </div>
      )}
    </div>
  );
};

export default InputMessage;
