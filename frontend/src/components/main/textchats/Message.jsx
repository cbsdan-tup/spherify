import React, { useState } from "react";

const Message = ({ msg, user, index }) => {
  const [fullViewImage, setFullViewImage] = useState(null);

  const openFullView = (imageUrl) => {
    setFullViewImage(imageUrl);
  };

  const closeFullView = () => {
    setFullViewImage(null);
  };

  return (
    <div
      className={
        msg.sender._id == user._id || msg.sender == user._id
          ? "message you"
          : "message other"
      }
    >
      <div className="message-content">
        {msg.sender._id !== user._id && msg.sender !== user._id ? (
          <div className="avatar">
            <img src={msg.sender?.avatar?.url ? msg.sender?.avatar?.url : "/images/account.png"} alt="User" />
            <div className={`status member-status-dot ${msg.sender?.status && msg.sender.status}`}></div>
          </div>
        ) : (
          <></>
        )}
        <div className="p" key={index}>
          <strong className="sender">
            {msg.sender._id == user._id || msg.sender == user._id
              ? "You"
              : `${msg.sender.firstName} ${msg.sender.lastName}`}{" "}
          </strong>{" "}
          <div
            className={
              msg.sender._id == user._id || msg.sender == user._id
                ? "chat-content you"
                : "chat-content other"
            }
          >
            <div className="msg-text">{msg.content}</div>
            {Array.isArray(msg.images) && msg.images.length > 0 ? (
              <div className="msg-images">
                {msg.images.map((image, index) => (
                  <img
                    key={index}
                    src={image.url}
                    alt={`Uploaded ${index}`}
                    width="100"
                    onClick={() => openFullView(image.url)}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
              </div>
            ) : null}
          </div>
          <div className="chat-time">
            {new Date(msg.createdAt).toLocaleString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
          </div>
        </div>
      </div>

      {/* Full view image modal */}
      {fullViewImage && (
        <div className="image-full-view-overlay" onClick={closeFullView}>
          <div className="image-full-view-container" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={closeFullView}>×</button>
            <img src={fullViewImage} alt="Full view" />
          </div>
        </div>
      )}

      <style jsx>{`
        .image-full-view-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.8);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9000;
        }
        
        .image-full-view-container {
          position: relative;
          max-width: 90%;
          max-height: 90%;
        }
        
        .image-full-view-container img {
          max-width: 100%;
          max-height: 90vh;
          object-fit: contain;
        }
        
        .image-full-view-container .close-btn {
          position: absolute;
          top: -10px;
          right: -40px;
          background: white;
          border: none;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: red;
          font-size: 1.2rem;
        }
      `}</style>
    </div>
  );
};

export default Message;
