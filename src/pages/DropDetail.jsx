import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowBigUp, ArrowBigDown, MessageCircle, Send, Trash2, Loader2 } from 'lucide-react';
import api from '../api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import './Drop.css';
import { timeAgo } from './Drop'; // Reuse the helper

const DropDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [drop, setDrop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentBody, setCommentBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDrop();
  }, [id]);

  const fetchDrop = async () => {
    try {
      const res = await api.get(`/drops/${id}`);
      setDrop(res.data.drop);
    } catch (err) {
      addToast('Failed to load post', 'error');
      navigate('/drop');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (targetId, currentVote, voteType, isComment = false) => {
    let newVote = voteType;
    if (currentVote === voteType) newVote = 0;

    // Optimistic
    if (!isComment) {
      setDrop(prev => {
        let scoreDiff = 0;
        if (currentVote === 1) scoreDiff -= 1;
        else if (currentVote === -1) scoreDiff += 1;
        if (newVote === 1) scoreDiff += 1;
        else if (newVote === -1) scoreDiff -= 1;
        return { ...prev, user_vote: newVote, score: prev.score + scoreDiff };
      });
    } else {
      setDrop(prev => ({
        ...prev,
        comments: prev.comments.map(c => {
          if (c.id === targetId) {
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

    try {
      if (isComment) {
        await api.post(`/drops/comments/${targetId}/vote`, { vote: newVote });
      } else {
        await api.post(`/drops/${targetId}/vote`, { vote: newVote });
      }
    } catch (err) {
      addToast('Failed to record vote', 'error');
      fetchDrop(); // Revert
    }
  };

  const handleAddComment = async () => {
    if (!commentBody.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/drops/${id}/comments`, { body: commentBody });
      addToast('Comment added', 'success');
      setCommentBody('');
      fetchDrop(); // Refetch to get new comment
    } catch (err) {
      addToast('Failed to add comment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (targetId, isComment = false) => {
    if (!window.confirm('Are you sure you want to delete this?')) return;
    
    try {
      if (isComment) {
        await api.delete(`/drops/comments/${targetId}`);
        addToast('Comment deleted', 'success');
        setDrop(prev => ({ ...prev, comments: prev.comments.filter(c => c.id !== targetId) }));
      } else {
        await api.delete(`/drops/${targetId}`);
        addToast('Post deleted', 'success');
        navigate('/drop');
      }
    } catch (err) {
      addToast('Failed to delete', 'error');
    }
  };

  const getAvatar = (name, imgUrl) => {
    if (imgUrl) return <img src={imgUrl} alt={name} className="drop-avatar" />;
    return <div className="drop-avatar">{name?.charAt(0)?.toUpperCase()}</div>;
  };

  if (loading) {
    return (
      <div className="drop-detail-container flex items-center justify-center">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (!drop) return null;

  return (
    <div className="drop-detail-container animate-fade-in">
      <button className="drop-back-btn" onClick={() => navigate('/drop')}>
        <ArrowLeft size={16} /> Back to Drops
      </button>

      <div className="drop-detail-post">
        <div className="drop-vote-col">
          <button 
            className={`drop-vote-btn ${drop.user_vote === 1 ? 'upvoted' : ''}`}
            onClick={() => handleVote(drop.id, drop.user_vote, 1, false)}
          >
            <ArrowBigUp size={24} />
          </button>
          <span className="drop-vote-score">{drop.score}</span>
          <button 
            className={`drop-vote-btn ${drop.user_vote === -1 ? 'downvoted' : ''}`}
            onClick={() => handleVote(drop.id, drop.user_vote, -1, false)}
          >
            <ArrowBigDown size={24} />
          </button>
        </div>
        
        <div className="drop-card-content">
          <div className="drop-meta" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {getAvatar(drop.author_name, drop.author_image)}
              <span className="drop-author-name">{drop.author_name}</span>
              <span className={`drop-role-badge ${drop.author_role}`}>{drop.author_role}</span>
              <span>•</span>
              <span>{timeAgo(drop.created_at)}</span>
            </div>
            {(user?.role === 'admin' || user?.id === drop.author_id) && (
              <button className="drop-delete-btn" onClick={() => handleDelete(drop.id, false)}>
                <Trash2 size={16} />
              </button>
            )}
          </div>
          <h1 className="drop-card-title" style={{ fontSize: '1.5rem', marginTop: '0.5rem' }}>{drop.title}</h1>
          <div className="drop-detail-body">{drop.body}</div>
          <div className="drop-stats" style={{ background: 'transparent', padding: 0 }}>
            <MessageCircle size={16} />
            <span>{drop.comments?.length || 0} Comments</span>
          </div>
        </div>
      </div>

      <div className="drop-comment-section">
        <h3 className="drop-comment-header">Add a comment</h3>
        <div className="drop-comment-input-area">
          <textarea 
            className="drop-textarea" 
            style={{ minHeight: '100px' }}
            placeholder="What are your thoughts?"
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
          />
          <div className="drop-comment-actions">
            <button 
              className="primary-btn" 
              onClick={handleAddComment}
              disabled={submitting || !commentBody.trim()}
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <><Send size={16} /> Comment</>}
            </button>
          </div>
        </div>

        <div className="drop-comment-list">
          {drop.comments?.map(comment => (
            <div key={comment.id} className="drop-comment-card">
              <div className="drop-comment-vote">
                <button 
                  className={`drop-vote-btn ${comment.user_vote === 1 ? 'upvoted' : ''}`}
                  onClick={() => handleVote(comment.id, comment.user_vote, 1, true)}
                  style={{ padding: '2px' }}
                >
                  <ArrowBigUp size={16} />
                </button>
                <span className="drop-vote-score" style={{ fontSize: '0.75rem' }}>{comment.score}</span>
                <button 
                  className={`drop-vote-btn ${comment.user_vote === -1 ? 'downvoted' : ''}`}
                  onClick={() => handleVote(comment.id, comment.user_vote, -1, true)}
                  style={{ padding: '2px' }}
                >
                  <ArrowBigDown size={16} />
                </button>
              </div>
              <div className="drop-comment-content">
                <div className="drop-meta" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {getAvatar(comment.author_name, comment.author_image)}
                    <span className="drop-author-name">{comment.author_name}</span>
                    <span className={`drop-role-badge ${comment.author_role}`}>{comment.author_role}</span>
                    <span>•</span>
                    <span>{timeAgo(comment.created_at)}</span>
                  </div>
                  {(user?.role === 'admin' || user?.id === comment.author_id) && (
                    <button className="drop-delete-btn" onClick={() => handleDelete(comment.id, true)}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="drop-comment-body">{comment.body}</div>
              </div>
            </div>
          ))}
          {(!drop.comments || drop.comments.length === 0) && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-foreground)' }}>
              No comments yet. Be the first to share your thoughts!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DropDetail;
