import React from "react";

const Message = ({ msg, user, index }) => {
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
          </div>
        ) : (
          <></>
        )}
        <p key={index}>
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
        </p>
      </div>
    </div>
  );
};

export default Message;
