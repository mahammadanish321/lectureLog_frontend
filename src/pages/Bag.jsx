import React, { useState, useEffect, useRef } from 'react';
import { 
  Folder, File as FileIcon, Image as ImageIcon, 
  Trash2, Plus, Download, MoreVertical, Search, 
  ChevronRight, UploadCloud, X, Edit2, RotateCcw, Loader2
} from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import './Bag.css';

const Bag = () => {
  const { user } = useAuth();
  
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [currentFolder, setCurrentFolder] = useState('root');
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: 'root', name: 'My Bag' }]);
  const [currentView, setCurrentView] = useState('my_bag'); // 'my_bag' or 'trash'
  
  const [searchQuery, setSearchQuery] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [newFolderModal, setNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  const [renameModal, setRenameModal] = useState(false);
  const [itemToRename, setItemToRename] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  
  const [previewFile, setPreviewFile] = useState(null);
  const [contextMenu, setContextMenu] = useState(null); // { x, y, item, type }
  
  const fileInputRef = useRef(null);
  const contextMenuRef = useRef(null);

  useEffect(() => {
    fetchContents();
  }, [currentFolder, currentView]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchContents = async () => {
    try {
      setLoading(true);
      const isTrash = currentView === 'trash';
      const res = await api.get('/bag', { params: { folder_id: currentFolder, is_trash: isTrash } });
      setFolders(res.data.folders || []);
      setFiles(res.data.files || []);
    } catch (err) {
      console.error('Error fetching bag contents', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      const res = await api.post('/bag/folders', {
        name: newFolderName,
        parent_id: currentFolder === 'root' ? null : currentFolder,
        scope: 'personal'
      });
      setFolders(prev => [...prev, res.data].sort((a,b) => a.name.localeCompare(b.name)));
      setNewFolderModal(false);
      setNewFolderName('');
    } catch (err) {
      console.error('Error creating folder', err);
    }
  };

  const handleRename = async (e) => {
    e.preventDefault();
    if (!renameValue.trim() || !itemToRename) return;
    try {
      const res = await api.patch(`/bag/${itemToRename.type}s/${itemToRename.id}/rename`, {
        newName: renameValue
      });
      if (itemToRename.type === 'folder') {
        setFolders(prev => prev.map(f => f.id === itemToRename.id ? res.data : f));
      } else {
        setFiles(prev => prev.map(f => f.id === itemToRename.id ? res.data : f));
      }
      setRenameModal(false);
      setItemToRename(null);
      setRenameValue('');
    } catch (err) {
      console.error('Error renaming item', err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
    e.target.value = null; // reset
  };

  const uploadFile = async (file) => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder_id', currentFolder);
      
      const res = await api.post('/bag/files', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFiles(prev => [...prev, res.data].sort((a,b) => a.file_name.localeCompare(b.file_name)));
    } catch (err) {
      console.error('Error uploading file', err);
    } finally {
      setUploading(false);
    }
  };

  const handleFolderClick = (folder) => {
    if (currentView === 'trash') return;
    setCurrentFolder(folder.id);
    setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }]);
  };

  const handleBreadcrumbClick = (index) => {
    if (currentView === 'trash') return;
    const target = breadcrumbs[index];
    setCurrentFolder(target.id);
    setBreadcrumbs(prev => prev.slice(0, index + 1));
  };

  const handleDelete = async (type, id) => {
    const isHardDelete = type === 'folder' || currentView === 'trash';
    if (isHardDelete && !window.confirm(`Are you sure you want to permanently delete this ${type}?`)) return;
    
    try {
      await api.delete(`/bag/${type}s/${id}`);
      if (type === 'folder') {
        setFolders(prev => prev.filter(f => f.id !== id));
      } else {
        setFiles(prev => prev.filter(f => f.id !== id));
      }
    } catch (err) {
      console.error('Error deleting item', err);
    }
  };

  const handleRestore = async (id) => {
    try {
      await api.patch(`/bag/files/${id}/restore`);
      setFiles(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      console.error('Error restoring file', err);
    }
  };

  const handleContextMenu = (e, item, type) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item,
      type
    });
  };

  const openRenameModal = (item, type) => {
    setItemToRename({ ...item, type });
    setRenameValue(type === 'folder' ? item.name : item.file_name);
    setRenameModal(true);
    setContextMenu(null);
  };

  const getFileIcon = (mimeType) => {
    if (!mimeType) return <FileIcon />;
    if (mimeType.startsWith('image/')) return <ImageIcon />;
    if (mimeType === 'application/pdf') return <FileIcon className="text-red-500" />;
    return <FileIcon />;
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const openPreview = (file) => {
    setPreviewFile(file);
  };

  // Drag and drop handlers
  const onDragOver = (e) => {
    e.preventDefault();
    if (currentView === 'trash') return;
    setIsDragging(true);
  };
  
  const onDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const onDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (currentView === 'trash') return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const changeView = (view) => {
    setCurrentView(view);
    if (view === 'trash') {
      setBreadcrumbs([{ id: 'trash', name: 'Trash' }]);
      setCurrentFolder('root'); // irrelevant for trash currently, but reset
    } else {
      setBreadcrumbs([{ id: 'root', name: 'My Bag' }]);
      setCurrentFolder('root');
    }
  };

  const filteredFolders = folders.filter(f => f.name?.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredFiles = files.filter(f => f.file_name?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="sess-page animate-fade-in" style={{background: 'transparent', height: '100%', flex: 1, display: 'flex', flexDirection: 'column', padding: '1.5rem 2rem'}}>
      
      {/* HEADER */}
      <div className="sess-header" style={{flexShrink: 0, marginBottom: '24px'}}>
        <div className="sess-header-left">
          <h1>Storage Bag</h1>
          <p className="sess-subtitle">Manage your personal files and notes</p>
        </div>
        <div className="bag-actions" style={{display: 'flex', gap: '12px', alignItems: 'center'}}>
          {/* Search Input */}
          <div style={{position: 'relative', width: '250px'}}>
            <Search size={16} style={{position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8'}} />
            <input 
              type="text"
              placeholder="Search bag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{width: '100%', padding: '8px 16px 8px 36px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box'}}
            />
          </div>

          {currentView !== 'trash' && (
            <>
              <button className="bag-action-btn secondary" onClick={() => setNewFolderModal(true)}>
                <Plus size={16} /> New Folder
              </button>
              <button className="bag-action-btn primary" onClick={() => fileInputRef.current.click()}>
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />} 
                Upload
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={handleFileUpload}
              />
            </>
          )}
        </div>
      </div>

      {/* TABS */}
      <div style={{display: 'flex', gap: '8px', marginBottom: '16px'}}>
        <button 
          onClick={() => changeView('my_bag')}
          style={{padding: '8px 16px', borderRadius: '8px', border: 'none', background: currentView === 'my_bag' ? '#105934' : 'white', color: currentView === 'my_bag' ? 'white' : '#64748b', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #e2e8f0'}}
        >
          <Folder size={16} /> My Bag
        </button>
        <button 
          onClick={() => changeView('trash')}
          style={{padding: '8px 16px', borderRadius: '8px', border: 'none', background: currentView === 'trash' ? '#ef4444' : 'white', color: currentView === 'trash' ? 'white' : '#64748b', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #e2e8f0'}}
        >
          <Trash2 size={16} /> Trash
        </button>
      </div>

      {/* BREADCRUMBS */}
      <div className="bag-breadcrumbs" style={{marginBottom: '16px'}}>
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={crumb.id}>
            <span 
              className="crumb" 
              onClick={() => handleBreadcrumbClick(idx)}
            >
              {crumb.name}
            </span>
            {idx < breadcrumbs.length - 1 && <ChevronRight size={16} className="separator" />}
          </React.Fragment>
        ))}
      </div>

      {/* CONTENT */}
      <div 
        className="bag-content"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => setContextMenu(null)}
        style={{flex: 1, position: 'relative', overflowY: 'auto', padding: '0.5rem 0.5rem 2rem 0.5rem'}}
      >
        {isDragging && currentView !== 'trash' && (
          <div className="bag-dropzone-overlay">
            <UploadCloud size={64} />
            <h3>Drop files here to upload</h3>
          </div>
        )}

        {loading ? (
          <div className="empty-state">
            <Loader2 size={48} className="animate-spin" />
            <p>Loading your bag...</p>
          </div>
        ) : filteredFolders.length === 0 && filteredFiles.length === 0 ? (
          <div className="empty-state">
            <Folder size={48} />
            <p>{searchQuery ? 'No results found matching your search' : currentView === 'trash' ? 'Trash is empty' : 'This folder is empty'}</p>
          </div>
        ) : (
          <div className="bag-grid">
            {/* Folders */}
            {filteredFolders.map(folder => (
                <div 
                  key={folder.id} 
                  className="bag-item-card" 
                  onClick={() => handleFolderClick(folder)}
                  onContextMenu={(e) => handleContextMenu(e, folder, 'folder')}
                >
                  <div className="bag-item-icon folder">
                    <Folder size={24} />
                  </div>
                  <div className="bag-item-name">{folder.name}</div>
                  <div className="bag-item-meta">Folder</div>
                  
                  <button 
                    className="bag-item-menu" 
                    onClick={(e) => handleContextMenu(e, folder, 'folder')}
                  >
                    <MoreVertical size={16} />
                  </button>
                </div>
              ))}

              {/* Files */}
              {filteredFiles.map(file => (
                <div 
                  key={file.id} 
                  className="bag-item-card" 
                  onClick={() => openPreview(file)}
                  onContextMenu={(e) => handleContextMenu(e, file, 'file')}
                >
                  <div className={`bag-item-icon ${file.mime_type?.startsWith('image/') ? 'image' : 'file'}`}>
                    {file.mime_type?.startsWith('image/') ? (
                      <img src={file.file_url} alt={file.file_name} />
                    ) : (
                      getFileIcon(file.mime_type)
                    )}
                  </div>
                  <div className="bag-item-name" title={file.file_name}>{file.file_name}</div>
                  <div className="bag-item-meta">{formatSize(file.file_size)}</div>
                  
                  <button 
                    className="bag-item-menu" 
                    onClick={(e) => handleContextMenu(e, file, 'file')}
                  >
                    <MoreVertical size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="context-menu" 
          ref={contextMenuRef}
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          {currentView !== 'trash' && (
            <button onClick={() => openRenameModal(contextMenu.item, contextMenu.type)}>
              <Edit2 size={16} /> Rename
            </button>
          )}
          
          {contextMenu.type === 'file' && (
            <a href={contextMenu.item.file_url} target="_blank" rel="noreferrer">
              <Download size={16} /> Download
            </a>
          )}
          
          {currentView === 'trash' && contextMenu.type === 'file' && (
            <button onClick={() => { handleRestore(contextMenu.item.id); setContextMenu(null); }}>
              <RotateCcw size={16} /> Restore
            </button>
          )}

          <button 
            className="text-red-600" 
            onClick={() => { handleDelete(contextMenu.type, contextMenu.item.id); setContextMenu(null); }}
          >
            <Trash2 size={16} /> {currentView === 'trash' ? 'Delete Permanently' : 'Delete'}
          </button>
        </div>
      )}

      {/* New Folder Modal */}
      {newFolderModal && (
        <div className="bag-modal-overlay">
          <div className="bag-modal">
            <div className="bag-modal-title">New Folder</div>
            <form onSubmit={handleCreateFolder}>
              <input 
                type="text" 
                className="bag-modal-input" 
                placeholder="Folder Name"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                autoFocus
              />
              <div className="bag-modal-actions">
                <button type="button" className="bag-action-btn secondary" onClick={() => setNewFolderModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="bag-action-btn primary" disabled={!newFolderName.trim()}>
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renameModal && (
        <div className="bag-modal-overlay">
          <div className="bag-modal">
            <div className="bag-modal-title">Rename {itemToRename?.type === 'folder' ? 'Folder' : 'File'}</div>
            <form onSubmit={handleRename}>
              <input 
                type="text" 
                className="bag-modal-input" 
                placeholder="New Name"
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                autoFocus
              />
              <div className="bag-modal-actions">
                <button type="button" className="bag-action-btn secondary" onClick={() => setRenameModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="bag-action-btn primary" disabled={!renameValue.trim()}>
                  Rename
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <div className="preview-modal-overlay">
          <div className="preview-modal-header">
            <div className="preview-modal-title">{previewFile.file_name}</div>
            <div className="preview-modal-actions">
              <a href={previewFile.file_url} target="_blank" rel="noreferrer" className="preview-icon-btn">
                <Download size={20} />
              </a>
              <button className="preview-icon-btn" onClick={() => setPreviewFile(null)}>
                <X size={20} />
              </button>
            </div>
          </div>
          <div className="preview-modal-content">
            {previewFile.mime_type?.startsWith('image/') ? (
              <img src={previewFile.file_url} alt="Preview" className="preview-image" />
              ) : previewFile.mime_type === 'application/pdf' ? (
                <iframe 
                  src={`https://docs.google.com/viewer?url=${encodeURIComponent(previewFile.file_url.replace('http://', 'https://'))}&embedded=true`} 
                  title="PDF Preview" 
                  className="preview-iframe" 
                  frameBorder="0"
                />
              ) : (
              <div className="empty-state" style={{ color: 'white' }}>
                <FileIcon size={64} />
                <p>No preview available for this file type.</p>
                <a href={previewFile.file_url} target="_blank" rel="noreferrer" style={{ color: '#818cf8' }}>
                  Download to view
                </a>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default Bag;
