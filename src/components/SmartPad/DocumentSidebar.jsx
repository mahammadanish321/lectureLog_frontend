import React, { useState, useEffect } from 'react';
import { FileText, Plus, Loader2, CheckCircle2, AlertCircle, X, Sparkles, ArrowLeft, Trash2, Edit2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import api from '../../api';
import BagFilePicker from './BagFilePicker';
import { AIAssistantWidget } from './AIAssistantWidget';
import './DocumentSidebar.css';

const DocumentSidebar = ({ padId, activeDocumentId, onSelectDocument, isOpen, onClose, excalidrawAPI }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('sources'); // 'sources' | 'chat'

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/pads/${padId}/documents`);
      setDocuments(res.data);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (padId) {
      fetchDocuments();
    }
  }, [padId]);

  const handleAttachClick = () => {
    setIsPickerOpen(true);
  };

  const handleRename = async (e, doc) => {
    e.stopPropagation();
    const newName = window.prompt('Enter new name for this file:', doc.file_name);
    if (!newName || newName === doc.file_name) return;
    try {
      await api.patch(`/bag/file/${doc.file_id}/rename`, { newName });
      setDocuments(docs => docs.map(d => d.pad_document_id === doc.pad_document_id ? { ...d, file_name: newName } : d));
    } catch (error) {
      console.error('Failed to rename document', error);
      alert('Failed to rename document.');
    }
  };

  const handleDelete = async (e, doc) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to remove "${doc.file_name}" from this pad?`)) return;
    try {
      await api.delete(`/pads/${padId}/documents/${doc.pad_document_id}`);
      setDocuments(docs => docs.filter(d => d.pad_document_id !== doc.pad_document_id));
      if (activeDocumentId === doc.pad_document_id) {
        onSelectDocument(null);
      }
    } catch (error) {
      console.error('Failed to remove document', error);
      alert('Failed to remove document.');
    }
  };

  const handleFileSelected = async (file) => {
    try {
      setLoading(true);
      await api.post(`/pads/${padId}/documents`, { fileId: file.id });
      setIsPickerOpen(false);
      fetchDocuments(); // Refresh list to show the new digesting document
    } catch (error) {
      console.error('Failed to attach document:', error);
      if (error.response?.status === 409) {
        alert('This document is already attached to this pad.');
      } else if (error.response?.data?.error) {
        alert(error.response.data.error);
      } else {
        alert('Failed to attach document. Please try again.');
      }
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="document-sidebar">
      <div className="sidebar-header" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="sidebar-tabs" style={{ display: 'flex', gap: '4px', background: 'var(--hover-bg, #f1f5f9)', padding: '4px', borderRadius: '8px', flex: 1, overflow: 'hidden' }}>
            <button 
              onClick={() => setActiveTab('sources')}
              style={{
                flex: 1, padding: '6px', fontSize: '0.8rem', fontWeight: 600,
                backgroundColor: activeTab === 'sources' ? 'var(--surface-bg, #ffffff)' : 'transparent',
                color: activeTab === 'sources' ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: 'none', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                boxShadow: activeTab === 'sources' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                whiteSpace: 'nowrap'
              }}
            >
              <FileText size={14} /> Sources
            </button>
            <button 
              onClick={() => setActiveTab('chat')}
              style={{
                flex: 1, padding: '6px', fontSize: '0.8rem', fontWeight: 600,
                backgroundColor: activeTab === 'chat' ? 'var(--surface-bg, #ffffff)' : 'transparent',
                color: activeTab === 'chat' ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: 'none', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                boxShadow: activeTab === 'chat' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                whiteSpace: 'nowrap'
              }}
            >
              <Sparkles size={14} /> AI Chat
            </button>
          </div>
          <div style={{ display: 'flex', gap: '4px', marginLeft: '12px' }}>
            {activeTab === 'sources' && (
              <button className="attach-btn" onClick={handleAttachClick} title="Attach from Bag">
                <Plus size={16} />
              </button>
            )}
            <button className="attach-btn" onClick={onClose} title="Close">
              <X size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="document-content-area" style={{ display: activeTab === 'sources' ? 'flex' : 'none', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        {activeDocumentId ? (() => {
          const activeDoc = documents.find(d => d.pad_document_id === activeDocumentId);
          return (
            <div className="document-viewer" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', gap: '12px', flexShrink: 0 }}>
                <button 
                  onClick={() => onSelectDocument(null)} 
                  style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Back to List"
                >
                  <ArrowLeft size={16} />
                </button>
                <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {activeDoc?.file_name}
                </h4>
              </div>
              
              <div className="drawer-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 16px 16px 16px', overflow: 'hidden' }}>
                {activeDoc?.file_url ? (() => {
                  let fileUrl = activeDoc.file_url;
                  
                  // Handle relative paths for local development
                  if (!fileUrl.startsWith('http')) {
                    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
                    fileUrl = `${baseUrl}/${fileUrl.replace(/\\/g, '/')}`;
                  }
                  
                  // Remove the fl_attachment:false replacement since it might break signatures
                  
                  if (activeDoc.file_name?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/)) {
                    return (
                      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <img src={fileUrl} alt={activeDoc.file_name} style={{ maxWidth: '100%', objectFit: 'contain' }} />
                      </div>
                    );
                  }
                  
                  return (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                      <iframe 
                        src={activeDoc.file_name?.toLowerCase().endsWith('.pdf') 
                          ? `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(fileUrl)}` 
                          : fileUrl} 
                        style={{ width: '100%', flex: 1, border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: '#f8fafc' }} 
                        title={activeDoc.file_name}
                      />
                      <div style={{ padding: '8px', textAlign: 'center', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                        <a href={fileUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-color)', textDecoration: 'underline' }}>
                          Open original file in new tab
                        </a>
                      </div>
                    </div>
                  );
                })() : (
                  <div className="processing-state" style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-tertiary)', fontStyle: 'italic', fontSize: '0.85rem' }}>
                    <p>File not available for viewing.</p>
                  </div>
                )}
              </div>
            </div>
          );
        })() : (
          <div className="document-list" style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div className="sidebar-loading">
                <Loader2 className="spin-icon" size={20} />
              </div>
            ) : documents.length === 0 ? (
              <div className="empty-state">
                <p>No study materials attached.</p>
              </div>
            ) : (
              documents.map(doc => (
                <div 
                  key={doc.pad_document_id} 
                  className={`document-item ${activeDocumentId === doc.pad_document_id ? 'active' : ''}`}
                  onClick={() => onSelectDocument(doc)}
                >
                  <div className="doc-icon">
                    <FileText size={18} />
                  </div>
                  <div className="doc-info" style={{ flex: 1, overflow: 'hidden' }}>
                    <span className="doc-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{doc.file_name}</span>
                    <div className="doc-status">
                      {doc.status === 'completed' && <><CheckCircle2 size={12} className="status-success" /> Ready</>}
                      {doc.status === 'processing' && <><Loader2 size={12} className="spin-icon" /> Digesting...</>}
                      {doc.status === 'error' && <><AlertCircle size={12} className="status-error" /> Error</>}
                    </div>
                  </div>
                  <div className="doc-actions" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '4px' }}>
                    <button 
                      onClick={(e) => handleRename(e, doc)} 
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '4px' }}
                      title="Rename"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={(e) => handleDelete(e, doc)} 
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {activeTab === 'chat' && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <AIAssistantWidget 
            isOpen={true} 
            isEmbedded={true}
            excalidrawAPI={excalidrawAPI}
            onClose={() => {}}
          />
        </div>
      )}

      <BagFilePicker 
        isOpen={isPickerOpen} 
        onClose={() => setIsPickerOpen(false)} 
        onSelectFile={handleFileSelected} 
      />
    </div>
  );
};

export default DocumentSidebar;
