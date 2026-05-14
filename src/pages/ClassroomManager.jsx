import React, { useState, useEffect } from 'react';
import api from '../api';
import { MonitorPlay, Search, Trash2, Edit2, Check, X, Plus, Loader2, CheckCircle, Camera, RefreshCw } from 'lucide-react';
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

  // Modal & Form State
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentEditId, setCurrentEditId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    camera_url: '',
    camera_name: ''
  });

  const detectCameras = async () => {
    try {
      // 1. Try to get hardware list from AI Service (Bypasses "Device in use" locking)
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

      // 2. Fallback to browser enumerateDevices
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
          await api.put(`/classrooms/${room.id}`, {
            ...room,
            camera_url: matchedDeviceIndex.toString()
          });
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
      await syncHardwareIndices(true); // Silent sync on load
    };
    init();
  }, []);

  const handleEditClick = (room) => {
    // If it's a URL (contains / or :) it's manual, otherwise it's hardware
    const isManual = room.camera_url?.includes('/') || room.camera_url?.includes(':');
    setUseManualInput(isManual);
    
    setFormData({
      name: room.name,
      camera_url: room.camera_url || '',
      camera_name: room.camera_name || ''
    });
    setCurrentEditId(room.id);
    setIsEditMode(true);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setIsEditMode(false);
    setCurrentEditId(null);
    setFormData({ name: '', camera_url: '', camera_name: '' });
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

  const filteredRooms = classrooms.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (r.camera_url && r.camera_url.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="classroom-manager-container">
      <div className="management-header-row">
        <div className="title-section">
          <h1>Classroom Management</h1>
        </div>
        <div className="management-context-pill">
          <span className="meta">Admin</span>
          <span className="title">Resource Fleet</span>
        </div>
        <div className="header-actions">
          <button className="action-btn-outline" onClick={syncHardwareIndices} title="Re-map camera indices based on saved device labels">
            <RefreshCw size={16} style={{ marginRight: '8px' }} className={loading ? 'animate-spin' : ''} />
            Sync Hardware
          </button>
          <button className="action-btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} style={{ marginRight: '8px' }} />
            Initialize Classroom
          </button>
          <button className="action-btn-outline" onClick={fetchClassrooms}>
            Refresh Fleet
          </button>
        </div>
      </div>

      <div className="classroom-table-card">
        <div className="table-controls">
          <div className="search-box">
            <Search size={18} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search by room name or camera source..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
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
                          
                          // If it's a manual URL (contains / or :) show it as is
                          if (rawId.includes('/') || rawId.includes(':')) return rawId;
                          
                          // Use stored camera_name if available
                          if (room.camera_name) return room.camera_name;

                          // Otherwise, try to resolve friendly name from hardware list (fallback)
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

      {/* CLASSROOM INITIALIZATION MODAL */}
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
                        setFormData({
                          ...formData, 
                          camera_url: selectedId,
                          camera_name: cam ? cam.name : ''
                        });
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
                <p className="form-hint">
                  {useManualInput 
                    ? "Enter the stream URL or specific hardware index." 
                    : "Select a physically connected device from the list above."}
                </p>

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
