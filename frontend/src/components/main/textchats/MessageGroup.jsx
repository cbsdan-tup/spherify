import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { getUser } from "../../../utils/helper";
import Message from "./Message";
import InputMessage from "./InputMessage";

const socket = io(`${import.meta.env.VITE_SOCKET_API}`);

const MessageGroup = () => {
  const [messages, setMessages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const authState = useSelector((state) => state.auth);
  const user = getUser(authState);

  const groupId = useParams().groupId;

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    socket.emit("joinGroup", groupId);

    socket.on("receiveMessage", (message) => {
      setMessages((prev) => [...prev, message]);
      console.log("Message", messages);
    });

    return () => socket.off("receiveMessage");
  }, [groupId]);

  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_API}/messages/${groupId}`)
      .then((res) => setMessages(res.data))
      .catch((err) => console.error(err));
  }, [groupId]);

  const sendMessage = async () => {
    if (newMessage.trim() || newImages.length > 0) {
      setIsSending(true);

      // Convert images to base64 before sending
      const convertToBase64 = (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result); // Base64 result
          reader.onerror = (error) => reject(error);
        });

      const base64Images = await Promise.all(newImages.map(convertToBase64));

      socket.emit("sendMessage", {
        groupId,
        sender: user._id,
        content: newMessage,
        images: base64Images, // Send converted images
      });

      setNewMessage("");
      setNewImages([]);

      socket.once("messageSentConfirmation", () => {
        setIsSending(false);
      });
    }
  };

  return (
    <div className="message-group-container">
      <div className="message-group">
        {messages.map((msg, index) => (
          <React.Fragment key={index}>
            <Message index={index} msg={msg} user={user} />
          </React.Fragment>
        ))}
        {isSending && newImages.length > 0 && (
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
            <div className="text-italic">sending</div>
          </div>
        )}
        {isSending && newImages.length === 0 && <div className="text-italic">sending</div>}
      </div>
      <div ref={messagesEndRef} />
      <InputMessage
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        sendMessage={sendMessage}
        newImages={newImages}
        setNewImages={setNewImages}
        isSending={isSending}
      />
    </div>
  );
};

export default MessageGroup;
