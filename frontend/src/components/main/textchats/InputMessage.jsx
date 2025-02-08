import React, { useState, useRef, useEffect } from "react";
import EmojiPicker from "emoji-picker-react"; // Import the emoji picker

const InputMessage = ({ newMessage, setNewMessage, sendMessage, newImages, setNewImages }) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && newMessage.trim()) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleImagePickerClick = () => {
    fileInputRef.current.click();
  };

  const removeImage = (index) => {
    setNewImages((prevImages) => prevImages.filter((_, i) => i !== index));
  };

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      setNewImages((prevImages) => [...prevImages, ...files]); // Append new images
    }
    event.target.value = ""; // Clear input to allow re-selecting the same file
  };

  const handleEmojiClick = (emojiData) => {
    setNewMessage((prevMessage) => prevMessage + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  // Cleanup object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      newImages.forEach((image) => URL.revokeObjectURL(image.preview));
    };
  }, [newImages]);

  return (
    <div className="input-message-container">
      <button className="image-picker" onClick={handleImagePickerClick}>
        <i className="fa-regular fa-image"></i>
      </button>
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      <input
        type="text"
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        placeholder="Type your message..."
        onKeyDown={handleKeyDown}
      />
      <button
        className="emoji-picker"
        onClick={() => setShowEmojiPicker((prev) => !prev)}
      >
        😊
      </button>
      <button onClick={sendMessage}>
        <i className="fa-solid fa-paper-plane"></i>
      </button>

      {showEmojiPicker && (
        <div className="emoji-picker-container">
          <EmojiPicker onEmojiClick={handleEmojiClick} className="picker" />
        </div>
      )}

      {/* Display selected images */}
      {newImages.length > 0 && (
        <div className="image-preview-container">
          {newImages.slice(0, 3).map((image, index) => (
            <div key={index} className="image-preview">
              <img
                src={URL.createObjectURL(image)}
                alt={`Selected ${index}`}
                className="preview-image"
              />
              <button onClick={() => removeImage(index)} className="exit">
                <i className="fa-solid fa-x exit"></i>
              </button>
            </div>
          ))}
          {newImages.length > 3 && (
            <div className="more-images">+{newImages.length - 3} more</div>
          )}
        </div>
      )}
    </div>
  );
};

export default InputMessage;
