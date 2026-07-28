import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { io } from 'socket.io-client';
import { Send, Paperclip, Loader2, MessageSquare, Shield, GraduationCap, Users, X, File as FileIcon, Search, Folder, BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
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

const MessageBubble = ({ msg, isOwnMessage, onDoubleClick, totalMembers }) => {
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
              
                {msg.isNoteFolder ? (
                  <div 
                    onClick={() => window.openFolderModal && window.openFolderModal(msg)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', 
                      background: 'rgba(255,255,255,0.1)', padding: '12px', 
                      borderRadius: '8px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.2)'
                    }}>
                    <Folder size={24} color={isOwnMessage ? '#fff' : '#10b981'} />
                    <div>
                      <div style={{fontWeight: '500', fontSize: '14px', color: isOwnMessage ? '#fff' : '#1f2937'}}>{msg.noteFolderName || 'Shared Note Folder'}</div>
                      <div style={{fontSize: '12px', color: isOwnMessage ? 'rgba(255,255,255,0.7)' : '#6b7280'}}>Click to view files</div>
                    </div>
                  </div>
                ) : (
                  msg.content
                )}
              
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
          {isOwnMessage && !isLocalMessage && (
            <span 
              className="read-receipt-dot" 
              style={{ 
                backgroundColor: (totalMembers > 0 && (msg.seenBy?.length || 0) / totalMembers >= 0.9) ? '#22c55e' : (msg.seenBy?.length > 0 ? '#eab308' : '#ef4444') 
              }} 
              title={`Seen by ${msg.seenBy?.length || 0}/${totalMembers}`}
            ></span>
          )}
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
  
  const [folderModal, setFolderModal] = useState({ open: false, scheduleId: null, sessionId: null, title: '', notes: [], loading: false });
  const [nodeNotesModal, setNodeNotesModal] = useState({ open: false, notes: [], groupedNotes: {}, loading: false, expandedFolders: {} });

  const [autoBagNotes, setAutoBagNotes] = useState(user?.auto_bag_notes !== false);
  const [togglingAutoBag, setTogglingAutoBag] = useState(false);

  useEffect(() => {
    if (user?.role === 'student') {
      api.get('/students/me').then(res => {
        setAutoBagNotes(res.data.auto_bag_notes !== false);
      }).catch(err => console.error("Failed to fetch student profile", err));
    }
  }, [user]);

  const toggleAutoBagNotes = async () => {
    try {
      setTogglingAutoBag(true);
      const newValue = !autoBagNotes;
      await api.patch('/students/me/auto-bag-notes', { auto_bag_notes: newValue });
      setAutoBagNotes(newValue);
    } catch (err) {
      console.error("Failed to toggle auto bag notes", err);
    } finally {
      setTogglingAutoBag(false);
    }
  };

  // Expose function globally for the widget
  useEffect(() => {
    window.openFolderModal = (msg) => {
      setFolderModal({ open: true, scheduleId: msg.scheduleId, sessionId: msg.sessionId, title: msg.noteFolderName, notes: [], loading: true });
      const params = {};
      if (msg.scheduleId) params.schedule_id = msg.scheduleId;
      if (msg.sessionId) params.session_id = msg.sessionId;
      api.get('/notes', { params }).then(res => {
        setFolderModal(p => ({ ...p, notes: res.data, loading: false }));
      }).catch(err => {
        setFolderModal(p => ({ ...p, notes: [], loading: false }));
      });
    };
    return () => { delete window.openFolderModal; };
  }, []);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedStream, setSelectedStream] = useState('');
  
  // Stats & Presence State
  const [groupStats, setGroupStats] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [typingUsers, setTypingUsers] = useState([]);
  const typingTimeoutRef = useRef(null);
  
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
        scrollToBottom();
      } catch (error) {
        console.error("Failed to load messages", error);
      } finally {
        setLoading(false);
      }
    };
    
    const fetchStats = async () => {
      try {
        const res = await api.get(`/chat/groups/${activeGroup.id}/stats`);
        setGroupStats(res.data);
      } catch (error) {
        console.error("Failed to load stats", error);
      }
    };

    fetchMessages();
    fetchStats();

    const token = localStorage.getItem('token');
    const newSocket = io(`${SOCKET_URL}/chat`, { auth: { token } });

    newSocket.on('connect', () => {
      console.log('Connected to Chat Socket');
      newSocket.emit('join_group', activeGroup.id);
    });

    newSocket.on("receive_message", (msg) => {
      setMessages(prev => {
        const index = prev.findIndex(m => m.isLocal && m.content === msg.content);
        if (index !== -1) {
          const newMsgs = [...prev];
          newMsgs[index] = msg;
          return newMsgs;
        }
        return [...prev, msg];
      });
      scrollToBottom();
    });

    newSocket.on("user_typing", ({ userId, name }) => {
      setTypingUsers(prev => {
        if (!prev.find(u => u.userId === userId)) return [...prev, { userId, name }];
        return prev;
      });
    });

    newSocket.on("user_stop_typing", ({ userId }) => {
      setTypingUsers(prev => prev.filter(u => u.userId !== userId));
    });

    newSocket.on("presence_update", ({ onlineClassmates }) => {
      setOnlineUsers(onlineClassmates.length);
    });

    newSocket.on("message_seen", ({ messageId, seenBy }) => {
      setMessages(prev => prev.map(m => (m._id === messageId || m.id === messageId) ? { ...m, seenBy } : m));
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit('leave_group', activeGroup.id);
      setMessages([]);
      setGroupStats(null);
      setTypingUsers([]);
      setOnlineUsers(0);
      newSocket.disconnect();
    };
  }, [activeGroup, user.token]);

  // Mark unseen messages as seen
  useEffect(() => {
    if (socket && activeGroup && messages.length > 0) {
      messages.forEach(msg => {
        if (msg.senderId !== user.id && !msg.isLocal) {
          const hasSeen = msg.seenBy && msg.seenBy.find(s => s.userId === user.id);
          if (!hasSeen) {
            socket.emit('mark_seen', { messageId: msg._id || msg.id, groupId: activeGroup.id });
          }
        }
      });
    }
  }, [messages, socket, activeGroup, user.id]);

  // Handle file selection (Multiple files)
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...files]);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachmentPreviews(prev => [...prev, { name: file.name, url: reader.result }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (socket && activeGroup) {
      socket.emit('typing', { groupId: activeGroup.id, name: user.name });
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop_typing', { groupId: activeGroup.id });
      }, 2000);
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
    if(e) e.preventDefault();
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
    }, (response) => {
      if (response && response.error) {
        console.error('Server error sending message:', response.error);
        alert('Failed to send message: ' + response.error);
        setMessages(prev => prev.filter(m => m.id !== localMessage.id));
      }
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
            <div className="chat-header glass-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="header-avatar">
                  {activeGroup.name.charAt(0).toUpperCase()}
                </div>
                <div className="header-info">
                  <h2>{activeGroup.name}</h2>
                  <div className="header-meta">
                    Year {activeGroup.year} • {activeGroup.stream}
                    {groupStats && ` • ${groupStats.totalStudents} Students • ${groupStats.totalTeachers} Teachers`}
                    {onlineUsers > 0 && ` • 🟢 ${onlineUsers} Online`}
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => {
                  setNodeNotesModal({ open: true, notes: [], groupedNotes: {}, loading: true, expandedFolders: {} });
                  api.get('/notes', { 
                    params: { subject_id: activeGroup.subject_id, year: activeGroup.year, stream: activeGroup.stream }
                  }).then(res => {
                    const notes = res.data;
                    const grouped = notes.reduce((acc, note) => {
                      const date = new Date(note.upload_date || note.created_at).toLocaleDateString('en-GB');
                      if (!acc[date]) acc[date] = [];
                      acc[date].push(note);
                      return acc;
                    }, {});
                    setNodeNotesModal(p => ({ ...p, notes, groupedNotes: grouped, loading: false }));
                  }).catch(err => {
                    setNodeNotesModal(p => ({ ...p, loading: false }));
                    console.error("Failed to fetch node notes:", err);
                  });
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', 
                  padding: '8px 16px', background: '#f3f4f6', 
                  border: '1px solid #e5e7eb', borderRadius: '8px',
                  color: '#374151', fontSize: '14px', fontWeight: '500',
                  cursor: 'pointer', transition: 'all 0.2s',
                  marginRight: '8px'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#e5e7eb'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
              >
                <BookOpen size={18} color="#10b981" />
                Notes
              </button>
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
                          totalMembers={groupStats?.totalMembers || 0}
                        />
                      ))}
                    </React.Fragment>
                  ))}
                  <div ref={messagesEndRef} className="scroll-anchor" />
                </div>
              )}
            </div>

            <div className="chat-input-wrapper">
              {/* Typing Indicator */}
              {typingUsers.length > 0 && (
                <div className="typing-indicator animate-fade-in-up">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <span>{typingUsers.map(u => u.name).join(', ')} {typingUsers.length > 1 ? 'are' : 'is'} typing...</span>
                </div>
              )}

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
                    <div key={idx} className="preview-card">
                      <button type="button" className="close-preview-btn" onClick={() => removeAttachment(idx)}>
                        <X size={12} />
                      </button>
                      {preview.url ? (
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
                <div className="chat-input-container">
                  <input 
                    type="text" 
                    placeholder="Type your message..." 
                    value={newMessage}
                    onChange={handleTyping}
                    onKeyPress={(e) => e.key === 'Enter' && !isUploading && handleSendMessage()}
                    disabled={isUploading}
                  />
                </div>
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

      {/* Folder Viewer Modal (From Message) */}
      {folderModal.open && createPortal(
        <div className="sess-modal-overlay animate-fade-in" onClick={() => setFolderModal(p => ({ ...p, open: false }))} style={{position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <div className="sess-modal animate-scale-in" onClick={e => e.stopPropagation()} style={{background: 'white', borderRadius: '12px', width: '90%', maxWidth: '500px', overflow: 'hidden'}}>
            <div className="sess-modal-header" style={{padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <div>
                <h2 style={{margin: 0, fontSize: '18px', color: '#111827'}}>{folderModal.title || 'Shared Note Folder'}</h2>
                <p style={{margin: '4px 0 0', fontSize: '13px', color: '#6b7280'}}>Live latest files from this session</p>
              </div>
              <button onClick={() => setFolderModal(p => ({ ...p, open: false }))} style={{background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af'}}>
                <X size={20} />
              </button>
            </div>
            <div style={{padding: '20px', maxHeight: '400px', overflowY: 'auto'}}>
              {folderModal.loading ? (
                <div style={{display: 'flex', justifyContent: 'center', padding: '20px'}}><Loader2 className="animate-spin" size={32} /></div>
              ) : folderModal.notes.length === 0 ? (
                <div style={{textAlign: 'center', color: '#6b7280', padding: '20px'}}>No files found in this folder.</div>
              ) : (
                <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                  {folderModal.notes.map(note => (
                    <div key={note.id} style={{display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px'}}>
                      <FileIcon size={24} color="#6366f1" />
                      <div style={{flex: 1, minWidth: 0}}>
                        <a href={note.file_url} target="_blank" rel="noreferrer" style={{display: 'block', fontWeight: '500', color: '#1f2937', textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                          {note.file_name}
                        </a>
                        <div style={{fontSize: '12px', color: '#6b7280'}}>
                          {new Date(note.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Node Notes Modal (From Header Button) */}
      {nodeNotesModal.open && createPortal(
        <div className="sess-modal-overlay animate-fade-in" onClick={() => setNodeNotesModal(p => ({ ...p, open: false }))} style={{position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <div className="sess-modal animate-scale-in" onClick={e => e.stopPropagation()} style={{background: 'white', borderRadius: '16px', width: '90%', maxWidth: '700px', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'}}>
            
            {/* Modal Header */}
            <div className="sess-modal-header" style={{padding: '24px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#fafafa'}}>
              <div style={{display: 'flex', gap: '16px', alignItems: 'center'}}>
                <div style={{background: '#d1fae5', padding: '12px', borderRadius: '12px', color: '#10b981'}}>
                  <BookOpen size={28} />
                </div>
                <div>
                  <h2 style={{margin: 0, fontSize: '22px', color: '#111827', fontWeight: '600'}}>All Node Notes</h2>
                  <p style={{margin: '4px 0 0', fontSize: '14px', color: '#6b7280'}}>
                    {activeGroup?.name} • Year {activeGroup?.year} ({activeGroup?.stream})
                  </p>
                </div>
              </div>
              <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
                {user?.role === 'student' && (
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <span style={{fontSize: '14px', color: '#4b5563', fontWeight: '500'}}>Auto-add to My Bag</span>
                    <button 
                      onClick={toggleAutoBagNotes}
                      disabled={togglingAutoBag}
                      style={{
                        position: 'relative', width: '44px', height: '24px', borderRadius: '999px',
                        border: 'none', cursor: togglingAutoBag ? 'not-allowed' : 'pointer',
                        background: autoBagNotes ? '#10b981' : '#d1d5db',
                        transition: 'background-color 0.2s', opacity: togglingAutoBag ? 0.7 : 1
                      }}
                    >
                      <span style={{
                        position: 'absolute', top: '2px', left: autoBagNotes ? '22px' : '2px',
                        width: '20px', height: '20px', background: 'white', borderRadius: '50%',
                        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                      }} />
                    </button>
                  </div>
                )}
                <button onClick={() => setNodeNotesModal(p => ({ ...p, open: false }))} style={{background: '#f3f4f6', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer', color: '#6b7280', transition: 'all 0.2s'}}>
                  <X size={20} />
                </button>
              </div>
            </div>
            
            {/* Modal Content */}
            <div style={{padding: '24px', overflowY: 'auto', flex: 1, background: '#fff'}}>
              {nodeNotesModal.loading ? (
                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '16px', color: '#6b7280'}}>
                  <Loader2 className="animate-spin" size={40} color="#10b981" />
                  <p>Loading notes...</p>
                </div>
              ) : nodeNotesModal.notes.length === 0 ? (
                <div style={{textAlign: 'center', color: '#6b7280', padding: '60px 20px', background: '#f9fafb', borderRadius: '12px'}}>
                  <Folder size={48} color="#9ca3af" style={{marginBottom: '16px'}} />
                  <h3 style={{margin: '0 0 8px', color: '#374151', fontSize: '18px'}}>No Notes Found</h3>
                  <p style={{margin: 0}}>There are no notes uploaded for this node yet.</p>
                </div>
              ) : (
                <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
                  {Object.entries(nodeNotesModal.groupedNotes).map(([date, notes]) => {
                    const isExpanded = nodeNotesModal.expandedFolders?.[date];
                    return (
                      <div key={date} style={{background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden'}}>
                        
                        <div 
                          onClick={() => setNodeNotesModal(p => ({
                            ...p, 
                            expandedFolders: {
                              ...(p.expandedFolders || {}),
                              [date]: !(p.expandedFolders || {})[date]
                            }
                          }))}
                          style={{padding: '16px', background: '#f3f4f6', borderBottom: isExpanded ? '1px solid #e5e7eb' : 'none', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer'}}
                        >
                          {isExpanded ? <ChevronDown size={20} color="#6b7280" /> : <ChevronRight size={20} color="#6b7280" />}
                          <Folder size={20} color="#4f46e5" />
                          <h3 style={{margin: 0, fontSize: '16px', color: '#1f2937', fontWeight: '600'}}>Folder: {date}</h3>
                          <span style={{marginLeft: 'auto', background: '#e0e7ff', color: '#4f46e5', padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '500'}}>
                            {notes.length} file{notes.length !== 1 && 's'}
                          </span>
                        </div>
                        
                        {isExpanded && (
                          <div style={{padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px'}}>
                            {notes.map(note => (
                              <div key={note.id} style={{display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'}}>
                                <div style={{background: '#eff6ff', padding: '10px', borderRadius: '8px', color: '#3b82f6'}}>
                                  <FileIcon size={20} />
                                </div>
                                <div style={{flex: 1, minWidth: 0}}>
                                  <a href={note.file_url} target="_blank" rel="noreferrer" style={{display: 'block', fontWeight: '500', color: '#1f2937', textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '14px'}}>
                                    {note.file_name}
                                  </a>
                                  <div style={{fontSize: '12px', color: '#6b7280', marginTop: '2px'}}>
                                    Uploaded {new Date(note.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default Chat;
