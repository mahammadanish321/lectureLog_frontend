import React from 'react';
import ReactMarkdown from 'react-markdown';
import { X, BookOpen } from 'lucide-react';
import './StudyGuideDrawer.css';

const StudyGuideDrawer = ({ document, onClose }) => {
  return (
    <div className={`study-guide-drawer ${document ? 'open' : ''}`}>
      <div className="drawer-header">
        <div className="drawer-title">
          <BookOpen size={18} />
          <h3>Study Guide</h3>
        </div>
        <button className="close-btn" onClick={onClose} title="Close Guide">
          <X size={20} />
        </button>
      </div>
      
      <div className="drawer-content">
        {document ? (
          document.status === 'completed' && document.ai_summary ? (
            <div className="markdown-content">
              <ReactMarkdown>{document.ai_summary}</ReactMarkdown>
            </div>
          ) : (
            <div className="processing-state">
              <p>AI is still analyzing this document. Check back soon!</p>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
};

export default StudyGuideDrawer;
