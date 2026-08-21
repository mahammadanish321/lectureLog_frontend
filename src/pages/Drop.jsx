import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, MessageCircle, ArrowBigUp, ArrowBigDown, Clock, TrendingUp, Award, X, Loader2, Send, Share2, MoreHorizontal, Image, Paperclip, Bookmark, Repeat, Download, FileText, ChevronLeft, ChevronRight, Pencil, EyeOff, Trash2, ChevronDown, Eye, RotateCcw, Copy } from 'lucide-react';
import api from '../api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import './Drop.css';

export const timeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
};

export const isImageUrl = (url) => {
  if (!url) return false;
  const cleanUrl = url.split('?')[0].toLowerCase();
  return (
    cleanUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)$/) !== null ||
    cleanUrl.includes('/image/upload/')
  );
};

export const parseMediaItems = (item) => {
  if (!item) return [];
  let items = [];
  
  if (item.media_urls) {
    let parsed = item.media_urls;
    if (typeof parsed === 'string') {
      try { parsed = JSON.parse(parsed); } catch (e) { parsed = []; }
    }
    if (Array.isArray(parsed) && parsed.length > 0) {
      items = parsed.map(m => typeof m === 'string' ? { url: m, fileName: '' } : m);
    }
  }

  if (items.length === 0 && item.media_url) {
    items.push({ url: item.media_url, fileName: item.file_name || '' });
  }

  return items;
};

