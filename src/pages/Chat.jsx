import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Send, Paperclip, Loader2, MessageSquare, Shield, GraduationCap, Users, X, Image as ImageIcon, File as FileIcon } from 'lucide-react';
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

  const isImage = msg.attachmentUrl && msg.attachmentUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i);

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
                  {isImage ? (
                    <a href={msg.attachmentUrl} target="_blank" rel="noreferrer">
                      <img src={msg.attachmentUrl} alt="attachment" className="attachment-image" />
                    </a>
                  ) : (
                    <a href={msg.attachmentUrl} target="_blank" rel="noreferrer" className="attachment-file-link">
                      <FileIcon size={16} /> View Attachment
                    </a>
                  )}
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
  
  const [attachment, setAttachment] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, attachmentPreview]); // also scroll when attachment preview shows up

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

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAttachment(file);
      // Create preview
      if (file.type.startsWith('image/')) {
        setAttachmentPreview({ type: 'image', url: URL.createObjectURL(file), name: file.name });
      } else {
        setAttachmentPreview({ type: 'file', url: null, name: file.name });
      }
    }
  };

  const clearAttachment = () => {
    setAttachment(null);
    if (attachmentPreview?.url) URL.revokeObjectURL(attachmentPreview.url);
    setAttachmentPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !attachment) || !socket || !activeGroup || isUploading) return;

    let uploadedUrl = null;

    if (attachment) {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('attachment', attachment);
      try {
        const res = await api.post('/chat/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        uploadedUrl = res.data.url;
      } catch (err) {
        console.error('Upload failed:', err);
        setIsUploading(false);
        return; // Stop if upload fails
      }
      setIsUploading(false);
    }

    socket.emit('send_message', {
      groupId: activeGroup.id,
      content: newMessage.trim() || (attachment ? 'Shared an attachment' : ''),
      attachmentUrl: uploadedUrl
    });

    setNewMessage('');
    clearAttachment();
  };
  
  // Helper to group messages by date
  const groupMessagesByDate = (msgs) => {
    const groups = {};
    msgs.forEach((msg) => {
      const dateStr = new Date(msg.createdAt).toLocaleDateString(undefined, { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(msg);
    });
    return groups;
  };

  if (loading) {
    return (
      <div className="chat-loading-screen">
        <Loader2 className="spinner" size={40} />
        <p>Loading Nodes...</p>
      </div>
    );
  }

  const groupedMessages = groupMessagesByDate(messages);

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
                  {Object.entries(groupedMessages).map(([date, dateMsgs]) => (
                    <React.Fragment key={date}>
                      <div className="chat-date-separator">
                        <span>{date}</span>
                      </div>
                      {dateMsgs.map((msg) => (
                        <MessageBubble 
                          key={msg._id || msg.id} 
                          msg={msg} 
                          isOwnMessage={msg.senderId === user.id && msg.senderType === user.role} 
                        />
                      ))}
                    </React.Fragment>
                  ))}
                  <div ref={messagesEndRef} className="scroll-anchor" />
                </div>
              )}
            </div>

            <div className="chat-input-wrapper">
              {attachmentPreview && (
                <div className="attachment-preview-container animate-fade-in-up">
                  <button type="button" className="close-preview-btn" onClick={clearAttachment}>
                    <X size={16} />
                  </button>
                  {attachmentPreview.type === 'image' ? (
                    <img src={attachmentPreview.url} alt="preview" className="preview-image" />
                  ) : (
                    <div className="preview-file">
                      <FileIcon size={32} className="file-icon" />
                      <span className="file-name">{attachmentPreview.name}</span>
                    </div>
                  )}
                </div>
              )}

              <form className="chat-input-area" onSubmit={handleSendMessage}>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  onChange={handleFileChange} 
                />
                <button 
                  type="button" 
                  className="attach-btn" 
                  title="Attach file"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Paperclip size={20} />
                </button>
                <input 
                  type="text" 
                  placeholder="Type your message..." 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={isUploading}
                />
                <button 
                  type="submit" 
                  className={`send-btn ${(newMessage.trim() || attachment) && !isUploading ? 'active' : ''}`} 
                  disabled={(!newMessage.trim() && !attachment) || isUploading}
                >
                  {isUploading ? <Loader2 size={18} className="spinner" /> : <Send size={18} />}
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
