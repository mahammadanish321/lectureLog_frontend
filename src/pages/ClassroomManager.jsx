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
  const [formData, setFormData] = useState({ name: '', cameras: [{ camera_url: '', camera_name: '', camera_type: 'webcam', camera_quality: '720p' }] });

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
    // Build cameras array from room.cameras or legacy single camera
    let cams = [];
    if (room.cameras && room.cameras.length > 0) {
      cams = room.cameras.map(c => ({ camera_url: c.camera_url || '', camera_name: c.camera_name || '', camera_type: c.camera_type || 'webcam', camera_quality: c.camera_quality || '720p' }));
    } else {
      cams = [{ camera_url: room.camera_url || '', camera_name: room.camera_name || '', camera_type: room.camera_type || 'webcam', camera_quality: room.camera_quality || '720p' }];
    }
    setFormData({ name: room.name, cameras: cams });
    setCurrentEditId(room.id);
    setIsEditMode(true);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setIsEditMode(false);
    setCurrentEditId(null);
    setFormData({ name: '', cameras: [{ camera_url: '', camera_name: '', camera_type: 'webcam', camera_quality: '720p' }] });
    setSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isEditMode) {
        await api.put(`/classrooms/${currentEditId}`, { name: formData.name, cameras: formData.cameras, camera_url: formData.cameras[0]?.camera_url, camera_name: formData.cameras[0]?.camera_name, camera_type: formData.cameras[0]?.camera_type, camera_quality: formData.cameras[0]?.camera_quality });
      } else {
        await api.post('/classrooms', { name: formData.name, cameras: formData.cameras, camera_url: formData.cameras[0]?.camera_url, camera_name: formData.cameras[0]?.camera_name, camera_type: formData.cameras[0]?.camera_type, camera_quality: formData.cameras[0]?.camera_quality });
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
                <tr><th>Room / Lab Name</th><th>Cameras</th>{isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}</tr>
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
                            // Multi-camera: show count + names
                            if (room.cameras && room.cameras.length > 0) {
                              const names = room.cameras.map((c, i) => c.camera_name || `Camera ${i+1}`);
                              return `${names.length} cam${names.length > 1 ? 's' : ''}: ${names.join(', ')}`;
                            }
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
                    <label style={{ margin: 0 }}>Cameras ({formData.cameras.length})</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        type="button" 
                        className="text-toggle-btn" 
                        onClick={() => setUseManualInput(!useManualInput)}
                        style={{ fontSize: '0.7rem', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}
                      >
                        {useManualInput ? 'Use Hardware List' : 'Enter Manual URL'}
                      </button>
                    </div>
                  </div>

                  {formData.cameras.map((cam, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem', padding: '0.6rem', background: 'rgba(0,0,0,0.02)', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', minWidth: '20px' }}>#{idx+1}</span>
                      {useManualInput ? (
                        <input 
                          type="text" 
                          placeholder="RTSP, Web Stream URL or Manual ID" 
                          value={cam.camera_url} 
                          onChange={e => {
                            const updated = [...formData.cameras];
                            updated[idx] = { ...updated[idx], camera_url: e.target.value };
                            setFormData({ ...formData, cameras: updated });
                          }}
                          style={{ flex: 1 }}
                          required={idx === 0}
                        />
                      ) : (
                        <select 
                          value={cam.camera_url} 
                          onChange={e => {
                            const selectedId = e.target.value;
                            const found = availableCameras.find(c => c.id === selectedId);
                            const updated = [...formData.cameras];
                            updated[idx] = { ...updated[idx], camera_url: selectedId, camera_name: found ? found.name : '' };
                            setFormData({ ...formData, cameras: updated });
                          }}
                          style={{ flex: 1 }}
                          required={idx === 0}
                        >
                          <option value="">Select Camera</option>
                          {availableCameras.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      )}
                      <select value={cam.camera_type} onChange={e => {
                        const updated = [...formData.cameras];
                        updated[idx] = { ...updated[idx], camera_type: e.target.value };
                        setFormData({ ...formData, cameras: updated });
                      }} style={{ width: '110px' }}>
                        <option value="webcam">Webcam</option>
                        <option value="cctv">CCTV</option>
                      </select>
                      <select value={cam.camera_quality} onChange={e => {
                        const updated = [...formData.cameras];
                        updated[idx] = { ...updated[idx], camera_quality: e.target.value };
                        setFormData({ ...formData, cameras: updated });
                      }} style={{ width: '80px' }}>
                        <option value="480p">480p</option>
                        <option value="720p">720p</option>
                        <option value="1080p">1080p</option>
                        <option value="4k">4K</option>
                      </select>
                      {formData.cameras.length > 1 && (
                        <button type="button" onClick={() => {
                          setFormData({ ...formData, cameras: formData.cameras.filter((_, i) => i !== idx) });
                        }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }} title="Remove camera">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => {
                    setFormData({ ...formData, cameras: [...formData.cameras, { camera_url: '', camera_name: '', camera_type: 'webcam', camera_quality: '720p' }] });
                  }} style={{ fontSize: '0.75rem', background: 'none', border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '0.4rem 0.8rem', cursor: 'pointer', color: '#64748b', fontWeight: 600, width: '100%', marginTop: '0.25rem' }}>
                    <Plus size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Add Another Camera
                  </button>
                </div>

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
