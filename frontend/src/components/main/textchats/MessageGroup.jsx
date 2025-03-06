import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { useSelector } from "react-redux";
import { errMsg, getUser } from "../../../utils/helper";
import Message from "./Message";
import InputMessage from "./InputMessage";
import moment from "moment";

const socket = io(`${import.meta.env.VITE_SOCKET_API}`);

const MessageGroup = ({ groupId }) => {
  const [messages, setMessages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messageGroupInfo, setMessageGroupInfo] = useState(null);

  const authState = useSelector((state) => state.auth);
  const user = getUser(authState);
  const messagesEndRef = useRef(null);

  const PutSkeleton = () => {
    const skeleton = new Array(4).fill(null);
    return (
      <div className="chat-container">
        <div className="messages-list">
          {skeleton.map((_, index) => (
            <div
              key={index}
              className="message skeleton"
              style={{ height: "100px" }}
            />
          ))}
        </div>
      </div>
    );
  };

  // 🔥 Scroll to latest message when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 🔥 Fetch message group info
  useEffect(() => {
    if (!groupId) return;

    const fetchMessageGroupInfo = async () => {
      try {
        const { data } = await axios.get(
          `${import.meta.env.VITE_API}/getMessageGroupInfo/${groupId}`,
          { headers: { Authorization: `Bearer ${authState?.token}` } }
        );

        console.log("Message Group Info:", data);
        setMessageGroupInfo(data.data); // ✅ Assign `data` directly
      } catch (e) {
        console.error("Error fetching message group info", e);
        errMsg("Error fetching message group info", e);
      }
    };

    fetchMessageGroupInfo();
  }, [groupId]);

  // 🔥 Fetch messages when `groupId` changes
  useEffect(() => {
    if (!groupId) return;

    axios
      .get(`${import.meta.env.VITE_API}/messages/${groupId}`)
      .then((res) => setMessages(res.data))
      .catch((err) => console.error(err));
  }, [groupId]);

  // 🔥 Join the group in Socket.io
  useEffect(() => {
    if (!groupId) return;

    socket.emit("joinGroup", groupId);

    socket.on("receiveMessage", (message) => {
      // Make sure seenBy is properly initialized if it's undefined
      if (!message.seenBy) {
        message.seenBy = [];
      }
      setMessages((prev) => [...prev, message]);
    });

    return () => socket.off("receiveMessage");
  }, [groupId]);

  // 🔥 Mark messages as seen
  useEffect(() => {
    if (!groupId || !user || !messages.length) return;
    
    const lastMessage = messages[messages.length - 1];
    // Only emit seen for messages not sent by the current user and if user hasn't already seen it
    if (lastMessage && lastMessage.sender._id !== user._id) {
      const userAlreadySeen = lastMessage.seenBy && 
        lastMessage.seenBy.some(seen => seen.user._id === user._id);
      
      if (!userAlreadySeen) {
        socket.emit('messageSeen', {
          messageId: lastMessage._id,
          groupId,
          userId: user._id
        });
      }
    }
  }, [messages, groupId, user]);

  // Handle incoming seen notifications
  useEffect(() => {
    socket.on('messageSeenUpdate', (updatedMessage) => {
      setMessages(prev => 
        prev.map(msg => msg._id === updatedMessage._id ? updatedMessage : msg)
      );
    });

    return () => socket.off('messageSeenUpdate');
  }, []);

  // 🔥 Send a message
  const sendMessage = async () => {
    if (!newMessage.trim() && newImages.length === 0) return;
    setIsSending(true);

    // Convert images to base64
    const convertToBase64 = (file) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
      });

    const base64Images = await Promise.all(newImages.map(convertToBase64));

    socket.emit("sendMessage", {
      groupId,
      sender: user._id,
      content: newMessage,
      images: base64Images,
    });

    setNewMessage("");
    setNewImages([]);

    socket.once("messageSentConfirmation", () => {
      setIsSending(false);
    });
  };

  return (
    <div className="message-group-container">
      <div className="message-group">
        <PutSkeleton />
        {!messageGroupInfo ? (
          <div className="text-center">Loading group info...</div>
        ) : (
          <div className="createdAt">
            Created{" "}
            {messageGroupInfo?.createdAt
              ? moment(messageGroupInfo.createdAt).fromNow()
              : "N/A"}
          </div>
        )}

        {/* 🔥 Render messages */}
        {messages.map((msg, index) => (
          <React.Fragment key={index}>
            <Message index={index} msg={msg} user={user} />
          </React.Fragment>
        ))}

        {/* 🔥 Message seen indicators - Improved condition */}
        {messages.length > 0 && 
          messages[messages.length - 1]?.seenBy && 
          Array.isArray(messages[messages.length - 1].seenBy) && 
          messages[messages.length - 1].seenBy.length > 0 && (
            <div className="message-seen-container">
              <div className="message-seen-avatars">
                {messages[messages.length - 1].seenBy.map((seen, index) => (
                  <div key={index} className="message-seen-avatar" 
                      title={`${seen.user?.firstName || 'User'} ${seen.user?.lastName || ''} • ${moment(seen.seenAt).format('MMM D, YYYY h:mm A')}`}>
                    <img 
                      src={(seen.user?.avatar?.url) || "/images/account.png"} 
                      alt={`${seen.user?.firstName || 'User'} ${seen.user?.lastName || ''}`} 
                      className="seen-avatar-image" 
                    />
                    <div className="seen-tooltip">
                      <span>{seen.user?.firstName || 'User'} {seen.user?.lastName || ''}</span>
                      <span>{moment(seen.seenAt).format('MMM D, YYYY h:mm A')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        }

        {/* 🔥 Sending preview */}
        {isSending && newImages.length > 0 && (
          <div className="image-preview-container">
            {newImages.slice(0, 1).map((image, index) => (
              <div key={index} className="image-preview">
                <img
                  src={URL.createObjectURL(image)}
                  alt={`Selected ${index}`}
                  className="preview-image"
                />
              </div>
            ))}
            {newImages.length > 1 && (
              <div className="more-images">+{newImages.length - 1} more</div>
            )}
            <div className="text-italic text-center">sending</div>
          </div>
        )}
        {isSending && newImages.length === 0 && (
          <div className="text-italic">sending</div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Message Component */}
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