export const RenderGallery = ({ item, onExpandImage }) => {
  const attachments = parseMediaItems(item);
  if (attachments.length === 0) return null;

  const images = attachments.filter(a => isImageUrl(a.url));
  const files = attachments.filter(a => !isImageUrl(a.url));

  return (
    <div className="drop-attachments-wrapper" onClick={(e) => e.stopPropagation()}>
      {images.length > 0 && (
        <div className={`drop-image-gallery count-${Math.min(images.length, 4)}`}>
          {images.slice(0, 4).map((img, index) => {
            const hasMore = images.length > 4 && index === 3;
            return (
              <div 
                key={index} 
                className="drop-gallery-item"
                onClick={() => onExpandImage(images, index)}
              >
                <img src={img.url} alt={img.fileName || "attachment"} className="drop-gallery-img" />
                {hasMore && (
                  <div className="drop-gallery-overlay">
                    <span>+{images.length - 3}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {files.length > 0 && (
        <div className="drop-files-list">
          {files.map((file, index) => (
            <a 
              key={index}
              href={file.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="drop-file-chip"
            >
              <Paperclip size={14} />
              <span className="drop-file-chip-name">{file.fileName || 'Attached File'}</span>
              <Download size={14} />
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

const buildCommentTree = (comments) => {
  if (!comments) return [];
  const commentMap = {};
  const rootComments = [];
  
  comments.forEach(comment => {
    commentMap[comment.id] = { ...comment, children: [] };
  });

  comments.forEach(comment => {
    if (comment.parent_id) {
      if (commentMap[comment.parent_id]) {
        commentMap[comment.parent_id].children.push(commentMap[comment.id]);
      }
    } else {
      rootComments.push(commentMap[comment.id]);
    }
  });

  return rootComments;
};

const CommentItem = ({ comment, getAvatar, timeAgo, onVote, onDelete, user, onReplyClick, onExpandImage }) => {
  return (
    <div className="comment-thread">
      <div className="comment-item animate-fade-in">
        {getAvatar(comment.author_name, comment.author_image)}
        <span className="comment-author">{comment.author_name}</span>
        <span className="comment-dot">·</span>
        <span className="comment-time">{timeAgo(comment.created_at)}</span>
      </div>
      <div className="comment-content-area">
        {comment.body && <div className="comment-text">{comment.body}</div>}
        <RenderGallery item={comment} onExpandImage={onExpandImage} />
        <div className="comment-footer">
          <div className="comment-vote-group">
            <button 
              className={`comment-vote-btn ${comment.user_vote === 1 ? 'upvoted' : ''}`}
              onClick={() => onVote(comment.id, comment.user_vote, 1)}
            >
              <ArrowBigUp size={16} />
            </button>
            <span className="comment-vote-score">{comment.score}</span>
            <button 
              className={`comment-vote-btn ${comment.user_vote === -1 ? 'downvoted' : ''}`}
              onClick={() => onVote(comment.id, comment.user_vote, -1)}
            >
              <ArrowBigDown size={16} />
            </button>
          </div>
          <button className="comment-action-btn" onClick={() => onReplyClick(comment)}>
            <MessageCircle size={14} /> Reply
          </button>
          {(user?.role === 'admin' || user?.id === comment.author_id) && (
            <button className="comment-action-btn delete-btn" onClick={() => onDelete(comment.id)}>
              Delete
            </button>
          )}
        </div>

        {comment.children && comment.children.length > 0 && (
          <div className="comment-children">
            {comment.children.map(child => (
              <CommentItem 
                key={child.id} 
                comment={child} 
                getAvatar={getAvatar}
                timeAgo={timeAgo}
                onVote={onVote} 
                onDelete={onDelete} 
                user={user}
                onReplyClick={onReplyClick}
                onExpandImage={onExpandImage}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const Drop = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [drops, setDrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('hot');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Create Post state
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Comment Panel State
  const [selectedDropId, setSelectedDropId] = useState(null);
  const [selectedDropDetail, setSelectedDropDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const commentInputRef = useRef(null);

  // Lightbox Image Preview state: { images: [{ url, fileName }], index: 0 }
  const [lightboxData, setLightboxData] = useState(null);

  const handleOpenLightbox = (imagesList, selectedIndex = 0) => {
    if (!imagesList || imagesList.length === 0) return;
    const formatted = imagesList.map(img => typeof img === 'string' ? { url: img, fileName: '' } : img);
    setLightboxData({ images: formatted, index: selectedIndex });
  };

  useEffect(() => {
    if (!lightboxData) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setLightboxData(null);
      if (e.key === 'ArrowLeft' && lightboxData.images.length > 1) {
        setLightboxData(prev => ({ ...prev, index: (prev.index - 1 + prev.images.length) % prev.images.length }));
      }
      if (e.key === 'ArrowRight' && lightboxData.images.length > 1) {
        setLightboxData(prev => ({ ...prev, index: (prev.index + 1) % prev.images.length }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxData]);

  // 3-Dot Menu & Header Filter State
  const [viewFilter, setViewFilter] = useState('all'); // 'all', 'saved', 'reposts', 'hidden', 'deleted'
  const [adminHideTab, setAdminHideTab] = useState('all'); // 'all' (Posts Hidden by Admin) vs 'my' for admin
  const [showCompactHeaderCreateBtn, setShowCompactHeaderCreateBtn] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [activeMenuDropId, setActiveMenuDropId] = useState(null);

  const scrollRafRef = useRef(null);
  const commentCacheRef = useRef({});
  const [hiddenDropIds, setHiddenDropIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hidden_drop_ids')) || []; } catch(e) { return []; }
  });
  const [savedDropIds, setSavedDropIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('saved_drop_ids')) || []; } catch(e) { return []; }
  });
  const [repostedDropIds, setRepostedDropIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('reposted_drop_ids')) || []; } catch(e) { return []; }
  });

  const [editingDrop, setEditingDrop] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editAttachments, setEditAttachments] = useState([]);
  const [updatingDrop, setUpdatingDrop] = useState(false);

  // Share Modal State & Handlers
  const [shareModalDrop, setShareModalDrop] = useState(null);
  const [userNodes, setUserNodes] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState('');
  const [loadingNodes, setLoadingNodes] = useState(false);
  const [sharingToNode, setSharingToNode] = useState(false);

  const handleOpenShareModal = async (e, drop) => {
    e.stopPropagation();
    setShareModalDrop(drop);
    setLoadingNodes(true);
    try {
      const res = await api.get('/chat/groups');
      setUserNodes(res.data || []);
      if (res.data && res.data.length > 0) {
        setSelectedNodeId(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch user nodes for sharing:', err);
    } finally {
      setLoadingNodes(false);
    }
  };

  const handleCopyDropLink = () => {
    if (!shareModalDrop) return;
    const link = `${window.location.origin}/drop?id=${shareModalDrop.id}`;
    navigator.clipboard.writeText(link);
    addToast('Link copied to clipboard!', 'success');
    setShareModalDrop(null);
  };

  const handleShareToNodeSubmit = async () => {
    if (!shareModalDrop || !selectedNodeId) return;
    setSharingToNode(true);
    try {
      await api.post('/chat/share-drop', {
        groupId: parseInt(selectedNodeId, 10),
        dropId: parseInt(shareModalDrop.id, 10),
        dropTitle: shareModalDrop.title || 'Shared Drop',
        dropBody: shareModalDrop.body || '',
        dropAuthor: shareModalDrop.author_name || 'Anonymous'
      });
      const selectedNode = userNodes.find(n => parseInt(n.id, 10) === parseInt(selectedNodeId, 10));
      addToast(`Drop shared to ${selectedNode?.name || 'Node'}!`, 'success');
      setShareModalDrop(null);
    } catch (err) {
      console.error('[Share Drop Error]:', err?.response?.data || err);
      const errMsg = err?.response?.data?.message || 'Failed to share drop to node';
      addToast(errMsg, 'error');
    } finally {
      setSharingToNode(false);
    }
  };

  const isDropAuthor = useCallback((drop) => {
    if (!user || !drop) return false;
    if (user.role === 'student') return drop.author_student_id === user.id;
    return drop.author_teacher_id === user.id;
  }, [user]);

  useEffect(() => {
    const handleClickOutside = () => {
      setActiveMenuDropId(null);
      setShowHeaderMenu(false);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleToggleSaveDrop = (e, dropId) => {
    e.stopPropagation();
    let updated;
    if (savedDropIds.includes(dropId)) {
      updated = savedDropIds.filter(id => id !== dropId);
      addToast('Post removed from saved', 'info');
    } else {
      updated = [...savedDropIds, dropId];
      addToast('Post saved!', 'success');
    }
    setSavedDropIds(updated);
    localStorage.setItem('saved_drop_ids', JSON.stringify(updated));
  };

  const handleToggleRepostDrop = (e, dropId) => {
    e.stopPropagation();
    let updated;
    if (repostedDropIds.includes(dropId)) {
      updated = repostedDropIds.filter(id => id !== dropId);
      addToast('Repost removed', 'info');
    } else {
      updated = [...repostedDropIds, dropId];
      addToast('Post reposted to your profile!', 'success');
    }
    setRepostedDropIds(updated);
    localStorage.setItem('reposted_drop_ids', JSON.stringify(updated));
  };

  const handleUnhideDrop = (e, dropId) => {
    e.stopPropagation();
    const updated = hiddenDropIds.filter(id => id !== dropId);
    setHiddenDropIds(updated);
    localStorage.setItem('hidden_drop_ids', JSON.stringify(updated));
    addToast('Post unhidden and restored to feed', 'success');
  };

  const handleHideDrop = (e, dropId) => {
    e.stopPropagation();
    setActiveMenuDropId(null);
    const updated = [...hiddenDropIds, dropId];
    setHiddenDropIds(updated);
    localStorage.setItem('hidden_drop_ids', JSON.stringify(updated));
    addToast('Post hidden from your feed', 'info');
    if (selectedDropId === dropId) setSelectedDropId(null);
  };

  const handleDeleteDrop = async (e, dropId) => {
    e.stopPropagation();
    setActiveMenuDropId(null);
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await api.delete(`/drops/${dropId}`);
      addToast('Post deleted', 'success');
      setDrops(prev => prev.filter(d => d.id !== dropId));
      if (selectedDropId === dropId) setSelectedDropId(null);
    } catch (err) {
      addToast('Failed to delete post', 'error');
    }
  };

  const handleRestoreDrop = async (e, dropId) => {
    e.stopPropagation();
    setActiveMenuDropId(null);
    try {
      await api.post(`/drops/${dropId}/restore`);
      addToast('Post restored to feed!', 'success');
      setDrops(prev => prev.filter(d => d.id !== dropId));
      if (selectedDropId === dropId) setSelectedDropId(null);
    } catch (err) {
      addToast('Failed to restore post', 'error');
    }
  };

  const handleAdminToggleHide = async (e, dropId, shouldHide) => {
    e.stopPropagation();
    setActiveMenuDropId(null);
    try {
      await api.post(`/drops/${dropId}/hide-admin`, { hide: shouldHide });
      addToast(shouldHide ? 'Post forcefully hidden globally' : 'Post unhidden globally for everyone', 'success');
      setDrops(prev => prev.map(d => d.id === dropId ? { ...d, is_hidden_by_admin: shouldHide } : d));
      if (selectedDropId === dropId) setSelectedDropId(null);
    } catch (err) {
      addToast('Failed to update post hide status', 'error');
    }
  };

  const handleStartEdit = (e, drop) => {
    e.stopPropagation();
    setActiveMenuDropId(null);
    setEditingDrop(drop);
    setEditTitle(drop.title || '');
    setEditBody(drop.body || '');
    setEditAttachments(parseMediaItems(drop));
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      addToast('Please write a title', 'error');
      return;
    }
    setUpdatingDrop(true);
    try {
      const res = await api.put(`/drops/${editingDrop.id}`, {
        title: editTitle,
        body: editBody,
        media_url: editAttachments[0]?.url || null,
        file_name: editAttachments[0]?.fileName || null,
        media_urls: editAttachments.map(a => ({ url: a.url, fileName: a.fileName }))
      });
      addToast('Post updated successfully', 'success');
      setDrops(prev => prev.map(d => d.id === editingDrop.id ? { ...d, ...res.data } : d));
      if (selectedDropDetail && selectedDropDetail.id === editingDrop.id) {
        setSelectedDropDetail(prev => ({ ...prev, ...res.data }));
      }
      setEditingDrop(null);
    } catch (err) {
      addToast('Failed to update post', 'error');
    } finally {
      setUpdatingDrop(false);
    }
  };

  // Attachments state (up to 10 files)
  const [postAttachments, setPostAttachments] = useState([]); // [{ url, fileName, isImage }]
  const [uploadingPostFile, setUploadingPostFile] = useState(false);
  const postFileInputRef = useRef(null);

  const [commentAttachments, setCommentAttachments] = useState([]); // [{ url, fileName, isImage }]
  const [uploadingCommentFile, setUploadingCommentFile] = useState(false);
  const commentFileInputRef = useRef(null);

  const handleFileUpload = async (filesList) => {
    const formData = new FormData();
    Array.from(filesList).forEach(file => {
      formData.append('files', file);
    });
    const res = await api.post('/drops/upload', formData);
    const uploaded = res.data.files || [{ url: res.data.url, fileName: res.data.fileName, mimeType: res.data.mimeType }];
    return uploaded.map(f => ({
      url: f.url,
      fileName: f.fileName,
      isImage: isImageUrl(f.url) || (f.mimeType && f.mimeType.startsWith('image/'))
    }));
  };

  const handlePostFilesSelect = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (postAttachments.length + files.length > 10) {
      addToast('Maximum 10 files allowed per post', 'error');
      return;
    }
    setUploadingPostFile(true);
    try {
      const uploaded = await handleFileUpload(files);
      setPostAttachments(prev => [...prev, ...uploaded].slice(0, 10));
      addToast(`${uploaded.length} file(s) attached`, 'success');
    } catch (err) {
      console.error('[Upload Error]', err.response?.data || err.message);
      addToast('Failed to upload file(s)', 'error');
    } finally {
      setUploadingPostFile(false);
      e.target.value = '';
    }
  };

  const handleCommentFilesSelect = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (commentAttachments.length + files.length > 10) {
      addToast('Maximum 10 files allowed per comment', 'error');
      return;
    }
    setUploadingCommentFile(true);
    try {
      const uploaded = await handleFileUpload(files);
      setCommentAttachments(prev => [...prev, ...uploaded].slice(0, 10));
      addToast(`${uploaded.length} attachment(s) ready`, 'success');
    } catch (err) {
      console.error('[Upload Error]', err.response?.data || err.message);
      addToast('Failed to upload file(s)', 'error');
    } finally {
      setUploadingCommentFile(false);
      e.target.value = '';
    }
  };

  const handleReplyClick = (comment) => {
    setReplyingTo({ id: comment.id, author_name: comment.author_name });
    if (commentInputRef.current) {
      commentInputRef.current.focus();
    }
  };

  const fetchDrops = useCallback(async (reset = false, fetchDeleted = false, fetchHiddenAdmin = false, fetchMyPosts = false) => {
    try {
      const currentPage = reset ? 1 : page;
      if (reset) setLoading(true);
      let url = `/drops?sort=${sort}&page=${currentPage}&limit=20`;
      if (fetchDeleted) {
        url = `/drops?deleted=true&page=${currentPage}&limit=20`;
      } else if (fetchHiddenAdmin) {
        url = `/drops?hidden_admin=true&page=${currentPage}&limit=20`;
      } else if (fetchMyPosts) {
        url = `/drops?my_posts=true&page=${currentPage}&limit=20`;
      }
      const res = await api.get(url);
      if (reset) {
        setDrops(res.data.drops);
      } else {
        setDrops(prev => [...prev, ...res.data.drops]);
      }
      setTotalPages(res.data.totalPages);
      setPage(res.data.page);
    } catch (err) {
      addToast('Failed to load drops', 'error');
    } finally {
      setLoading(false);
    }
  }, [sort, page, addToast]);

  useEffect(() => {
    fetchDrops(true);
  }, [sort]);

  // Fetch full details for the selected drop (for comments) with in-memory caching
  useEffect(() => {
    if (!selectedDropId) {
      setSelectedDropDetail(null);
      return;
    }

    // Check cache first for instant 0ms load
    if (commentCacheRef.current[selectedDropId]) {
      setSelectedDropDetail(commentCacheRef.current[selectedDropId]);
      return;
    }

    const fetchDropDetail = async () => {
      setDetailLoading(true);
      try {
        const res = await api.get(`/drops/${selectedDropId}`);
        commentCacheRef.current[selectedDropId] = res.data.drop;
        setSelectedDropDetail(res.data.drop);
      } catch (err) {
        addToast('Failed to load drop details', 'error');
        setSelectedDropId(null);
      } finally {
        setDetailLoading(false);
      }
    };
    fetchDropDetail();
  }, [selectedDropId, addToast]);

  const handleVote = async (e, dropId, currentVote, voteType, isComment = false) => {
    if (e) e.stopPropagation();
    let newVote = voteType;
    if (currentVote === voteType) newVote = 0;

    // Optimistic Update for List
    if (!isComment) {
      setDrops(prev => prev.map(drop => {
        if (drop.id === dropId) {
          let scoreDiff = 0;
          if (currentVote === 1) scoreDiff -= 1;
          else if (currentVote === -1) scoreDiff += 1;
          if (newVote === 1) scoreDiff += 1;
          else if (newVote === -1) scoreDiff -= 1;
          return { ...drop, user_vote: newVote, score: drop.score + scoreDiff };
        }
        return drop;
      }));

      // Also update selected detail if it's the active one
      if (selectedDropDetail && selectedDropDetail.id === dropId) {
        setSelectedDropDetail(prev => {
          let scoreDiff = 0;
          if (currentVote === 1) scoreDiff -= 1;
          else if (currentVote === -1) scoreDiff += 1;
          if (newVote === 1) scoreDiff += 1;
          else if (newVote === -1) scoreDiff -= 1;
          return { ...prev, user_vote: newVote, score: prev.score + scoreDiff };
        });
      }
    } else {
      // Optimistic update for comment
      if (selectedDropDetail) {
        setSelectedDropDetail(prev => ({
          ...prev,
          comments: prev.comments.map(c => {
            if (c.id === dropId) {
              let scoreDiff = 0;
              if (currentVote === 1) scoreDiff -= 1;
              else if (currentVote === -1) scoreDiff += 1;
              if (newVote === 1) scoreDiff += 1;
              else if (newVote === -1) scoreDiff -= 1;
              return { ...c, user_vote: newVote, score: c.score + scoreDiff };
            }
            return c;
          })
        }));
      }
    }

    try {
      if (isComment) {
        await api.post(`/drops/comments/${dropId}/vote`, { vote: newVote });
      } else {
        await api.post(`/drops/${dropId}/vote`, { vote: newVote });
      }
    } catch (err) {
      addToast('Failed to record vote', 'error');
      // Simple revert: just refetch
      if (isComment) {
        if (selectedDropId) {
          const res = await api.get(`/drops/${selectedDropId}`);
          setSelectedDropDetail(res.data.drop);
        }
      } else {
        fetchDrops(true);
      }
    }
  };

  const handleCreateDrop = async () => {
    if (!newTitle.trim()) {
      addToast('Please write something first', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/drops', { 
        title: newTitle, 
        body: newBody,
        media_url: postAttachments[0]?.url || null,
        file_name: postAttachments[0]?.fileName || null,
        media_urls: postAttachments.map(a => ({ url: a.url, fileName: a.fileName }))
      });
      addToast('Post shared!', 'success');
      setNewTitle('');
      setNewBody('');
      setPostAttachments([]);
      setShowModal(false);
      fetchDrops(true);
    } catch (err) {
      addToast('Failed to create post', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddComment = async (parentId = null, bodyText = null) => {
    let targetParentId = null;
    if (typeof parentId === 'number' || (typeof parentId === 'string' && parentId.trim() !== '')) {
      targetParentId = parentId;
    } else if (replyingTo && replyingTo.id) {
      targetParentId = replyingTo.id;
    }

    const body = (typeof bodyText === 'string' && bodyText) ? bodyText : commentBody;
    if ((!body || !body.trim()) && commentAttachments.length === 0) return;
    if (!selectedDropId) return;

    if (!targetParentId) setCommentSubmitting(true);
    try {
      await api.post(`/drops/${selectedDropId}/comments`, { 
        body: body || '', 
        parent_id: targetParentId,
        media_url: commentAttachments[0]?.url || null,
        file_name: commentAttachments[0]?.fileName || null,
        media_urls: commentAttachments.map(a => ({ url: a.url, fileName: a.fileName }))
      });
      addToast('Comment added', 'success');
      setCommentBody('');
      setCommentAttachments([]);
      setReplyingTo(null);
      
      // Refetch detail to get new comment
      const res = await api.get(`/drops/${selectedDropId}`);
      setSelectedDropDetail(res.data.drop);
      
      // Optimistically update comment count in the list
      setDrops(prev => prev.map(d => {
        if (d.id === selectedDropId) {
          return { ...d, comment_count: (parseInt(d.comment_count) || 0) + 1 };
        }
        return d;
      }));

    } catch (err) {
      addToast('Failed to add comment', 'error');
    } finally {
      if (!parentId) setCommentSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await api.delete(`/drops/comments/${commentId}`);
      addToast('Comment deleted', 'success');
      setSelectedDropDetail(prev => ({
        ...prev,
        comments: prev.comments.filter(c => c.id !== commentId)
      }));
      setDrops(prev => prev.map(d => {
        if (d.id === selectedDropId) {
          return { ...d, comment_count: Math.max(0, (parseInt(d.comment_count) || 0) - 1) };
        }
        return d;
      }));
    } catch (err) {
      addToast('Failed to delete comment', 'error');
    }
  };

  const getAvatar = (name, imgUrl) => {
    if (imgUrl) return <img src={imgUrl} alt={name} className="drop-avatar" />;
    return <div className="drop-avatar">{name?.charAt(0)?.toUpperCase()}</div>;
  };

  // Scroll spy to auto-select drop & trigger compact header create post button (RAF Throttled for 60-120fps smooth scrolling)
  const handleScroll = useCallback((e) => {
    const container = e.target;
    const scrollTop = container.scrollTop;

    // Fast boolean state update without DOM querying
    const shouldShowCompact = scrollTop > 60;
    setShowCompactHeaderCreateBtn(prev => prev !== shouldShowCompact ? shouldShowCompact : prev);

    // Throttle heavy DOM layout calculations to requestAnimationFrame (16ms)
    if (scrollRafRef.current) return;

    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      const cards = container.querySelectorAll('.drop-card');
      if (cards.length === 0) return;

      // If scrolled to the very top, select the first post
      if (scrollTop < 100) {
        const firstId = cards[0].getAttribute('data-id');
        setSelectedDropId(prev => prev !== firstId ? firstId : prev);
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const triggerY = containerRect.top + 180;
      
      for (let card of cards) {
        const rect = card.getBoundingClientRect();
        if (rect.top <= triggerY && rect.bottom >= triggerY) {
          const id = card.getAttribute('data-id');
          if (id) {
            setSelectedDropId(prev => prev !== id ? id : prev);
          }
          break;
        }
      }
    });
  }, []);

  // Auto-select first drop on load if none selected
  useEffect(() => {
    if (drops.length > 0 && !selectedDropId) {
      setSelectedDropId(drops[0].id);
    }
  }, [drops, selectedDropId]);

  const getDisplayedDrops = () => {
    if (viewFilter === 'saved') {
      return drops.filter(d => savedDropIds.includes(d.id) && !d.is_deleted && !d.is_hidden_by_admin);
    }
    if (viewFilter === 'reposts') {
      return drops.filter(d => repostedDropIds.includes(d.id) && !d.is_deleted && !d.is_hidden_by_admin);
    }
    if (viewFilter === 'my_posts') {
      return drops.filter(d => isDropAuthor(d) && !d.is_deleted);
    }
    if (viewFilter === 'hidden') {
      if (user?.role === 'admin' && adminHideTab === 'all') {
        return drops.filter(d => d.is_hidden_by_admin && !d.is_deleted);
      }
      return drops.filter(d => (hiddenDropIds.includes(d.id) || (isDropAuthor(d) && d.is_hidden_by_admin)) && !d.is_deleted);
    }
    if (viewFilter === 'deleted') {
      return drops.filter(d => d.is_deleted);
    }
    return drops.filter(d => !hiddenDropIds.includes(d.id) && !d.is_deleted && !d.is_hidden_by_admin);
  };

  const displayedDrops = getDisplayedDrops();

  return (
    <div className="drop-page animate-fade-in">
      <div className="drop-header">
        <div className="drop-header-left-group">
          <div className="drop-header-dropdown-wrapper" onClick={e => e.stopPropagation()}>
            <button 
              className="drop-header-title-btn" 
              onClick={() => setShowHeaderMenu(prev => !prev)}
              title="Switch feed view"
            >
              <Flame className="text-orange-500" size={28} />
              <span className="drop-header-title-text">
                {viewFilter === 'all' && 'Drop'}
                {viewFilter === 'my_posts' && 'My Posts'}
                {viewFilter === 'saved' && 'Saved Posts'}
                {viewFilter === 'reposts' && 'My Reposts'}
                {viewFilter === 'hidden' && 'Hidden Posts'}
                {viewFilter === 'deleted' && 'Deleted Posts'}
              </span>
              <ChevronDown size={20} className={`drop-header-chevron ${showHeaderMenu ? 'open' : ''}`} />
            </button>

            {showHeaderMenu && (
              <div className="drop-header-menu animate-fade-in" onClick={e => e.stopPropagation()}>
                <button 
                  className={`drop-header-menu-item ${viewFilter === 'all' ? 'active' : ''}`}
                  onClick={() => { setViewFilter('all'); setShowHeaderMenu(false); fetchDrops(true, false); }}
                >
                  <Flame size={16} className="text-orange-500" /> All Drops
                </button>
                <button 
                  className={`drop-header-menu-item ${viewFilter === 'my_posts' ? 'active' : ''}`}
                  onClick={() => { setViewFilter('my_posts'); setShowHeaderMenu(false); fetchDrops(true, false, false, true); }}
                >
                  <FileText size={16} className="text-purple-500" /> My Posts
                </button>
                <button 
                  className={`drop-header-menu-item ${viewFilter === 'saved' ? 'active' : ''}`}
                  onClick={() => { setViewFilter('saved'); setShowHeaderMenu(false); fetchDrops(true, false); }}
                >
                  <Bookmark size={16} className="text-blue-500" /> Saved Posts ({savedDropIds.length})
                </button>
                <button 
                  className={`drop-header-menu-item ${viewFilter === 'reposts' ? 'active' : ''}`}
                  onClick={() => { setViewFilter('reposts'); setShowHeaderMenu(false); fetchDrops(true, false); }}
                >
                  <Repeat size={16} className="text-emerald-500" /> My Reposts ({repostedDropIds.length})
                </button>
                <button 
                  className={`drop-header-menu-item ${viewFilter === 'hidden' ? 'active' : ''}`}
                  onClick={() => { 
                    setViewFilter('hidden'); 
                    setShowHeaderMenu(false); 
                    if (user?.role === 'admin') {
                      setAdminHideTab('all');
                    }
                    fetchDrops(true, false, true); 
                  }}
                >
                  <EyeOff size={16} className="text-gray-400" /> Hidden Posts {user?.role !== 'admin' && `(${hiddenDropIds.length})`}
                </button>
                {(user?.role === 'admin' || viewFilter === 'deleted') && (
                  <button 
                    className={`drop-header-menu-item ${viewFilter === 'deleted' ? 'active' : ''}`}
                    onClick={() => { setViewFilter('deleted'); setShowHeaderMenu(false); fetchDrops(true, true); }}
                  >
                    <Trash2 size={16} className="text-red-500" /> Deleted Posts
                  </button>
                )}
              </div>
            )}
          </div>

          {viewFilter === 'all' && (
            <button 
              className={`drop-compact-create-btn ${showCompactHeaderCreateBtn ? 'visible' : ''}`}
              onClick={() => setShowModal(true)}
              title="Create a new post"
            >
              <Pencil size={15} />
              <span>+ Post</span>
            </button>
          )}
        </div>

        {viewFilter === 'all' && (
          <div className="drop-sort-tabs">
            <button className={`drop-sort-tab ${sort === 'hot' ? 'active' : ''}`} onClick={() => setSort('hot')}>
              <TrendingUp size={16} /> Hot
            </button>
            <button className={`drop-sort-tab ${sort === 'new' ? 'active' : ''}`} onClick={() => setSort('new')}>
              <Clock size={16} /> New
            </button>
            <button className={`drop-sort-tab ${sort === 'top' ? 'active' : ''}`} onClick={() => setSort('top')}>
              <Award size={16} /> Top
            </button>
          </div>
        )}
      </div>
      <div className="drop-container">
        {/* LEFT COLUMN: Feed */}
      <div className="drop-feed-column" onScroll={handleScroll}>


        {/* Minimized Create Post */}
        {viewFilter === 'all' && (
          <div className="drop-create-card minimized" onClick={() => setShowModal(true)}>
            {getAvatar(user?.name, user?.image)}
            <div className="drop-create-placeholder">What's on your mind?</div>
            <button className="drop-create-action-chip">
              <Pencil size={14} />
              <span>Post</span>
            </button>
          </div>
        )}

        {/* Admin Toggle for Hidden Posts */}
        {viewFilter === 'hidden' && user?.role === 'admin' && (
          <div className="drop-admin-toggle-wrapper">
            <button 
              className={`drop-admin-toggle-tab ${adminHideTab === 'my' ? 'active' : ''}`}
              onClick={() => { setAdminHideTab('my'); fetchDrops(true, false, false); }}
            >
              My Hidden Posts ({hiddenDropIds.length})
            </button>
            <button 
              className={`drop-admin-toggle-tab ${adminHideTab === 'all' ? 'active' : ''}`}
              onClick={() => { setAdminHideTab('all'); fetchDrops(true, false, true); }}
            >
              Posts Hidden by Admin
            </button>
          </div>
        )}

        {loading && page === 1 ? (
          <div className="drop-empty-state">
            <Loader2 className="animate-spin" size={32} />
            <p>Loading drops...</p>
          </div>
        ) : displayedDrops.length === 0 ? (
          <div className="drop-empty-state">
            <MessageCircle size={48} />
            <h2>
              {viewFilter === 'saved' && 'No saved posts'}
              {viewFilter === 'reposts' && 'No reposted posts'}
              {viewFilter === 'my_posts' && 'No posts published yet'}
              {viewFilter === 'hidden' && (user?.role === 'admin' && adminHideTab === 'all' ? 'No posts hidden by admin' : 'No hidden posts')}
              {viewFilter === 'deleted' && 'No deleted posts'}
              {viewFilter === 'all' && 'No drops yet'}
            </h2>
            <p>
              {viewFilter === 'saved' && 'Click the Save button on any post to bookmark it here.'}
              {viewFilter === 'reposts' && 'Click the Repost button on any post to feature it here.'}
              {viewFilter === 'my_posts' && 'Posts you create will appear here.'}
              {viewFilter === 'hidden' && (user?.role === 'admin' && adminHideTab === 'all' ? 'Posts forcefully hidden by admins will appear here.' : 'Posts you hide from your feed will appear here.')}
              {viewFilter === 'deleted' && 'Deleted posts will appear here.'}
              {viewFilter === 'all' && 'Be the first to share something with the community!'}
            </p>
          </div>
        ) : (
          <div className="drop-feed">
            {displayedDrops.map((drop) => (
              <div 
                key={drop.id} 
                data-id={drop.id}
                className={`drop-card ${selectedDropId === drop.id ? 'selected' : ''}`} 
                onClick={() => setSelectedDropId(drop.id)}
              >
                <div className="drop-card-header">
                  <div className="drop-meta">
                    {getAvatar(drop.author_name, drop.author_image)}
                    <div className="drop-author-info">
                      <span className="drop-author-name">{drop.author_name}</span>
                      <div className="drop-author-sub">
                        <span>{timeAgo(drop.created_at)}</span>
                        <span>•</span>
                        <span className={`drop-role-badge ${drop.author_role}`}>{drop.author_role}</span>
                        {drop.is_deleted && <span className="drop-role-badge deleted-badge">DELETED</span>}
                        {drop.is_hidden_by_admin && <span className="drop-role-badge deleted-badge text-orange-500">FORCE HIDDEN</span>}
                      </div>
                    </div>
                  </div>

                  <div className="drop-card-actions-wrapper" onClick={e => e.stopPropagation()}>
                    <button 
                      className="drop-menu-trigger-btn" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuDropId(prev => prev === drop.id ? null : drop.id);
                      }}
                      title="Options"
                    >
                      <MoreHorizontal size={20} />
                    </button>

                    {activeMenuDropId === drop.id && (
                      <div className="drop-menu-dropdown animate-fade-in" onClick={e => e.stopPropagation()}>
                        {isDropAuthor(drop) && !drop.is_deleted && (
                          <button className="drop-menu-item" onClick={(e) => handleStartEdit(e, drop)}>
                            <Pencil size={15} /> Edit Post
                          </button>
                        )}

                        {user?.role !== 'admin' && !drop.is_deleted && (
                          <button className="drop-menu-item" onClick={(e) => handleHideDrop(e, drop.id)}>
                            <EyeOff size={15} /> Hide Post
                          </button>
                        )}

                        {user?.role === 'admin' && !drop.is_deleted && (
                          <button 
                            className="drop-menu-item text-orange-500" 
                            onClick={(e) => handleAdminToggleHide(e, drop.id, !drop.is_hidden_by_admin)}
                          >
                            <EyeOff size={15} /> {drop.is_hidden_by_admin ? 'Unhide Post' : 'Force Hide'}
                          </button>
                        )}

                        {(isDropAuthor(drop) || user?.role === 'admin') && !drop.is_deleted && (
                          <button className="drop-menu-item delete-option text-red-500" onClick={(e) => handleDeleteDrop(e, drop.id)}>
                            <Trash2 size={15} /> Delete Post
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="drop-card-body">
                  <h3 className="drop-card-title">{drop.title}</h3>
                  {drop.body && <p className="drop-card-text">{drop.body}</p>}
                  <RenderGallery item={drop} onExpandImage={handleOpenLightbox} />
                </div>

                <div className="drop-card-footer">
                  <div className="drop-action-group">
                    <button 
                      className={`drop-vote-btn ${drop.user_vote === 1 ? 'upvoted' : ''}`}
                      disabled={viewFilter === 'hidden' || drop.is_hidden_by_admin}
                      onClick={(e) => {
                        if (viewFilter === 'hidden' || drop.is_hidden_by_admin) {
                          e.stopPropagation();
                          return;
                        }
                        handleVote(e, drop.id, drop.user_vote, 1);
                      }}
                      title={viewFilter === 'hidden' || drop.is_hidden_by_admin ? "Voting disabled for hidden posts" : "Upvote"}
                    >
                      <ArrowBigUp size={20} />
                    </button>
                    <span className="drop-vote-score">{drop.score}</span>
                    <button 
                      className={`drop-vote-btn ${drop.user_vote === -1 ? 'downvoted' : ''}`}
                      disabled={viewFilter === 'hidden' || drop.is_hidden_by_admin}
                      onClick={(e) => {
                        if (viewFilter === 'hidden' || drop.is_hidden_by_admin) {
                          e.stopPropagation();
                          return;
                        }
                        handleVote(e, drop.id, drop.user_vote, -1);
                      }}
                      title={viewFilter === 'hidden' || drop.is_hidden_by_admin ? "Voting disabled for hidden posts" : "Downvote"}
                    >
                      <ArrowBigDown size={20} />
                    </button>
                  </div>
                  
                  <button className="drop-action-btn" onClick={(e) => { e.stopPropagation(); setSelectedDropId(drop.id); }}>
                    <MessageCircle size={18} />
                    <span>{drop.comment_count || 0} Comments</span>
                  </button>

                  {viewFilter !== 'hidden' && !drop.is_hidden_by_admin && (
                    <button 
                      className={`drop-action-btn ${repostedDropIds.includes(drop.id) ? 'reposted text-emerald-500' : ''}`} 
                      onClick={(e) => handleToggleRepostDrop(e, drop.id)} 
                      title={repostedDropIds.includes(drop.id) ? "Remove Repost" : "Repost"}
                    >
                      <Repeat size={18} />
                      <span>{repostedDropIds.includes(drop.id) ? 'Reposted' : 'Repost'}</span>
                    </button>
                  )}

                  {viewFilter !== 'hidden' && !drop.is_hidden_by_admin && (
                    <button 
                      className={`drop-action-btn ${savedDropIds.includes(drop.id) ? 'saved' : ''}`} 
                      onClick={(e) => handleToggleSaveDrop(e, drop.id)} 
                      title={savedDropIds.includes(drop.id) ? "Unsave" : "Save"}
                    >
                      <Bookmark size={18} fill={savedDropIds.includes(drop.id) ? "currentColor" : "none"} />
                      <span>{savedDropIds.includes(drop.id) ? 'Saved' : 'Save'}</span>
                    </button>
                  )}

                  {viewFilter === 'hidden' && !drop.is_hidden_by_admin && (
                    <button 
                      className="drop-action-btn unhide-btn" 
                      onClick={(e) => handleUnhideDrop(e, drop.id)}
                      title="Unhide post"
                    >
                      <Eye size={18} />
                      <span>Unhide</span>
                    </button>
                  )}

                  {drop.is_hidden_by_admin && user?.role === 'admin' && (
                    <button 
                      className="drop-action-btn unhide-btn text-orange-500" 
                      onClick={(e) => handleAdminToggleHide(e, drop.id, false)}
                      title="Unhide post globally for everyone"
                    >
                      <Eye size={18} />
                      <span>Unhide Globally</span>
                    </button>
                  )}

                  {drop.is_hidden_by_admin && user?.role !== 'admin' && (
                    <div 
                      className="drop-action-btn text-orange-500 opacity-80 cursor-default" 
                      title="This post was hidden by an Admin."
                      onClick={(e) => e.stopPropagation()}
                    >
                      <EyeOff size={18} />
                      <span>Hidden by Admin</span>
                    </div>
                  )}

                  {drop.is_deleted && (isDropAuthor(drop) || user?.role === 'admin') && (
                    <button 
                      className="drop-action-btn restore-btn text-emerald-500" 
                      onClick={(e) => handleRestoreDrop(e, drop.id)}
                      title="Restore post to feed"
                    >
                      <RotateCcw size={18} />
                      <span>Restore</span>
                    </button>
                  )}

                  {viewFilter !== 'hidden' && !drop.is_hidden_by_admin && (
                    <button className="drop-action-btn" onClick={(e) => handleOpenShareModal(e, drop)} title="Share Drop">
                      <Share2 size={18} />
                      <span>Share</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
            
            {page < totalPages && (
              <button 
                className="drop-create-btn" 
                style={{ margin: '1rem auto', display: 'block', background: 'var(--muted)', color: 'var(--foreground)' }}
                onClick={() => { setPage(p => p + 1); fetchDrops(false); }}
              >
                Load More
              </button>
            )}
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Comment Panel */}
      <div className={`drop-comment-column ${selectedDropId ? 'open' : ''}`}>
        {!selectedDropId ? (
          <div className="drop-empty-state">
            <MessageCircle size={48} style={{ opacity: 0.2 }} />
            <p>Select a post to view comments</p>
          </div>
        ) : detailLoading && !selectedDropDetail ? (
          <div className="drop-empty-state">
            <Loader2 className="animate-spin" size={32} />
          </div>
        ) : selectedDropDetail ? (
          <>
            <div className="comment-panel-header">
              <h3>Comments ({selectedDropDetail.comments?.length || 0})</h3>
              <button className="comment-panel-close" onClick={() => setSelectedDropId(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="comment-panel-content">
              {selectedDropDetail.comments?.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--muted-foreground)', marginTop: '2rem' }}>
                  No comments yet. Be the first to share your thoughts!
                </div>
              ) : (
                buildCommentTree(selectedDropDetail.comments).map(comment => (
                  <CommentItem 
                    key={comment.id}
                    comment={comment}
                    getAvatar={getAvatar}
                    timeAgo={timeAgo}
                    onVote={(id, cur, type) => handleVote(null, id, cur, type, true)}
                    onDelete={handleDeleteComment}
                    user={user}
                    onReplyClick={handleReplyClick}
                    onExpandImage={handleOpenLightbox}
                  />
                ))
              )}
            </div>

            {viewFilter === 'hidden' || selectedDropDetail?.is_hidden_by_admin ? (
              <div className="comment-panel-input-area" style={{ justifyContent: 'center', textAlign: 'center', padding: '1rem', color: 'var(--muted-foreground)', fontSize: '0.85rem', fontWeight: 600 }}>
                <EyeOff size={16} style={{ display: 'inline', marginRight: '0.35rem', verticalAlign: 'middle' }} />
                Comments are disabled for hidden posts.
              </div>
            ) : (
              <div className="comment-panel-input-area">
                <input 
                  type="file" 
                  multiple
                  ref={commentFileInputRef} 
                  style={{ display: 'none' }} 
                  onChange={handleCommentFilesSelect} 
                />
                {replyingTo && (
                  <div className="comment-replying-banner animate-fade-in">
                    <span>Replying to <strong>@{replyingTo.author_name}</strong></span>
                    <button onClick={() => setReplyingTo(null)} title="Cancel reply"><X size={14} /></button>
                  </div>
                )}
                {uploadingCommentFile && (
                  <div className="attachment-uploading"><Loader2 className="animate-spin" size={14} /> Uploading file(s)...</div>
                )}
                {commentAttachments.length > 0 && (
                  <div className="comment-attachments-list animate-fade-in">
                    {commentAttachments.map((att, idx) => (
                      <div key={idx} className="comment-attachment-chip">
                        {att.isImage ? (
                          <img 
                            src={att.url} 
                            alt="preview" 
                            className="attachment-thumb" 
                            onClick={() => handleOpenLightbox(commentAttachments.filter(a => a.isImage), idx)} 
                          />
                        ) : (
                          <div className="drop-file-chip">
                            <Paperclip size={14} />
                            <span>{att.fileName}</span>
                          </div>
                        )}
                        <button className="remove-attachment-btn" onClick={() => setCommentAttachments(prev => prev.filter((_, i) => i !== idx))}><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="comment-input-wrapper">
                  <textarea 
                    ref={commentInputRef}
                    className="comment-textarea"
                    placeholder={replyingTo ? `Reply to @${replyingTo.author_name}...` : "Write a comment..."}
                    value={commentBody}
                    onChange={(e) => {
                      setCommentBody(e.target.value);
                      e.target.style.height = 'inherit';
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                  />
                  <button 
                    className="comment-attach-btn"
                    onClick={() => commentFileInputRef.current?.click()}
                    title="Attach image(s) or file(s) (up to 10)"
                    disabled={uploadingCommentFile || commentAttachments.length >= 10}
                  >
                    {uploadingCommentFile ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
                  </button>
                  <button 
                    className="comment-submit-btn" 
                    onClick={() => handleAddComment()}
                    disabled={commentSubmitting || (!commentBody.trim() && commentAttachments.length === 0)}
                  >
                    {commentSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={18} />}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
           <div className="drop-empty-state">
             <p>Post not found</p>
           </div>
        )}
      </div>
    </div>

      {/* Create Post Modal */}
      {showModal && (
        <div className="drop-modal-overlay animate-fade-in" onClick={() => setShowModal(false)}>
          <div className="drop-modal" onClick={e => e.stopPropagation()}>
            <div className="drop-modal-header">
              <h3>Create Post</h3>
              <button className="drop-modal-close" onClick={() => setShowModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="drop-modal-body">
              <input 
                type="file" 
                multiple
                ref={postFileInputRef} 
                style={{ display: 'none' }} 
                onChange={handlePostFilesSelect} 
              />
              <div className="drop-modal-user">
                {getAvatar(user?.name, user?.image)}
                <span className="drop-modal-username">{user?.name}</span>
              </div>
              <input 
                type="text" 
                className="drop-modal-input" 
                placeholder="Title of your post" 
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                autoFocus
              />
              <textarea 
                className="drop-modal-textarea" 
                placeholder="What do you want to talk about?"
                value={newBody}
                onChange={e => setNewBody(e.target.value)}
              />

              {uploadingPostFile && (
                <div className="attachment-uploading"><Loader2 className="animate-spin" size={16} /> Uploading file(s)...</div>
              )}
              {postAttachments.length > 0 && (
                <div className="modal-attachments-list animate-fade-in">
                  {postAttachments.map((att, idx) => (
                    <div key={idx} className="modal-attachment-chip">
                      {att.isImage ? (
                        <img 
                          src={att.url} 
                          alt="preview" 
                          className="attachment-thumb" 
                          onClick={() => handleOpenLightbox(postAttachments.filter(a => a.isImage), idx)} 
                        />
                      ) : (
                        <div className="drop-file-chip">
                          <Paperclip size={14} />
                          <span>{att.fileName}</span>
                        </div>
                      )}
                      <button className="remove-attachment-btn" onClick={() => setPostAttachments(prev => prev.filter((_, i) => i !== idx))}><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="drop-modal-footer">
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="drop-action-btn" 
                  title="Attach image(s) (up to 10)"
                  disabled={uploadingPostFile || postAttachments.length >= 10}
                  onClick={() => {
                    if (postFileInputRef.current) {
                      postFileInputRef.current.accept = "image/*";
                      postFileInputRef.current.click();
                    }
                  }}
                >
                  <Image size={20} />
                </button>
                <button 
                  className="drop-action-btn" 
                  title="Attach file(s) (up to 10)"
                  disabled={uploadingPostFile || postAttachments.length >= 10}
                  onClick={() => {
                    if (postFileInputRef.current) {
                      postFileInputRef.current.accept = "*/*";
                      postFileInputRef.current.click();
                    }
                  }}
                >
                  <Paperclip size={20} />
                </button>
              </div>
              <button 
                className="drop-create-btn" 
                onClick={handleCreateDrop}
                disabled={submitting || uploadingPostFile || !newTitle.trim()}
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Post Modal */}
      {editingDrop && (
        <div className="drop-modal-overlay animate-fade-in" onClick={() => setEditingDrop(null)}>
          <div className="drop-modal" onClick={e => e.stopPropagation()}>
            <div className="drop-modal-header">
              <h3>Edit Post</h3>
              <button className="drop-modal-close" onClick={() => setEditingDrop(null)}>
                <X size={24} />
              </button>
            </div>
            <div className="drop-modal-body">
              <input 
                type="text" 
                className="drop-modal-input" 
                placeholder="Title of your post" 
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                autoFocus
              />
              <textarea 
                className="drop-modal-textarea" 
                placeholder="What do you want to talk about?"
                value={editBody}
                onChange={e => setEditBody(e.target.value)}
              />
              {editAttachments.length > 0 && (
                <div className="modal-attachments-list animate-fade-in">
                  {editAttachments.map((att, idx) => (
                    <div key={idx} className="modal-attachment-chip">
                      {isImageUrl(att.url) ? (
                        <img 
                          src={att.url} 
                          alt="preview" 
                          className="attachment-thumb" 
                          onClick={() => handleOpenLightbox(editAttachments.filter(a => isImageUrl(a.url)), idx)} 
                        />
                      ) : (
                        <div className="drop-file-chip">
                          <Paperclip size={14} />
                          <span>{att.fileName}</span>
                        </div>
                      )}
                      <button className="remove-attachment-btn" onClick={() => setEditAttachments(prev => prev.filter((_, i) => i !== idx))}><X size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="drop-modal-footer">
              <button className="drop-action-btn" onClick={() => setEditingDrop(null)}>Cancel</button>
              <button 
                className="drop-create-btn" 
                onClick={handleSaveEdit}
                disabled={updatingDrop || !editTitle.trim()}
              >
                {updatingDrop ? <Loader2 size={16} className="animate-spin" /> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Image Expansion Modal */}
      {lightboxData && (
        <div className="drop-lightbox-overlay animate-fade-in" onClick={() => setLightboxData(null)}>
          <button className="drop-lightbox-close" onClick={() => setLightboxData(null)} title="Close preview (Esc)">
            <X size={22} />
          </button>

          {lightboxData.images.length > 1 && (
            <>
              <button 
                className="drop-lightbox-nav prev"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxData(prev => ({ ...prev, index: (prev.index - 1 + prev.images.length) % prev.images.length }));
                }}
                title="Previous image (Left Arrow)"
              >
                <ChevronLeft size={28} />
              </button>
              <button 
                className="drop-lightbox-nav next"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxData(prev => ({ ...prev, index: (prev.index + 1) % prev.images.length }));
                }}
                title="Next image (Right Arrow)"
              >
                <ChevronRight size={28} />
              </button>
              
              <div className="drop-lightbox-counter">
                {lightboxData.index + 1} / {lightboxData.images.length}
              </div>
            </>
          )}

          <div className="drop-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img 
              src={lightboxData.images[lightboxData.index]?.url} 
              alt="Expanded preview" 
              className="drop-lightbox-img" 
            />
          </div>
        </div>
      )}

      {/* Share Drop Modal */}
      {shareModalDrop && (
        <div className="drop-modal-overlay animate-fade-in" onClick={() => setShareModalDrop(null)}>
          <div className="drop-modal share-modal animate-pop-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div className="drop-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Share2 size={20} style={{ color: '#105934' }} />
                <h3>Share Drop</h3>
              </div>
              <button className="drop-modal-close" onClick={() => setShareModalDrop(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="drop-modal-body" style={{ gap: '1.25rem' }}>
              <div className="share-preview-card" style={{ background: 'var(--muted)', padding: '0.85rem 1rem', borderRadius: '14px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 600, marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                  BY @{shareModalDrop.author_name}
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--foreground)' }}>
                  {shareModalDrop.title}
                </div>
              </div>

              {/* Option 1: Copy Link */}
              <button 
                className="drop-action-btn" 
                onClick={handleCopyDropLink}
                style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '16px', background: 'var(--background)' }}
              >
                <Copy size={18} />
                <span>Copy Link to Clipboard</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--muted-foreground)', fontSize: '0.75rem', fontWeight: 600 }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                <span>OR SHARE TO NODE</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
              </div>

              {/* Option 2: Share to Node */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>Select Node / Class Channel</label>
                {loadingNodes ? (
                  <div style={{ textAlign: 'center', padding: '0.5rem' }}><Loader2 size={18} className="animate-spin" /></div>
                ) : userNodes.length === 0 ? (
                  <div style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>No active nodes found.</div>
                ) : (
                  <select 
                    value={selectedNodeId} 
                    onChange={e => setSelectedNodeId(e.target.value)}
                    style={{ padding: '0.65rem 1rem', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.9rem', outline: 'none' }}
                  >
                    {userNodes.map(node => (
                      <option key={node.id} value={node.id}>{node.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="drop-modal-footer" style={{ marginTop: '0.5rem' }}>
              <button className="drop-action-btn" onClick={() => setShareModalDrop(null)}>Cancel</button>
              <button 
                className="drop-create-btn" 
                onClick={handleShareToNodeSubmit}
                disabled={sharingToNode || loadingNodes || !selectedNodeId}
                style={{ background: '#105934' }}
              >
                {sharingToNode ? <Loader2 size={16} className="animate-spin" /> : 'Share to Node'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Drop;
