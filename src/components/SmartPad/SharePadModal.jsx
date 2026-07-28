import React, { useState } from 'react';
import { X, Play, Link as LinkIcon, Check, Loader2, Copy, Lock, Square } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';
import './SharePadModal.css';

export const SharePadModal = ({ isOpen, onClose, padId, initialIsPublic, isLiveSession, onLiveSessionStart, onLiveSessionStop, userName }) => {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const shareUrl = `${window.location.origin}/#/pad/shared/${padId}`;
  
  const handleExportLink = async () => {
    setIsGeneratingLink(true);
    try {
      // Ensure pad is public
      if (!isPublic) {
        await api.put(`/pads/${padId}`, { is_public: true });
        setIsPublic(true);
      }
      
      const linkUrl = `${window.location.origin}/#/pad/shared/${padId}`;
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

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <AnimatePresence>
      <div className="share-modal-overlay" onClick={onClose}>
        <motion.div 
          className="share-modal-content"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="share-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
          
          {isLiveSession ? (
            <div className="share-active-session">
              <h3 className="share-title">Live collaboration</h3>
              
              <div className="share-input-group">
                <label>Your name</label>
                <input type="text" className="share-input" value={userName || "Anonymous"} readOnly />
              </div>
              
              <div className="share-input-group">
                <label>Link</label>
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
                  <QRCodeSVG value={shareUrl} size={160} level="H" includeMargin={true} />
                </div>
              </div>
              
              <div className="share-footer-note">
                <p><Lock size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-2px', color: '#eab308' }}/> Don't worry, the session is end-to-end encrypted, and fully private. Not even our server can see what you draw.</p>
                <p>Stopping the session will disconnect you from the room, but you'll be able to continue working with the scene, locally. Note that this won't affect other people, and they'll still be able to collaborate on their version.</p>
              </div>
              
              <div className="share-action-row">
                <button className="share-btn stop-session" onClick={onLiveSessionStop}>
                  <Square size={14} fill="currentColor" /> Stop session
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="share-section">
                <h3>Live collaboration</h3>
                <p className="share-desc">Invite people to collaborate on your drawing.</p>
                <p className="share-desc-sub">Don't worry, the session is fully private. Only users with access can join.</p>
                
                <button className="share-btn primary" onClick={onLiveSessionStart}>
                  <Play size={16} fill="currentColor" /> Start session
                </button>
              </div>

              <div className="share-divider">
                <span>Or</span>
              </div>

              <div className="share-section">
                <h3>Shareable link</h3>
                <p className="share-desc">Export as a read-only link.</p>
                
                <button className="share-btn secondary" onClick={handleExportLink} disabled={isGeneratingLink}>
                  {isGeneratingLink ? (
                    <Loader2 size={16} className="spin" />
                  ) : copied ? (
                    <Check size={16} /> 
                  ) : (
                    <LinkIcon size={16} /> 
                  )}
                  {copied ? 'Link copied!' : 'Export to Link'}
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
