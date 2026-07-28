import React, { useState, useEffect, useRef } from 'react';
import { X, Folder, FileText, ChevronLeft, Loader2, HardDrive, UploadCloud } from 'lucide-react';
import api from '../../api';
import './BagFilePicker.css';

const BagFilePicker = ({ isOpen, onClose, onSelectFile }) => {
  const [currentFolderId, setCurrentFolderId] = useState('root');
  const [folderHistory, setFolderHistory] = useState([]); // Array of { id, name }
  const [contents, setContents] = useState({ folders: [], files: [] });
  const [loading, setLoading] = useState(true);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      fetchContents(currentFolderId);
    }
  }, [isOpen, currentFolderId]);

  const fetchContents = async (folderId) => {
    try {
      setLoading(true);
      const res = await api.get(`/bag?folder_id=${folderId}`);
      setContents(res.data);
    } catch (error) {
      console.error('Failed to fetch bag contents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = (folder) => {
    setFolderHistory(prev => [...prev, { id: currentFolderId, name: folder.name }]);
    setCurrentFolderId(folder.id);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setUploadingFile(true);
      const formData = new FormData();
      formData.append('file', file);
      if (currentFolderId !== 'root') {
        formData.append('folder_id', currentFolderId);
      }

      const res = await api.post('/bag/files', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // Successfully uploaded! Automatically select it to attach
      onSelectFile(res.data);
    } catch (error) {
      console.error('Failed to upload file:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to upload file from device. Please check your network and try again.';
      alert(errorMessage);
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleBackClick = () => {
    if (folderHistory.length > 0) {
      const newHistory = [...folderHistory];
      const prevFolder = newHistory.pop();
      setFolderHistory(newHistory);
      setCurrentFolderId(prevFolder.id);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="picker-overlay animate-fade-in">
      <div className="picker-modal">
        <div className="picker-header">
          <div className="picker-title">
            <HardDrive size={18} className="picker-title-icon" />
            <h3>Attach from Bag</h3>
          </div>
          <button className="icon-btn-ghost close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="picker-nav-bar">
          <div className="picker-nav-left">
            {folderHistory.length > 0 ? (
              <button className="back-btn" onClick={handleBackClick}>
                <ChevronLeft size={16} /> Back
              </button>
            ) : (
              <span className="current-location">Root Directory</span>
            )}
          </div>
          
          <div className="picker-nav-right">
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileChange}
            />
            <button 
              className="primary-btn upload-device-btn" 
              onClick={handleUploadClick}
              disabled={uploadingFile}
            >
              {uploadingFile ? (
                <><Loader2 size={16} className="spin-icon" /> Uploading...</>
              ) : (
                <><UploadCloud size={16} /> Upload File</>
              )}
            </button>
          </div>
        </div>

        <div className="picker-content">
          {loading ? (
            <div className="picker-loading">
              <Loader2 className="spin-icon" size={24} />
              <span>Loading files...</span>
            </div>
          ) : contents.folders.length === 0 && contents.files.length === 0 ? (
            <div className="picker-empty">
              <p>This folder is empty.</p>
            </div>
          ) : (
            <div className="picker-grid">
              {contents.folders.map(folder => (
                <div 
                  key={`folder-${folder.id}`} 
                  className="picker-item folder" 
                  onClick={() => handleFolderClick(folder)}
                >
                  <div className="item-icon folder-icon">
                    <Folder size={24} />
                  </div>
                  <span className="item-name">{folder.name}</span>
                </div>
              ))}

              {contents.files.map(file => (
                <div 
                  key={`file-${file.id}`} 
                  className="picker-item file" 
                  onClick={() => onSelectFile(file)}
                >
                  <div className="item-icon file-icon">
                    <FileText size={24} />
                  </div>
                  <span className="item-name" title={file.file_name}>{file.file_name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BagFilePicker;
