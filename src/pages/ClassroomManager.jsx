import React, { useState, useEffect } from 'react';
import api from '../api';
import { MonitorPlay, Search, Trash2, Edit2, Check, X, Plus, Loader2, CheckCircle, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './ClassroomManager.css';

const ClassroomManager = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal & Form State
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentEditId, setCurrentEditId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    camera_source: ''
  });

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

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const handleEditClick = (room) => {
    setFormData({
      name: room.name,
      camera_source: room.camera_source
    });
    setCurrentEditId(room.id);
    setIsEditMode(true);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setIsEditMode(false);
    setCurrentEditId(null);
    setFormData({ name: '', camera_source: '' });
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
    (r.camera_source && r.camera_source.toLowerCase().includes(searchQuery.toLowerCase()))
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
                    <td><span className="camera-source-text">{room.camera_source || 'No source configured'}</span></td>
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
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    required 
                  />
                </div>
                
                <div className="form-group">
                  <label>Camera / CCTV Input</label>
                  <input 
                    type="text" 
                    placeholder="Camera ID or RTSP/Web Stream URL" 
                    value={formData.camera_source} 
                    onChange={e => setFormData({...formData, camera_source: e.target.value})} 
                    required 
                  />
                </div>
                <p className="form-hint">ID used by the AI monitoring microservice to capture live video frames.</p>

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
