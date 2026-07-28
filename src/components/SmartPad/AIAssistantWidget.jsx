import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Plus, Loader2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import './AIAssistantWidget.css';

export const AIAssistantWidget = ({ isOpen, onClose, excalidrawAPI, isEmbedded = false }) => {
  const { id } = useParams();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL}/pads/${id}/chats`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const history = await res.json();
          const formattedHistory = history.map(h => ({
            id: h.id,
            role: h.role,
            content: h.content,
            type: h.type || 'text',
            isStreaming: false
          }));
          setMessages(formattedHistory);
        }
      } catch (error) {
        console.error('Failed to fetch chat history', error);
      }
    };
    if (id) {
      fetchHistory();
    }
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim() || !id || isLoading) return;

    const userMessage = { role: 'user', content: query };
    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setIsLoading(true);

    const botMessageId = Date.now();
    setMessages(prev => [...prev, { id: botMessageId, role: 'bot', content: '', isStreaming: true, type: 'text' }]);

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/pads/${id}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: userMessage.content })
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      
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
            if (dataStr === '[DONE]') {
              setMessages(prev => prev.map(msg => 
                msg.id === botMessageId ? { ...msg, isStreaming: false } : msg
              ));
              continue;
            }
            
            try {
              const data = JSON.parse(dataStr);
              if (data.type === 'diagram') {
                setMessages(prev => prev.map(msg => 
                  msg.id === botMessageId ? { ...msg, content: data.content, type: 'diagram' } : msg
                ));
              } else if (data.text) {
                setMessages(prev => prev.map(msg => 
                  msg.id === botMessageId ? { ...msg, content: msg.content + data.text } : msg
                ));
              } else if (data.error) {
                 setMessages(prev => prev.map(msg => 
                  msg.id === botMessageId ? { ...msg, content: `Error: ${data.error}`, isStreaming: false } : msg
                ));
              }
            } catch (e) {
              console.error("Error parsing JSON chunk:", e, dataStr);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error asking AI:", error);
      setMessages(prev => prev.map(msg => 
        msg.id === botMessageId ? { ...msg, content: 'Sorry, I encountered an error. Please try again.', isStreaming: false } : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const stripMarkdown = (md) => {
    return md
      .replace(/\*\*(.*?)\*\*/g, '$1') // bold
      .replace(/\*(.*?)\*/g, '$1')     // italic
      .replace(/#{1,6}\s?(.*?)(?:\n|$)/g, '$1\n') // headers
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // links
      .replace(/`{1,3}([\s\S]*?)`{1,3}/g, '$1') // code
      .replace(/~~(.*?)~~/g, '$1')     // strikethrough
      .replace(/^\s*> (.*?)(?:\n|$)/gm, '$1\n') // blockquotes
      .trim();
  };

  const insertToCanvas = async (message) => {
    if (!excalidrawAPI) return;
    
    if (message.type === 'diagram') {
      try {
        const { parseMermaidToExcalidraw } = await import('@excalidraw/mermaid-to-excalidraw');
        
        let cleanMermaid = message.content;
        if (cleanMermaid.startsWith('```mermaid')) {
          cleanMermaid = cleanMermaid.replace(/^```mermaid\n/, '').replace(/\n```$/, '');
        }

        const res = await parseMermaidToExcalidraw(cleanMermaid, {
          fontSize: 20,
        });

        excalidrawAPI.updateScene({
          elements: [...excalidrawAPI.getSceneElements(), ...res.elements]
        });
      } catch (err) {
        console.error("Failed to parse mermaid diagram", err);
        alert("Failed to insert diagram. It might be too complex or invalid Mermaid syntax.");
      }
    } else {
      const appState = excalidrawAPI.getAppState();
      const x = appState.scrollX > 0 ? appState.scrollX : -appState.scrollX + (appState.width / 2);
      const y = appState.scrollY > 0 ? appState.scrollY : -appState.scrollY + (appState.height / 2);

      const cleanText = stripMarkdown(message.content);

      const textElement = {
        id: `ai-text-${Date.now()}`,
        type: "text",
        x: x,
        y: y,
        width: 400,
        height: 50,
        angle: 0,
        strokeColor: "#000000",
        backgroundColor: "transparent",
        fillStyle: "hachure",
        strokeWidth: 1,
        strokeStyle: "solid",
        roughness: 1,
        opacity: 100,
        groupIds: [],
        strokeSharpness: "sharp",
        seed: Math.random() * 100000,
        version: 1,
        versionNonce: Math.random() * 100000,
        isDeleted: false,
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
        text: cleanText,
        fontSize: 20,
        fontFamily: 1,
        textAlign: "left",
        verticalAlign: "top",
        baseline: 18,
        containerId: null,
        originalText: cleanText
      };

      excalidrawAPI.updateScene({
        elements: [...excalidrawAPI.getSceneElements(), textElement]
      });
    }
  };

  const widgetContent = (
    <div className={`ai-assistant-widget ${isEmbedded ? 'embedded' : ''}`}>
      {!isEmbedded && (
        <div className="ai-widget-header">
          <div className="ai-widget-title">
            <Sparkles size={18} className="text-primary" />
            <span>Smart Assistant</span>
          </div>
          <button className="ai-widget-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
      )}

      <div className="ai-widget-messages">
            {messages.length === 0 && (
              <div className="ai-empty-state">
                <Sparkles size={32} className="text-primary/50 mb-3" />
                <p>Ask me anything about your attached Study Sources!</p>
              </div>
            )}
            
            {messages.map((msg, idx) => (
              <div key={idx} className={`ai-message ${msg.role}`}>
                <div className="ai-message-content">
                  {msg.type === 'diagram' ? (
                    <div className="ai-diagram-preview">
                      <div className="ai-diagram-label">Generated Flowchart</div>
                      <pre>{msg.content}</pre>
                    </div>
                  ) : (
                    <div className="markdown-body">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                  {msg.isStreaming && <span className="ai-cursor"></span>}
                </div>
                
                {msg.role === 'bot' && !msg.isStreaming && (
                  <button 
                    className="ai-insert-btn"
                    onClick={() => insertToCanvas(msg)}
                    title="Add to Pad"
                  >
                    <Plus size={14} /> Add to Pad
                  </button>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form className="ai-widget-input-area" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Ask a question..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isLoading}
            />
            <button type="submit" disabled={!query.trim() || isLoading} className="ai-send-btn">
              {isLoading ? <Loader2 size={16} className="ai-spin" /> : <Send size={16} />}
            </button>
          </form>
    </div>
  );

  if (isEmbedded) {
    return widgetContent;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="ai-assistant-widget-container"
          style={{ position: 'absolute', bottom: '70px', right: '16px', zIndex: 50 }}
          drag
          dragMomentum={false}
          dragConstraints={{ left: -window.innerWidth + 400, right: 0, top: -window.innerHeight + 500, bottom: 0 }}
          dragElastic={0}
        >
          {widgetContent}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
