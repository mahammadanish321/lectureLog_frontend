import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Plus, MessageCircle, ArrowBigUp, ArrowBigDown, Clock, TrendingUp, Award, X, Loader2 } from 'lucide-react';
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

const Drop = () => {
  const [drops, setDrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('hot');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const fetchDrops = useCallback(async (reset = false) => {
    try {
      const currentPage = reset ? 1 : page;
      setLoading(reset);
      const res = await api.get(`/drops?sort=${sort}&page=${currentPage}&limit=20`);
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
  }, [sort]); // Refetch when sort changes

  const handleVote = async (e, dropId, currentVote, voteType) => {
    e.stopPropagation(); // Prevent navigating to detail
    
    // Determine new vote value
    let newVote = voteType;
    if (currentVote === voteType) newVote = 0; // Toggle off

    // Optimistic update
    setDrops(prev => prev.map(drop => {
      if (drop.id === dropId) {
        let scoreDiff = 0;
        if (currentVote === 1) scoreDiff -= 1;
        else if (currentVote === -1) scoreDiff += 1;
        
        if (newVote === 1) scoreDiff += 1;
        else if (newVote === -1) scoreDiff -= 1;

        return {
          ...drop,
          user_vote: newVote,
          score: drop.score + scoreDiff
        };
      }
      return drop;
    }));

    try {
      await api.post(`/drops/${dropId}/vote`, { vote: newVote });
    } catch (err) {
      addToast('Failed to record vote', 'error');
      // Revert optimism by refetching or just leaving it (simplified)
      fetchDrops(true); 
    }
  };

  const handleCreateDrop = async () => {
    if (!newTitle.trim() || !newBody.trim()) {
      addToast('Title and body are required', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/drops', { title: newTitle, body: newBody });
      addToast('Drop posted!', 'success');
      setShowModal(false);
      setNewTitle('');
      setNewBody('');
      fetchDrops(true);
    } catch (err) {
      addToast('Failed to create post', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getAvatar = (name, imgUrl) => {
    if (imgUrl) return <img src={imgUrl} alt={name} className="drop-avatar" />;
    return <div className="drop-avatar">{name?.charAt(0)?.toUpperCase()}</div>;
  };

  return (
    <div className="drop-container animate-fade-in">
      <div className="drop-header">
        <h1 className="drop-header-title"><Flame className="text-orange-500" /> Drop</h1>
        <button className="primary-btn" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New Drop
        </button>
      </div>

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

      {loading && page === 1 ? (
        <div className="drop-loading-state">
          <Loader2 className="animate-spin" size={32} />
          <p>Loading drops...</p>
        </div>
      ) : drops.length === 0 ? (
        <div className="drop-empty-state">
          <MessageCircle size={48} />
          <h2>No drops yet</h2>
          <p>Be the first to share something with the community!</p>
        </div>
      ) : (
        <div className="drop-feed">
          {drops.map((drop) => (
            <div key={drop.id} className="drop-card" onClick={() => navigate(`/drop/${drop.id}`)}>
              <div className="drop-vote-col">
                <button 
                  className={`drop-vote-btn ${drop.user_vote === 1 ? 'upvoted' : ''}`}
                  onClick={(e) => handleVote(e, drop.id, drop.user_vote, 1)}
                >
                  <ArrowBigUp size={20} />
                </button>
                <span className="drop-vote-score">{drop.score}</span>
                <button 
                  className={`drop-vote-btn ${drop.user_vote === -1 ? 'downvoted' : ''}`}
                  onClick={(e) => handleVote(e, drop.id, drop.user_vote, -1)}
                >
                  <ArrowBigDown size={20} />
                </button>
              </div>
              <div className="drop-card-content">
                <div className="drop-meta">
                  {getAvatar(drop.author_name, drop.author_image)}
                  <span className="drop-author-name">{drop.author_name}</span>
                  <span className={`drop-role-badge ${drop.author_role}`}>{drop.author_role}</span>
                  <span>•</span>
                  <span>{timeAgo(drop.created_at)}</span>
                </div>
                <h3 className="drop-card-title">{drop.title}</h3>
                <p className="drop-card-body">{drop.body}</p>
                <div className="drop-stats">
                  <MessageCircle size={14} />
                  <span>{drop.comment_count || 0} comments</span>
                </div>
              </div>
            </div>
          ))}
          
          {page < totalPages && (
            <button 
              className="primary-btn" 
              style={{ margin: '1rem auto', display: 'block', background: 'var(--muted)', color: 'var(--foreground)' }}
              onClick={() => { setPage(p => p + 1); fetchDrops(false); }}
            >
              Load More
            </button>
          )}
        </div>
      )}

      {showModal && (
        <div className="drop-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="drop-modal" onClick={e => e.stopPropagation()}>
            <div className="drop-modal-header">
              <span>Create a Drop</span>
              <button className="drop-modal-close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            <input 
              type="text" 
              className="drop-input" 
              placeholder="Title" 
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              autoFocus
            />
            <textarea 
              className="drop-textarea" 
              placeholder="What's on your mind?"
              value={newBody}
              onChange={e => setNewBody(e.target.value)}
            />
            <div className="drop-modal-actions">
              <button 
                className="primary-btn" 
                style={{ background: 'transparent', color: 'var(--foreground)', border: '1px solid var(--border)' }}
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button 
                className="primary-btn" 
                onClick={handleCreateDrop}
                disabled={submitting}
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Drop;
