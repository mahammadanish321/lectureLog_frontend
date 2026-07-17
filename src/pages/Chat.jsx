import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Send, Paperclip, Loader2, MessageSquare, Shield, GraduationCap, Users } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import './Chat.css';

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const RoleIcon = ({ role }) => {
  switch (role) {
    case 'admin': return <Shield size={12} />;
    case 'teacher': return <GraduationCap size={12} />;
    case 'student': return <Users size={12} />;
    default: return null;
  }
};

const MessageBubble = ({ msg, isOwnMessage }) => {
  const bubbleClass = isOwnMessage
    ? 'message-bubble own-message'
    : `message-bubble ${msg.senderType}-message`;

  const senderName = msg.senderName || `${msg.senderType} ${msg.senderId}`;
  
  // Try to use provided avatar, fallback to student id, or use ui-avatars
  let avatarUrl = msg.senderAvatar;
  if (!avatarUrl && msg.senderType === 'student') {
    avatarUrl = `${BACKEND_URL}/public/students/${msg.senderId}.jpg`;
  }
  if (!avatarUrl) {
    avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=random`;
  }

  return (
    <div className={`message-wrapper animate-fade-in-up ${isOwnMessage ? 'align-right' : 'align-left'}`}>
      {!isOwnMessage && (
        <div className="message-avatar">
          <img 
            src={avatarUrl} 
            alt={senderName} 
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=random`;
            }}
          />
        </div>
      )}
      
      <div className="message-content-box">
        {!isOwnMessage && (
          <div className="message-header">
            <span className="sender-name">{senderName}</span>
            <span className={`role-badge ${msg.senderType}`}>
              <RoleIcon role={msg.senderType} />
              {msg.senderType}
            </span>
          </div>
        )}
        
        <div className={bubbleClass}>
          {msg.isDeleted ? (
            <div className="deleted-message">🚫 This message was deleted</div>
          ) : (
            <div className="message-content">
              {msg.content}
              {msg.attachmentUrl && (
                <div className="message-attachment">
                  <a href={msg.attachmentUrl} target="_blank" rel="noreferrer">
                    <Paperclip size={14} /> View Attachment
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="message-footer">
          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

const Chat = () => {
  const { user } = useAuth();
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
        if (response?.error) {
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

  if (loading) {
    return (
      <div className="chat-loading-screen">
        <Loader2 className="spinner" size={40} />
        <p>Loading Nodes...</p>
      </div>
    );
  }

  return (
    <div className="chat-layout premium-glass">
      {/* Sidebar */}
      <div className="chat-sidebar">
        <div className="sidebar-header">
          <MessageSquare size={20} className="sidebar-icon" />
          <h2 className="sidebar-title">Nodes</h2>
        </div>
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
                <div className="group-avatar">
                  {group.name.charAt(0).toUpperCase()}
                </div>
                <div className="group-info">
                  <div className="group-name">{group.name}</div>
                  <div className="group-meta">Year {group.year} • {group.stream}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="chat-main">
        {activeGroup ? (
          <>
            <div className="chat-header glass-header">
              <div className="header-avatar">
                {activeGroup.name.charAt(0).toUpperCase()}
              </div>
              <div className="header-info">
                <h3>{activeGroup.name}</h3>
                <span>Year {activeGroup.year} • {activeGroup.stream}</span>
              </div>
            </div>

            <div className="chat-messages">
              {messages.length === 0 ? (
                <div className="empty-chat-state">
                  <div className="empty-icon">
                    <MessageSquare size={48} />
                  </div>
                  <h3>Welcome to the {activeGroup.name} Node</h3>
                  <p>Start the conversation! Messages sent here will be visible to all members of this node.</p>
                </div>
              ) : (
                <div className="messages-container">
                  {messages.map((msg) => (
                    <MessageBubble 
                      key={msg._id || msg.id} 
                      msg={msg} 
                      isOwnMessage={msg.senderId === user.id && msg.senderType === user.role} 
                    />
                  ))}
                  <div ref={messagesEndRef} className="scroll-anchor" />
                </div>
              )}
            </div>

            <div className="chat-input-wrapper">
              <form className="chat-input-area" onSubmit={handleSendMessage}>
                <button type="button" className="attach-btn" title="Attach file">
                  <Paperclip size={20} />
                </button>
                <input 
                  type="text" 
                  placeholder="Type your message..." 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <button 
                  type="submit" 
                  className={`send-btn ${newMessage.trim() ? 'active' : ''}`} 
                  disabled={!newMessage.trim()}
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="no-active-group">
            <MessageSquare size={64} className="placeholder-icon" />
            <h3>Select a Node</h3>
            <p>Choose a node from the sidebar to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
