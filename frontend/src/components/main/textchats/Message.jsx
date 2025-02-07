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
            {msg.content}
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
