import React, { useState, useEffect } from 'react';
import { X, Play, Link as LinkIcon, Check, Loader2, Copy, Lock, Square, Users, Share2, Edit3, Eye, Globe, GraduationCap, UserCheck } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';
import './SharePadModal.css';

export const SharePadModal = ({ isOpen, onClose, padId, initialIsPublic, isLiveSession, onLiveSessionStart, onLiveSessionStop, userName }) => {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [copied, setCopied] = useState(false);
  const [collabPermission, setCollabPermission] = useState('edit'); // 'edit' or 'readonly'
  
  // Target Audience selection states
  const [targetAudienceType, setTargetAudienceType] = useState('everyone'); // 'everyone' | 'class' | 'individual'
  const [targetYear, setTargetYear] = useState(1);
  const [targetStream, setTargetStream] = useState('CSE');
  const [invitedUserIds, setInvitedUserIds] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (targetAudienceType === 'individual' && candidates.length === 0) {
      api.get('/pads/candidates/list')
        .then(res => setCandidates(res.data))
        .catch(err => console.error('Failed to fetch candidates', err));
    }
  }, [targetAudienceType, candidates]);

  const isElectron = !!window.electronAPI;
  const baseUrl = isElectron ? `${window.location.origin}/#/pad/shared/${padId}` : `${window.location.origin}/pad/shared/${padId}`;
  const shareUrl = `${baseUrl}?mode=${collabPermission}`;
  
  const handleExportLink = async () => {
    setIsGeneratingLink(true);
    try {
      if (!isPublic) {
        await api.put(`/pads/${padId}`, { is_public: true });
        setIsPublic(true);
      }
      
      const linkUrl = `${baseUrl}?mode=readonly`;
      await navigator.clipboard.writeText(linkUrl);
      
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Failed to generate link', err);
      alert('Failed to generate share link');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleStartSession = async () => {
    try {
      await api.put(`/pads/${padId}`, {
        is_live_active: true,
        is_public: true,
        target_audience_type: targetAudienceType,
        target_year: targetAudienceType === 'class' ? targetYear : null,
        target_stream: targetAudienceType === 'class' ? targetStream : null,
        invited_user_ids: targetAudienceType === 'individual' ? invitedUserIds : [],
        live_mode: collabPermission
      });

      if (onLiveSessionStart) {
        onLiveSessionStart({
          targetAudienceType,
          targetYear,
          targetStream,
          invitedUserIds,
          collabPermission
        });
      }
    } catch (err) {
      console.error('Failed to start live session', err);
      alert('Failed to update live session settings');
    }
  };

  const handleStopSession = async () => {
    try {
      await api.put(`/pads/${padId}`, { is_live_active: false });
      if (onLiveSessionStop) onLiveSessionStop();
    } catch (err) {
      console.error('Failed to stop live session', err);
      if (onLiveSessionStop) onLiveSessionStop();
    }
  };

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <AnimatePresence>
      <div className="share-modal-overlay animate-fade-in" onClick={onClose}>
        <motion.div 
          className="share-modal-content animate-pop-in"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="share-modal-header">
            <div className="share-modal-header-title">
              <Users size={22} className="share-header-icon" />
              <span>Live Collaboration</span>
            </div>
            <button className="share-modal-close" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
          
          {isLiveSession ? (
            <div className="share-active-session">
              <div className="share-input-group">
                <label>Your Name</label>
                <input type="text" className="share-input" value={userName || "Anonymous"} readOnly />
              </div>

              <div className="share-input-group">
                <label>Access Mode</label>
                <div className="share-mode-toggle-group">
                  <button 
                    type="button" 
                    className={`share-mode-chip ${collabPermission === 'edit' ? 'active' : ''}`}
                    onClick={() => setCollabPermission('edit')}
                  >
                    <Edit3 size={15} />
                    <span>Full Collaboration (Edit & View)</span>
                  </button>
                  <button 
                    type="button" 
                    className={`share-mode-chip ${collabPermission === 'readonly' ? 'active' : ''}`}
                    onClick={() => setCollabPermission('readonly')}
                  >
                    <Eye size={15} />
                    <span>Read-Only Collaboration</span>
                  </button>
                </div>
              </div>
              
              <div className="share-input-group">
                <label>Share Link ({collabPermission === 'edit' ? 'Live Edit' : 'Read-Only'})</label>
                <div className="share-link-wrapper">
                  <input type="text" className="share-input share-link-input" value={shareUrl} readOnly />
                  <button className="share-copy-btn" onClick={handleCopyLink}>
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied' : 'Copy link'}
                  </button>
                </div>
              </div>
              
              <div className="share-qr-container">
                <div className="share-qr-box">
                  <QRCodeSVG value={shareUrl} size={140} level="H" includeMargin={true} fgColor="#105934" />
                </div>
              </div>
              
              <div className="share-footer-note">
                <p>
                  <Lock size={13} className="inline-lock-icon" /> 
                  {collabPermission === 'edit' 
                    ? 'Anyone with the link can edit and view live changes together in real-time.' 
                    : 'Collaborators with this link can watch your live drawing and cursors in read-only mode.'}
                </p>
              </div>
              
              <div className="share-action-row">
                <button className="share-btn stop-session" onClick={handleStopSession}>
                  <Square size={14} fill="currentColor" /> Stop Session
                </button>
              </div>
            </div>
          ) : (
            <div className="share-body-wrapper">
              <div className="share-section">
                <div className="share-section-icon-badge">
                  <Users size={24} />
                </div>
                <h3>Start Live Session</h3>
                <p className="share-desc">Invite people to collaborate on your drawing in real time.</p>
                
                {/* Target Audience Selector */}
                <div className="share-input-group" style={{ marginBottom: '1rem', textAlign: 'left' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--foreground)' }}>Collaborated Audience</label>
                  <div className="share-mode-toggle-group">
                    <button 
                      type="button" 
                      className={`share-mode-chip ${targetAudienceType === 'everyone' ? 'active' : ''}`}
                      onClick={() => setTargetAudienceType('everyone')}
                    >
                      <Globe size={15} />
                      <span>Everyone with link</span>
                    </button>

                    <button 
                      type="button" 
                      className={`share-mode-chip ${targetAudienceType === 'class' ? 'active' : ''}`}
                      onClick={() => setTargetAudienceType('class')}
                    >
                      <GraduationCap size={15} />
                      <span>Collaborated Year & Stream</span>
                    </button>

                    <button 
                      type="button" 
                      className={`share-mode-chip ${targetAudienceType === 'individual' ? 'active' : ''}`}
                      onClick={() => setTargetAudienceType('individual')}
                    >
                      <UserCheck size={15} />
                      <span>Collaborated Person / Individual</span>
                    </button>
                  </div>
                </div>

                {targetAudienceType === 'class' && (
                  <div style={{ background: 'var(--muted, #f8fafc)', padding: '0.85rem', borderRadius: '14px', border: '1px solid var(--border, #e2e8f0)', marginBottom: '1rem', display: 'flex', gap: '0.75rem', textAlign: 'left' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Target Year</label>
                      <select value={targetYear} onChange={(e) => setTargetYear(Number(e.target.value))} className="share-input" style={{ padding: '0.4rem 0.6rem' }}>
                        <option value={1}>1st Year</option>
                        <option value={2}>2nd Year</option>
                        <option value={3}>3rd Year</option>
                        <option value={4}>4th Year</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Target Stream</label>
                      <select value={targetStream} onChange={(e) => setTargetStream(e.target.value)} className="share-input" style={{ padding: '0.4rem 0.6rem' }}>
                        <option value="CSE">CSE</option>
                        <option value="ECE">ECE</option>
                        <option value="MECH">MECH</option>
                        <option value="CIVIL">CIVIL</option>
                        <option value="EE">EE</option>
                        <option value="IT">IT</option>
                      </select>
                    </div>
                  </div>
                )}

                {targetAudienceType === 'individual' && (
                  <div style={{ background: 'var(--muted, #f8fafc)', padding: '0.85rem', borderRadius: '14px', border: '1px solid var(--border, #e2e8f0)', marginBottom: '1rem', textAlign: 'left' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Select Collaborated Person(s)</label>
                    <input 
                      type="text" 
                      placeholder="Search person by name..." 
                      className="share-input" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ marginBottom: '0.5rem', padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                    />
                    <div style={{ maxHeight: '110px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {candidates.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map(c => {
                        const isSelected = invitedUserIds.includes(c.raw_id);
                        return (
                          <div 
                            key={`${c.type}_${c.id}`} 
                            onClick={() => {
                              if (isSelected) {
                                setInvitedUserIds(invitedUserIds.filter(id => id !== c.raw_id));
                              } else {
                                setInvitedUserIds([...invitedUserIds, c.raw_id]);
                              }
                            }}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '8px',
                              background: isSelected ? 'rgba(16, 89, 52, 0.12)' : 'white',
                              border: isSelected ? '1px solid #105934' : '1px solid #e2e8f0',
                              color: isSelected ? '#105934' : '#334155',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}
                          >
                            <span>{c.label}</span>
                            {isSelected && <Check size={14} />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                <button className="share-btn primary" onClick={handleStartSession}>
                  <Play size={16} fill="currentColor" /> Start Session
                </button>
              </div>

              <div className="share-divider">
                <span>OR</span>
              </div>

              <div className="share-section">
                <div className="share-section-icon-badge secondary">
                  <Share2 size={22} />
                </div>
                <h3>Shareable Link</h3>
                <p className="share-desc">Export as a read-only view link for anyone.</p>
                
                <button className="share-btn secondary" onClick={handleExportLink} disabled={isGeneratingLink}>
                  {isGeneratingLink ? (
                    <Loader2 size={16} className="spin" />
                  ) : copied ? (
                    <Check size={16} /> 
                  ) : (
                    <LinkIcon size={16} /> 
                  )}
                  {copied ? 'Link Copied!' : 'Export Read-Only Link'}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
