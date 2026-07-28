import React, { useState, useEffect, useRef } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import mermaid from 'mermaid';
import { Code, Check, AlertCircle } from 'lucide-react';
import './MermaidDiagram.css';

const MermaidDiagramComponent = ({ node, updateAttributes }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [svgContent, setSvgContent] = useState('');
  const [error, setError] = useState(null);
  const [tempCode, setTempCode] = useState(node.attrs.code);
  
  const containerRef = useRef(null);
  const diagramId = useRef(`mermaid-${Math.random().toString(36).substr(2, 9)}`);

  const renderDiagram = async (code) => {
    if (!code) return;
    try {
      setError(null);
      // mermaid.render returns { svg, bindFunctions }
      const { svg } = await mermaid.render(diagramId.current, code);
      setSvgContent(svg);
    } catch (err) {
      console.error("Mermaid parsing error:", err);
      setError(err.message || 'Syntax error in Mermaid code');
    }
  };

  useEffect(() => {
    // Initial render
    renderDiagram(node.attrs.code);
  }, [node.attrs.code]);

  const handleSave = () => {
    updateAttributes({ code: tempCode });
    renderDiagram(tempCode);
    setIsEditing(false);
  };

  return (
    <NodeViewWrapper className="mermaid-node-wrapper">
      <div className="mermaid-node-container" ref={containerRef}>
        <div className="mermaid-node-toolbar">
          <span className="mermaid-badge">✨ AI Diagram</span>
          {!isEditing ? (
            <button className="mermaid-btn" onClick={() => setIsEditing(true)}>
              <Code size={14} /> Edit Source
            </button>
          ) : (
            <button className="mermaid-btn primary" onClick={handleSave}>
              <Check size={14} /> Save
            </button>
          )}
        </div>

        <div className="mermaid-node-content">
          {isEditing ? (
            <div className="mermaid-editor-view">
              <textarea
                className="mermaid-textarea"
                value={tempCode}
                onChange={(e) => setTempCode(e.target.value)}
                spellCheck={false}
              />
            </div>
          ) : (
            <div className="mermaid-render-view">
              {error ? (
                <div className="mermaid-error">
                  <AlertCircle size={24} />
                  <p>Failed to render diagram</p>
                  <small>{error}</small>
                </div>
              ) : (
                <div 
                  className="mermaid-svg-container"
                  dangerouslySetInnerHTML={{ __html: svgContent }} 
                />
              )}
            </div>
          )}
        </div>
      </div>
    </NodeViewWrapper>
  );
};

export default MermaidDiagramComponent;
