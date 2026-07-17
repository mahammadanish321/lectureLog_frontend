import React, { useState, useEffect, useContext, useRef } from 'react';
import { io } from 'socket.io-client';
import api from '../api';
import { AuthContext } from '../context/AuthContext';
import './Chat.css';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const MessageBubble = ({ msg, isOwnMessage }) => {
  const bubbleClass = isOwnMessage
    ? 'message-bubble own-message'
    : msg.senderType === 'student'
    ? 'message-bubble student-message'
    : 'message-bubble staff-message';

  return (
    <div className={`message-wrapper ${isOwnMessage ? 'align-right' : 'align-left'}`}>
      <div className={bubbleClass}>
        {!isOwnMessage && (
          <div className="message-header">
            <span className="sender-name">{msg.senderType} {msg.senderId}</span>
            <span className={`role-badge ${msg.senderType}`}>{msg.senderType}</span>
          </div>
        )}
        {msg.isDeleted ? (
          <div className="deleted-message">🚫 This message was deleted</div>
        ) : (
          <div className="message-content">
            {msg.content}
            {msg.attachmentUrl && (
              <div className="message-attachment">
                <a href={msg.attachmentUrl} target="_blank" rel="noreferrer">View Attachment</a>
              </div>
            )}
          </div>
        )}
        <div className="message-footer">
          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

const Chat = () => {
  const { user } = useContext(AuthContext);
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch groups
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await api.get('/chat/groups');
        setGroups(res.data);
        if (res.data.length > 0) {
          setActiveGroup(res.data[0]);
        }
      } catch (err) {
        console.error('Error fetching chat groups:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchGroups();
  }, []);

  // Initialize Socket and fetch messages when active group changes
  useEffect(() => {
    if (!activeGroup) return;

    // Fetch message history
    const fetchMessages = async () => {
      try {
        const res = await api.get(`/chat/messages/${activeGroup.id}`);
        setMessages(res.data);
      } catch (err) {
        console.error('Error fetching messages:', err);
      }
    };
    fetchMessages();

    // Setup socket
    const token = localStorage.getItem('token');
    const newSocket = io(`${SOCKET_URL}/chat`, {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('Connected to Chat Socket');
      newSocket.emit('join_group', activeGroup.id, (response) => {
        if (response.error) {
          console.error('Failed to join group:', response.error);
        }
      });
    });

    newSocket.on('receive_message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit('leave_group', activeGroup.id);
      newSocket.disconnect();
    };
  }, [activeGroup]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !activeGroup) return;

    socket.emit('send_message', {
      groupId: activeGroup.id,
      content: newMessage.trim()
    });

    setNewMessage('');
  };

  if (loading) return <div className="chat-loading">Loading Groups...</div>;

  return (
    <div className="chat-layout">
      {/* Sidebar */}
      <div className="chat-sidebar">
        <h2 className="sidebar-title">Nodes</h2>
        <div className="group-list">
          {groups.length === 0 ? (
            <div className="no-groups">No nodes available.</div>
          ) : (
            groups.map((group) => (
              <div 
                key={group.id} 
                className={`group-item ${activeGroup?.id === group.id ? 'active' : ''}`}
                onClick={() => setActiveGroup(group)}
              >
                <div className="group-name">{group.name}</div>
                <div className="group-meta">Yr {group.year} • {group.stream}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="chat-main">
        {activeGroup ? (
          <>
            <div className="chat-header">
              <div className="header-info">
                <h3>{activeGroup.name}</h3>
                <span>Year {activeGroup.year} • {activeGroup.stream}</span>
              </div>
            </div>

            <div className="chat-messages">
              {messages.length === 0 ? (
                <div className="no-messages">Start the conversation!</div>
              ) : (
                messages.map((msg) => (
                  <MessageBubble 
                    key={msg._id || msg.id} 
                    msg={msg} 
                    isOwnMessage={msg.senderId === user.id && msg.senderType === user.role} 
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-area" onSubmit={handleSendMessage}>
              <button type="button" className="attach-btn">📎</button>
              <input 
                type="text" 
                placeholder="Type a message..." 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <button type="submit" className="send-btn" disabled={!newMessage.trim()}>Send</button>
            </form>
          </>
        ) : (
          <div className="no-active-group">
            <p>Select a node from the sidebar to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
