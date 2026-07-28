import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, FileText, HelpCircle, Send, Loader2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import './ImmersiveAIMenu.css';

export const ImmersiveAIMenu = ({ 
  isOpen, 
  onClose, 
  position, 
  selectedText, 
  canvasContext, 
  onActionComplete,
  excalidrawAPI
}) => {
  const { id } = useParams();
  const [query, setQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentAction, setCurrentAction] = useState(null);
  const [streamedText, setStreamedText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const menuRef = useRef(null);

  // Close menu if clicked outside
  useEffect(() => {
    if (isOpen) {
      setIsExpanded(false);
      setQuery('');
      setStreamedText('');
    }
  }, [isOpen, selectedText]);

  // Close menu if clicked outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        if (isExpanded && !isGenerating) {
          setIsExpanded(false);
        } else if (!isExpanded) {
          onClose();
        }
      }
    };
    if (isOpen && !isGenerating) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, isGenerating, isExpanded, onClose]);

  const handleAction = async (action, customQuery = '') => {
    setIsGenerating(true);
    setCurrentAction(action);
    setStreamedText('');
    
    let isReplace = false;
    let finalQuery = customQuery;

    if (action === 'improve') {
      isReplace = true;
      finalQuery = "Please improve this text.";
    } else if (action === 'summarize') {
      finalQuery = "Please summarize this text.";
    } else if (action === 'explain') {
      finalQuery = "Please explain this text in detail.";
    } else {
      // Check for replace intent in custom query
      if (customQuery.toLowerCase().includes('replace')) {
        isReplace = true;
      }
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/pads/${id}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          query: finalQuery,
          selectedText,
          canvasContext,
          action
        })
      });

      if (!response.ok) {
        let errorMsg = `Server error ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.error) errorMsg = errorData.error;
        } catch (e) {}
        throw new Error(errorMsg);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullResponse = '';
      let buffer = '';
      let isDiagramResponse = false;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        
        // Keep the last partial line in the buffer
        buffer = lines.pop();
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('data: ')) {
            const dataStr = trimmedLine.replace('data: ', '');
            if (dataStr === '[DONE]') continue;
            
            try {
              const data = JSON.parse(dataStr);
              if (data.type === 'diagram') {
                isDiagramResponse = true;
                fullResponse = data.content;
                setStreamedText("[Diagram Generated]");
              } else if (data.text) {
                fullResponse += data.text;
                setStreamedText(fullResponse);
              } else if (data.error) {
                fullResponse += `\n[System Error]: ${data.error}`;
                setStreamedText(fullResponse);
              }
            } catch (e) {
              console.error("Error parsing JSON chunk:", e, dataStr);
            }
          }
        }
      }

      onActionComplete(fullResponse, isReplace, isDiagramResponse);
      onClose();

    } catch (error) {
      console.error("AI Generation Error:", error);
      alert(error.message || "Failed to generate AI response.");
    } finally {
      setIsGenerating(false);
      setCurrentAction(null);
    }
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    handleAction('custom', query);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className={`immersive-ai-menu ${!isExpanded ? 'collapsed' : 'expanded'}`}
          style={{ 
            left: position?.x || 0, 
            top: position?.y || 0 
          }}
        >
          {!isExpanded ? (
            <button 
              className="magic-wand-trigger" 
              onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
              title="Excalidraw AI"
            >
              <Sparkles size={16} color="white" />
            </button>
          ) : isGenerating ? (
            <div className="immersive-ai-generating">
              <Loader2 size={18} className="ai-spin" />
              <span>{currentAction === 'improve' ? 'Improving text...' : 'Generating...'}</span>
            </div>
          ) : (
            <>
              <div className="immersive-ai-quick-actions">
                <button onClick={() => handleAction('improve')} className="ai-quick-action">
                  <Sparkles size={14} /> Improve
                </button>
                <button onClick={() => handleAction('summarize')} className="ai-quick-action">
                  <FileText size={14} /> Summarize
                </button>
                <button onClick={() => handleAction('explain')} className="ai-quick-action">
                  <HelpCircle size={14} /> Explain
                </button>
                <button onClick={() => handleAction('custom', 'draw a flowchart for this')} className="ai-quick-action">
                  <Sparkles size={14} /> Diagram
                </button>
              </div>
              <form className="immersive-ai-input-wrapper" onSubmit={handleCustomSubmit}>
                <input
                  type="text"
                  placeholder="Ask AI about this..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                />
                <button type="submit" disabled={!query.trim()} className="ai-custom-send-btn">
                  <Send size={14} />
                </button>
              </form>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
