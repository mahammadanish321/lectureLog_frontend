import React, { useState, useEffect } from 'react';
import api from '../api';
import { MonitorPlay, Search, Trash2, Edit2, Check, X, Plus, Loader2, CheckCircle, Camera, RefreshCw, Grid, List } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './ClassroomManager.css';

const ClassroomManager = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [availableCameras, setAvailableCameras] = useState([]);
  const [useManualInput, setUseManualInput] = useState(false);

  const [viewMode, setViewMode] = useState('list'); // 'list' | 'bulk'

  // Modal & Form State (Single)
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentEditId, setCurrentEditId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({ name: '', camera_url: '', camera_name: '', camera_type: 'webcam', camera_quality: '720p' });

  // Bulk Spreadsheet State
  const generateNewRow = () => ({ id: Date.now().toString() + Math.random(), name: '', camera_url: '', camera_type: 'webcam', camera_quality: '720p' });
  const [spreadsheetRows, setSpreadsheetRows] = useState([generateNewRow()]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const detectCameras = async () => {
    try {
      try {
        const aiResp = await fetch('http://localhost:8001/system/hardware_cameras');
        if (aiResp.ok) {
          const aiCams = await aiResp.json();
          if (aiCams && aiCams.length > 0) {
            setAvailableCameras(aiCams);
            return;
          }
        }
      } catch (e) {
        console.warn("AI Service hardware detection unavailable, falling back to browser API");
      }

      let devices = await navigator.mediaDevices.enumerateDevices();
      let videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length > 0 && !videoDevices[0].label) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach(track => track.stop());
          devices = await navigator.mediaDevices.enumerateDevices();
          videoDevices = devices.filter(device => device.kind === 'videoinput');
        } catch (permErr) {}
      }
      
      const formattedCameras = videoDevices.map((dev, index) => ({
        id: index.toString(),
        name: dev.label || `Camera ${index + 1}`
      }));
      
      setAvailableCameras(formattedCameras);
    } catch (err) {
      console.error('Camera detection failed:', err);
    }
  };

  const fetchClassrooms = async () => {
    try {
      setLoading(true);
      const response = await api.get('/classrooms');
      setClassrooms(response.data);
    } catch (err) {
      console.error('Failed to load classrooms');
    } finally {
      setLoading(false);
    }
  };

  const syncHardwareIndices = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length === 0) return;

      const response = await api.get('/classrooms');
      const currentClassrooms = response.data;

      let updatedCount = 0;
      for (const room of currentClassrooms) {
        if (!room.camera_name || room.camera_url.includes('/') || room.camera_url.includes(':')) continue;

        const matchedDeviceIndex = videoDevices.findIndex(dev => dev.label === room.camera_name);
        
        if (matchedDeviceIndex !== -1 && matchedDeviceIndex.toString() !== room.camera_url) {
          await api.put(`/classrooms/${room.id}`, { ...room, camera_url: matchedDeviceIndex.toString() });
          updatedCount++;
        }
      }

      if (!silent && updatedCount > 0) alert(`Hardware Sync Complete. Re-mapped ${updatedCount} camera(s).`);
      if (updatedCount > 0) fetchClassrooms();
    } catch (err) {
      if (!silent) console.error('Hardware sync failed:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchClassrooms();
      await detectCameras();
      await syncHardwareIndices(true);
    };
    init();
  }, []);

  // -- Single Add / Edit Handlers --
  const handleEditClick = (room) => {
    const isManual = room.camera_url?.includes('/') || room.camera_url?.includes(':');
    setUseManualInput(isManual);
    setFormData({ name: room.name, camera_url: room.camera_url || '', camera_name: room.camera_name || '', camera_type: room.camera_type || 'webcam', camera_quality: room.camera_quality || '720p' });
    setCurrentEditId(room.id);
    setIsEditMode(true);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setIsEditMode(false);
    setCurrentEditId(null);
    setFormData({ name: '', camera_url: '', camera_name: '', camera_type: 'webcam', camera_quality: '720p' });
    setSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isEditMode) {
        await api.put(`/classrooms/${currentEditId}`, formData);
      } else {
        await api.post('/classrooms', formData);
      }
      setSuccess(true);
      setTimeout(() => {
        closeModal();
        fetchClassrooms();
      }, 1200);
    } catch (err) {
      alert('Operation Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Decommission this classroom and its AI monitoring?')) return;
    try {
      await api.delete(`/classrooms/${id}`);
      fetchClassrooms();
    } catch (err) {
      alert('Delete failed.');
    }
  };

  // -- Bulk Spreadsheet Handlers --
  const handleSpreadsheetChange = (id, field, value) => {
    setSpreadsheetRows(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const addSpreadsheetRow = () => {
    setSpreadsheetRows(prev => [...prev, generateNewRow()]);
  };

  const removeSpreadsheetRow = (id) => {
    setSpreadsheetRows(prev => prev.filter(row => row.id !== id));
  };

  const startBulkRegistration = async () => {
    const validRows = spreadsheetRows.filter(row => row.name.trim() !== '' && row.camera_url.trim() !== '');
    if (validRows.length === 0) return alert('No valid rows found. Ensure Name and Camera Source are provided for at least one row.');

    setBulkSubmitting(true);
    try {
      for (const row of validRows) {
        // Find if they typed an ID that matches an available camera name
        const matchedCam = availableCameras.find(c => c.name === row.camera_url || c.id === row.camera_url);
        
        await api.post('/classrooms', {
          name: row.name,
          camera_url: matchedCam ? matchedCam.id : row.camera_url, // Use resolved ID if they picked a name
          camera_name: matchedCam ? matchedCam.name : '',
          camera_type: row.camera_type || 'webcam',
          camera_quality: row.camera_quality || '720p'
        });
      }
      setSpreadsheetRows([generateNewRow()]);
      setViewMode('list');
      fetchClassrooms();
      alert(`Successfully added ${validRows.length} classroom(s)!`);
    } catch (err) {
      alert('Bulk operation failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setBulkSubmitting(false);
    }
  };

  const filteredRooms = classrooms.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (r.camera_url && r.camera_url.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="classroom-manager-container">
      <div className="management-header-row">
        <div className="title-section" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1>Classroom Management</h1>
          <div className="management-context-pill" style={{ position: 'relative', left: 'auto', transform: 'none' }}>
            <span className="meta">Admin</span>
            <span className="title">Resource Fleet</span>
          </div>
        </div>
        
        <div className="header-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {/* Mode Toggle */}
          <div className="registration-mode-toggle" style={{ margin: 0 }}>
            <button 
              className={`mode-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <List size={16}/> Directory
            </button>
            <button 
              className={`mode-btn ${viewMode === 'bulk' ? 'active' : ''}`}
              onClick={() => setViewMode('bulk')}
            >
              <Grid size={16}/> Bulk Spreadsheet
            </button>
          </div>

          <button className="action-btn-outline" onClick={() => syncHardwareIndices(false)} title="Re-map camera indices">
            <RefreshCw size={16} style={{ marginRight: '8px' }} className={loading ? 'animate-spin' : ''} />
            Sync Hardware
          </button>
          <button className="action-btn-outline" onClick={fetchClassrooms}>
            Refresh
          </button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="classroom-table-card animate-fade-in">
          <div className="table-controls" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div className="search-box">
              <Search size={18} color="#94a3b8" />
              <input
                type="text"
                placeholder="Search by room name or camera source..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {isAdmin && (
              <button className="action-btn-primary" onClick={() => setShowModal(true)}>
                <Plus size={16} style={{ marginRight: '8px' }} />
                Add Single Room
              </button>
            )}
          </div>

          <div className="classroom-data-table-wrapper">
            <table className="classroom-data-table">
              <thead>
                <tr><th>Room / Lab Name</th><th>Camera Source / CCTV Input</th>{isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}</tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="3" className="loading-cell">Synchronizing hardware assets...</td></tr>
                ) : filteredRooms.length === 0 ? (
                  <tr><td colSpan="3" className="empty-cell">No classrooms found in current fleet.</td></tr>
                ) : (
                  filteredRooms.map((room) => (
                    <tr key={room.id}>
                      <td><span className="room-name-badge">{room.name}</span></td>
                      <td>
                        <span className="camera-url-text">
                          {(() => {
                            const rawId = room.camera_url;
                            if (!rawId) return 'No URL configured';
                            if (rawId.includes('/') || rawId.includes(':')) return rawId;
                            if (room.camera_name) return room.camera_name;
                            const matchedCam = availableCameras.find(cam => cam.id === rawId);
                            return matchedCam ? matchedCam.name : `Camera Index ${rawId}`;
                          })()}
                        </span>
                      </td>
                      {isAdmin && (
                        <td style={{ textAlign: 'right' }}>
                          <div className="action-buttons" style={{ justifyContent: 'flex-end' }}>
                            <button className="btn-edit" onClick={() => handleEditClick(room)}><Edit2 size={14} /></button>
                            <button className="btn-delete" onClick={() => handleDelete(room.id)}><Trash2 size={14} /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Bulk Spreadsheet UI */
        <div className="spreadsheet-container animate-fade-in" style={{ margin: '1.5rem 2.5rem' }}>
          <div className="spreadsheet-header">
            <div>
              <h3>Bulk Spreadsheet Entry</h3>
              <p>Type in data rapidly. Use the dropdown to select physical cameras, or type an RTSP stream URL directly.</p>
            </div>
            <button className="start-bulk-btn" onClick={startBulkRegistration} disabled={bulkSubmitting}>
              {bulkSubmitting ? <Loader2 size={16} className="animate-spin"/> : <Check size={16}/>} 
              {bulkSubmitting ? 'Saving...' : 'Start Bulk Registration'}
            </button>
          </div>

          <div className="spreadsheet-table-wrapper" style={{ maxHeight: 'calc(100vh - 280px)' }}>
            <table className="spreadsheet-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th style={{ width: '30%' }}>Room / Lab Name <span className="req">*</span></th>
                  <th>Camera Source (List or URL) <span className="req">*</span></th>
                  <th style={{ width: '140px' }}>Camera Type</th>
                  <th style={{ width: '140px' }}>Camera Quality</th>
                  <th style={{ width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {spreadsheetRows.map((row, index) => {
                  const isReady = row.name && row.camera_url;
                  return (
                    <tr key={row.id} className={isReady ? 'row-ready' : ''}>
                      <td className="row-index">{index + 1}</td>
                      <td>
                        <input type="text" value={row.name} placeholder="e.g. CS Lab 4A" onChange={e => handleSpreadsheetChange(row.id, 'name', e.target.value)} />
                      </td>
                      <td>
                        <input 
                          type="text" 
                          list="camera-list"
                          value={row.camera_url} 
                          placeholder="Select from list, or type RTSP://..." 
                          onChange={e => handleSpreadsheetChange(row.id, 'camera_url', e.target.value)} 
                        />
                      </td>
                      <td>
                        <select value={row.camera_type || 'webcam'} onChange={e => handleSpreadsheetChange(row.id, 'camera_type', e.target.value)}>
                          <option value="webcam">Webcam / USB</option>
                          <option value="cctv">CCTV (IP/RTSP)</option>
                        </select>
                      </td>
                      <td>
                        <select value={row.camera_quality || '720p'} onChange={e => handleSpreadsheetChange(row.id, 'camera_quality', e.target.value)}>
                          <option value="480p">480p</option>
                          <option value="720p">720p</option>
                          <option value="1080p">1080p</option>
                          <option value="4k">4K</option>
                        </select>
                      </td>
                      <td>
                        <button className="spreadsheet-remove-btn" onClick={() => removeSpreadsheetRow(row.id)} title="Remove row">
                          <Trash2 size={16}/>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            
            <datalist id="camera-list">
              {availableCameras.map(cam => (
                <option key={cam.id} value={cam.name} />
              ))}
            </datalist>
            
            <button className="add-row-btn" onClick={addSpreadsheetRow}>
              <Plus size={16}/> Add Blank Row
            </button>
          </div>
        </div>
      )}

      {/* CLASSROOM INITIALIZATION MODAL (Single) */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-pop-in">
            <div className="modal-header">
              <h2>{isEditMode ? 'Update Classroom' : 'Initialize New Resource'}</h2>
              <p>{isEditMode ? 'Modify hardware source and name.' : 'Define a new monitoring endpoint for the AI service.'}</p>
            </div>

            {success ? (
              <div className="success-card-inline">
                <CheckCircle size={48} color="#22c55e" />
                <h3>{isEditMode ? 'Fleet Updated' : 'Resource Initialized'}</h3>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="classroom-form">
                <div className="form-group">
                  <label>Room / Lab Name</label>
                  <input
                    type="text"
                    placeholder="e.g. CS Lab 4A"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <div className="label-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ margin: 0 }}>Camera / CCTV Input</label>
                    <button 
                      type="button" 
                      className="text-toggle-btn" 
                      onClick={() => setUseManualInput(!useManualInput)}
                      style={{ fontSize: '0.7rem', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}
                    >
                      {useManualInput ? 'Use Hardware List' : 'Enter Manual URL'}
                    </button>
                  </div>
                  
                  {useManualInput ? (
                    <input 
                      type="text" 
                      placeholder="RTSP, Web Stream URL or Manual ID" 
                      value={formData.camera_url} 
                      onChange={e => setFormData({...formData, camera_url: e.target.value})} 
                      required 
                    />
                  ) : (
                    <select 
                      value={formData.camera_url} 
                      onChange={e => {
                        const selectedId = e.target.value;
                        const cam = availableCameras.find(c => c.id === selectedId);
                        setFormData({ ...formData, camera_url: selectedId, camera_name: cam ? cam.name : '' });
                      }}
                      required
                    >
                      <option value="">Select Connected Camera</option>
                      {availableCameras.map(cam => (
                        <option key={cam.id} value={cam.id}>{cam.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="form-group">
                  <label>Camera Type</label>
                  <select
                    value={formData.camera_type}
                    onChange={e => setFormData(prev => ({ ...prev, camera_type: e.target.value }))}
                  >
                    <option value="webcam">Webcam / USB Camera</option>
                    <option value="cctv">CCTV (IP / RTSP)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Camera Quality</label>
                  <select
                    value={formData.camera_quality}
                    onChange={e => setFormData(prev => ({ ...prev, camera_quality: e.target.value }))}
                  >
                    <option value="480p">480p (Low)</option>
                    <option value="720p">720p (Standard)</option>
                    <option value="1080p">1080p (HD)</option>
                    <option value="4k">4K (Ultra HD)</option>
                  </select>
                </div>

                {formData.camera_url && !useManualInput && (
                  <div className="camera-preview-box" style={{ marginTop: '1.5rem', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <div style={{ padding: '0.6rem 1rem', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Hardware Preview (Backend Index: {formData.camera_url})</span>
                      <span style={{ color: '#22c55e' }}>● Live</span>
                    </div>
                    <img 
                      src={`http://localhost:8002/video_feed/${encodeURIComponent(formData.camera_url)}`} 
                      alt="Hardware Preview" 
                      style={{ width: '100%', height: '180px', objectFit: 'cover', display: 'block' }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                        const parent = e.target.parentElement;
                        const msg = document.createElement('div');
                        msg.style.padding = '2rem';
                        msg.style.textAlign = 'center';
                        msg.style.color = '#94a3b8';
                        msg.style.fontSize = '0.8rem';
                        msg.innerHTML = "Backend preview unavailable. Please ensure Camera Backend (Port 8002) is running.";
                        parent.appendChild(msg);
                      }}
                    />
                  </div>
                )}

                <div className="modal-actions-row">
                  <button type="button" className="btn-modal-cancel" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn-modal-submit" disabled={submitting}>
                    {submitting ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                    {submitting ? 'Connecting...' : (isEditMode ? 'Update Resource' : 'Initialize Classroom')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassroomManager;
