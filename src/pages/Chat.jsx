import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Send, Paperclip, Loader2, MessageSquare, Shield, GraduationCap, Users, X, File as FileIcon, Search } from 'lucide-react';
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

const MessageBubble = ({ msg, isOwnMessage, onDoubleClick }) => {
  const bubbleClass = isOwnMessage
    ? 'message-bubble own-message'
    : `message-bubble ${msg.senderType}-message`;

  const senderName = msg.senderName || `${msg.senderType} ${msg.senderId}`;
  
  let avatarUrl = msg.senderAvatar;
  if (!avatarUrl && msg.senderType === 'student') {
    avatarUrl = `${BACKEND_URL}/public/students/${msg.senderId}.jpg`;
  }
  if (!avatarUrl) {
    avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=random`;
  }

  const isLocalMessage = msg.isLocal; // Optimistic UI flag

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
      
      <div className={`message-content-box ${isLocalMessage ? 'optimistic-message' : ''}`}>
        {!isOwnMessage && (
          <div className="message-header">
            <span className="sender-name">{senderName}</span>
            <span className={`role-badge ${msg.senderType}`}>
              <RoleIcon role={msg.senderType} />
              {msg.senderType}
            </span>
          </div>
        )}
        
        <div className={bubbleClass} onDoubleClick={() => onDoubleClick && onDoubleClick(msg)}>
          {msg.isDeleted ? (
            <div className="deleted-message">🚫 This message was deleted</div>
          ) : (
            <div className="message-content">
              {/* Render Quoted Reply if exists */}
              {msg.replyTo && (
                <div className="quoted-message">
                  <span className="quoted-sender">{msg.replyTo.senderName || 'Someone'}</span>
                  <p className="quoted-text">{msg.replyTo.content || (msg.replyTo.attachmentUrls?.length ? 'Attachment' : '')}</p>
                </div>
              )}
              
              {msg.content}
              
              {/* Render Multiple Attachments */}
              {msg.attachmentUrls && msg.attachmentUrls.length > 0 && (
                <div className={`message-attachments-grid ${msg.attachmentUrls.length > 1 ? 'multi-grid' : ''}`}>
                  {msg.attachmentUrls.map((url, idx) => {
                    // Quick check if image
                    const isImage = url.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i) || url.includes('cloudinary');
                    if (isImage) {
                      return (
                        <a key={idx} href={url} target="_blank" rel="noreferrer" className="attachment-image-link">
                          <img src={url} alt="attachment" className="attachment-image" />
                        </a>
                      );
                    }
                    return (
                      <a key={idx} href={url} target="_blank" rel="noreferrer" className="attachment-file-link">
                        <FileIcon size={16} /> File Attachment
                      </a>
                    );
                  })}
                </div>
              )}

              {/* Show Loading state for optimistic UI */}
              {isLocalMessage && (
                <div className="optimistic-loading">
                  <Loader2 size={14} className="spinner" /> Sending...
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
  
  const [attachments, setAttachments] = useState([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const fileInputRef = useRef(null);
  
  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedStream, setSelectedStream] = useState('');
  
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, attachmentPreviews]);

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

  // Initialize Socket and fetch messages
  useEffect(() => {
    if (!activeGroup) return;

    const fetchMessages = async () => {
      try {
        const res = await api.get(`/chat/messages/${activeGroup.id}`);
        setMessages(res.data);
      } catch (err) {
        console.error('Error fetching messages:', err);
      }
    };
    fetchMessages();

    const token = localStorage.getItem('token');
    const newSocket = io(`${SOCKET_URL}/chat`, { auth: { token } });

    newSocket.on('connect', () => {
      console.log('Connected to Chat Socket');
      newSocket.emit('join_group', activeGroup.id);
    });

    newSocket.on('receive_message', (message) => {
      // Replace optimistic message if it exists
      setMessages((prev) => {
        // Find if we have a local ghost message from this user with similar content/time
        // For simplicity, just remove any local message that was sent within the last few seconds
        const filtered = prev.filter(m => !(m.isLocal && m.senderId === user.id && m.content === message.content));
        return [...filtered, message];
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit('leave_group', activeGroup.id);
      newSocket.disconnect();
    };
  }, [activeGroup, user.id]);

  // Handle file selection (Multiple files)
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setAttachments(prev => [...prev, ...files]);
      
      const newPreviews = files.map(file => {
        if (file.type.startsWith('image/')) {
          return { id: Math.random(), type: 'image', url: URL.createObjectURL(file), name: file.name };
        } else {
          return { id: Math.random(), type: 'file', url: null, name: file.name };
        }
      });
      setAttachmentPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeAttachment = (indexToRemove) => {
    setAttachments(prev => prev.filter((_, idx) => idx !== indexToRemove));
    setAttachmentPreviews(prev => {
      const preview = prev[indexToRemove];
      if (preview && preview.url) URL.revokeObjectURL(preview.url);
      return prev.filter((_, idx) => idx !== indexToRemove);
    });
  };

  const clearAllAttachments = () => {
    setAttachments([]);
    attachmentPreviews.forEach(p => p.url && URL.revokeObjectURL(p.url));
    setAttachmentPreviews([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && attachments.length === 0) || !socket || !activeGroup || isUploading) return;

    // Optimistic UI updates
    const textContent = newMessage.trim();
    const tempPreviews = attachmentPreviews.map(p => p.url || ''); 
    
    // Create a local ghost message instantly
    const localMessage = {
      id: `local-${Date.now()}`,
      groupId: activeGroup.id,
      senderId: user.id,
      senderType: user.role,
      senderName: user.name, 
      content: textContent || (attachments.length > 0 ? `Shared ${attachments.length} attachment(s)` : ''),
      attachmentUrls: tempPreviews,
      replyTo: replyingTo ? {
        _id: replyingTo._id || replyingTo.id,
        content: replyingTo.content,
        senderName: replyingTo.senderName || replyingTo.senderType,
        attachmentUrls: replyingTo.attachmentUrls
      } : null,
      createdAt: new Date().toISOString(),
      isLocal: true // Mark as optimistic
    };
    
    setMessages(prev => [...prev, localMessage]);
    setNewMessage('');
    
    const currentReplyId = replyingTo ? (replyingTo._id || replyingTo.id) : null;
    setReplyingTo(null);
    
    // Store files locally before clearing state so they can upload in background
    const filesToUpload = [...attachments];
    clearAllAttachments();
    
    let uploadedUrls = [];

    // Background upload
    if (filesToUpload.length > 0) {
      setIsUploading(true);
      const formData = new FormData();
      filesToUpload.forEach(file => formData.append('attachments', file));
      
      try {
        const res = await api.post('/chat/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        uploadedUrls = res.data.urls || [];
      } catch (err) {
        console.error('Upload failed:', err);
        // Remove optimistic message if upload fails completely
        setMessages(prev => prev.filter(m => m.id !== localMessage.id));
        setIsUploading(false);
        return; 
      }
      setIsUploading(false);
    }

    // Emit socket event with final URLs
    socket.emit('send_message', {
      groupId: activeGroup.id,
      content: textContent || (filesToUpload.length > 0 ? `Shared ${filesToUpload.length} attachment(s)` : ''),
      attachmentUrls: uploadedUrls,
      replyTo: currentReplyId
    });
  };
  
  const groupMessagesByDate = (msgs) => {
    const groups = {};
    msgs.forEach((msg) => {
      const dateStr = new Date(msg.createdAt).toLocaleDateString(undefined, { 
        weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' 
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

  // Compute unique filters dynamically
  const availableYears = [...new Set(groups.map(g => g.year))].sort();
  const availableStreams = [...new Set(groups.map(g => g.stream))].sort();

  // Filter groups
  const filteredGroups = groups.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          g.stream.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesYear = selectedYear ? g.year === parseInt(selectedYear) : true;
    const matchesStream = selectedStream ? g.stream === selectedStream : true;
    return matchesSearch && matchesYear && matchesStream;
  });

  return (
    <div className="chat-layout premium-glass">
      {/* Sidebar */}
      <div className="chat-sidebar">
        <div className="sidebar-header">
          <MessageSquare size={20} className="sidebar-icon" />
          <h2 className="sidebar-title">Nodes</h2>
        </div>
        
        {/* Dynamic Search & Filter Bar */}
        <div className="sidebar-filters">
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search nodes..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="node-search-input"
            />
          </div>
          <div className="filter-dropdowns">
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(e.target.value)}
              className="node-filter-select"
            >
              <option value="">All Years</option>
              {availableYears.map(year => (
                <option key={year} value={year}>Year {year}</option>
              ))}
            </select>
            <select 
              value={selectedStream} 
              onChange={(e) => setSelectedStream(e.target.value)}
              className="node-filter-select"
            >
              <option value="">All Streams</option>
              {availableStreams.map(stream => (
                <option key={stream} value={stream}>{stream}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="group-list">
          {filteredGroups.length === 0 ? (
            <div className="no-groups">No nodes found.</div>
          ) : (
            filteredGroups.map((group) => (
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
                          onDoubleClick={setReplyingTo}
                        />
                      ))}
                    </React.Fragment>
                  ))}
                  <div ref={messagesEndRef} className="scroll-anchor" />
                </div>
              )}
            </div>

            <div className="chat-input-wrapper">
              {/* Reply Preview Box */}
              {replyingTo && (
                <div className="reply-preview-container animate-fade-in-up">
                  <div className="reply-preview-content">
                    <span className="reply-preview-sender">Replying to {replyingTo.senderName || replyingTo.senderType}</span>
                    <p className="reply-preview-text">
                      {replyingTo.content || (replyingTo.attachmentUrls?.length ? 'Attachment' : '')}
                    </p>
                  </div>
                  <button type="button" className="close-reply-btn" onClick={() => setReplyingTo(null)}>
                    <X size={16} />
                  </button>
                </div>
              )}

              {attachmentPreviews.length > 0 && (
                <div className="attachment-carousel-container animate-fade-in-up">
                  {attachmentPreviews.map((preview, idx) => (
                    <div key={preview.id} className="preview-card">
                      <button type="button" className="close-preview-btn" onClick={() => removeAttachment(idx)}>
                        <X size={12} />
                      </button>
                      {preview.type === 'image' ? (
                        <img src={preview.url} alt="preview" className="preview-image" />
                      ) : (
                        <div className="preview-file">
                          <FileIcon size={24} className="file-icon" />
                          <span className="file-name">{preview.name}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <form className="chat-input-area" onSubmit={handleSendMessage}>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  onChange={handleFileChange} 
                  multiple
                />
                <button 
                  type="button" 
                  className="attach-btn" 
                  title="Attach file"
                  onClick={() => fileInputRef.current?.click()}
                >
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
                  className={`send-btn ${(newMessage.trim() || attachments.length > 0) ? 'active' : ''}`} 
                  disabled={!newMessage.trim() && attachments.length === 0}
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
