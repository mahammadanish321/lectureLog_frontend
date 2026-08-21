import React, { useState } from 'react';
import { 
  X, Download, ExternalLink, ZoomIn, ZoomOut, RotateCw, RotateCcw, 
  FileText, Image as ImageIcon, File as FileIcon, Loader2 
} from 'lucide-react';
import './GlobalMediaViewer.css';

export const isImageFile = (fileName = '', mimeType = '') => {
  if (mimeType && mimeType.startsWith('image/')) return true;
  const cleanName = fileName.split('?')[0].toLowerCase();
  return cleanName.match(/\.(jpeg|jpg|gif|png|webp|svg)$/) !== null;
};

export const isPdfFile = (fileName = '', mimeType = '') => {
  if (mimeType === 'application/pdf') return true;
  const cleanName = fileName.split('?')[0].toLowerCase();
  return cleanName.endsWith('.pdf');
};

const GlobalMediaViewer = ({ file, onClose }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pdfEngine, setPdfEngine] = useState('mozilla'); // 'mozilla' | 'google' | 'direct'

  if (!file) return null;

  const fileName = file.file_name || file.name || file.title || 'Document';
  const fileUrl = file.file_url || file.url || file.path || '';
  const mimeType = file.mime_type || file.type || '';

  const isImg = isImageFile(fileName, mimeType);
  const isPdf = isPdfFile(fileName, mimeType);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleResetZoom = () => { setZoom(1); setRotation(0); };

  const getPdfSrc = () => {
    if (pdfEngine === 'mozilla') {
      return `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(fileUrl)}`;
    }
    if (pdfEngine === 'google') {
      return `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
    }
    return fileUrl;
  };

  return (
    <div className="global-viewer-overlay animate-fade-in" onClick={onClose}>
      <div className="global-viewer-card animate-pop-in" onClick={(e) => e.stopPropagation()}>
        
        {/* Header Bar */}
        <div className="global-viewer-header">
          <div className="global-viewer-file-info">
            {isImg ? (
              <div className="global-viewer-type-chip image">
                <ImageIcon size={16} />
                <span>IMAGE</span>
              </div>
            ) : isPdf ? (
              <div className="global-viewer-type-chip pdf">
                <FileText size={16} />
                <span>PDF</span>
              </div>
            ) : (
              <div className="global-viewer-type-chip generic">
                <FileIcon size={16} />
                <span>FILE</span>
              </div>
            )}
            <h3 className="global-viewer-title" title={fileName}>{fileName}</h3>
          </div>

          <div className="global-viewer-toolbar">
            {isImg && (
              <>
                <button className="global-viewer-tool-btn" onClick={handleZoomIn} title="Zoom In">
                  <ZoomIn size={18} />
                </button>
                <button className="global-viewer-tool-btn" onClick={handleZoomOut} title="Zoom Out">
                  <ZoomOut size={18} />
                </button>
                <button className="global-viewer-tool-btn" onClick={handleRotate} title="Rotate 90°">
                  <RotateCw size={18} />
                </button>
                {(zoom !== 1 || rotation !== 0) && (
                  <button className="global-viewer-tool-btn reset" onClick={handleResetZoom} title="Reset View">
                    <RotateCcw size={16} />
                  </button>
                )}
                <div className="global-viewer-divider" />
              </>
            )}

            {isPdf && (
              <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(255,255,255,0.06)', padding: '2px', borderRadius: '10px', marginRight: '0.5rem' }}>
                <button 
                  className={`global-viewer-tool-btn ${pdfEngine === 'mozilla' ? 'primary' : ''}`}
                  onClick={() => setPdfEngine('mozilla')}
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                  title="Mozilla PDF.js Viewer Engine"
                >
                  PDF.js
                </button>
                <button 
                  className={`global-viewer-tool-btn ${pdfEngine === 'google' ? 'primary' : ''}`}
                  onClick={() => setPdfEngine('google')}
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                  title="Google Docs PDF Viewer Engine"
                >
                  Google
                </button>
              </div>
            )}

            <a 
              href={fileUrl} 
              target="_blank" 
              rel="noreferrer" 
              className="global-viewer-tool-btn" 
              title="Open in new tab"
            >
              <ExternalLink size={18} />
            </a>

            <a 
              href={fileUrl} 
              download={fileName} 
              target="_blank" 
              rel="noreferrer" 
              className="global-viewer-tool-btn primary" 
              title="Download File"
            >
              <Download size={18} />
              <span>Download</span>
            </a>

            <button className="global-viewer-close-btn" onClick={onClose} title="Close Viewer (Esc)">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="global-viewer-body">
          {isImg ? (
            <div className="global-viewer-image-stage">
              <img 
                src={fileUrl} 
                alt={fileName} 
                className="global-viewer-img"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`
                }}
              />
            </div>
          ) : isPdf ? (
            <div className="global-viewer-pdf-container">
              <iframe 
                src={getPdfSrc()} 
                title={fileName} 
                className="global-viewer-pdf-iframe" 
              />
            </div>
          ) : (
            <div className="global-viewer-fallback">
              <FileIcon size={64} style={{ opacity: 0.3 }} />
              <h4>Preview not available for this file format</h4>
              <p>Download or open the file to inspect its contents.</p>
              <a href={fileUrl} target="_blank" rel="noreferrer" className="global-viewer-download-cta">
                <Download size={18} /> Download {fileName}
              </a>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default GlobalMediaViewer;
