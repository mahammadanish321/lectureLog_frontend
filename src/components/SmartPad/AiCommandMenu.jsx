import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import './AiCommandMenu.css';

const AiCommandMenu = ({ position, onSubmit, onClose, isLoading }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  // Auto-focus the input when summoned
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.ai-command-menu')) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (query.trim() && !isLoading) {
        onSubmit(query.trim());
      }
    }
  };

  // Ensure the menu stays within viewport bounds
  // We place it slightly below the cursor
  const top = position?.bottom ? position.bottom + 10 : '50%';
  const left = position?.left ? Math.max(20, position.left - 50) : '50%';

  return (
    <div 
      className="ai-command-menu"
      style={{
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
      }}
    >
      <div className="ai-command-header">
        <Sparkles size={16} className="ai-sparkle-icon" />
        <span>Ask AI Assistant</span>
      </div>
      <div className="ai-command-body">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about your documents..."
          disabled={isLoading}
        />
        {isLoading && (
          <div className="ai-command-loading">
            <Loader2 size={16} className="spin-icon" />
          </div>
        )}
      </div>
    </div>
  );
};

export default AiCommandMenu;
