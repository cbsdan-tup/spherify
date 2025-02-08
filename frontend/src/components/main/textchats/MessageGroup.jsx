import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { getUser } from "../../../utils/helper";
import Message from "./Message";
import InputMessage from "./InputMessage";

const socket = io(`http://localhost:4000`);

const MessageGroup = () => {
  const [messages, setMessages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
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
    if (newMessage.trim()) {
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
    }
  };
  

  return (
    <div className="message-group-container">
      <div className="message-group">
        {messages.map((msg, index) => (
          <>
            <Message index={index} msg={msg} user={user} />
          </>
        ))}
      </div>
      <div ref={messagesEndRef} />
      <InputMessage
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        sendMessage={sendMessage}
        newImages={newImages}
        setNewImages={setNewImages}
      />
    </div>
  );
};

export default MessageGroup;
