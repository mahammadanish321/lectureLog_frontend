import React, { useState, useEffect } from 'react';
import api from '../api';
import { MonitorPlay, Loader2, Edit2, Trash2, Check, X } from 'lucide-react';
import './ClassroomManager.css';

const ClassroomManager = () => {
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name: '', camera_url: '' });
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [availableCameras, setAvailableCameras] = useState([]);

  useEffect(() => {
    fetchClassrooms();
  }, []);

  useEffect(() => {
    const getCameras = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true })
          .then(stream => stream.getTracks().forEach(track => track.stop()))
          .catch(() => {});

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        const cameraList = videoDevices.map((device, index) => ({
          id: device.deviceId,
          name: device.label || `Camera ${index}`,
          index: index
        }));
        
        setAvailableCameras(cameraList);
      } catch (err) {
        console.error("Failed to fetch cameras:", err);
      }
    };
    
    getCameras();
  }, []);

  const fetchClassrooms = async () => {
    try {
      const response = await api.get('/classrooms');
      setClassrooms(response.data);
    } catch (err) {
      console.error('Error fetching classrooms:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/classrooms/${editingId}`, formData);
        setEditingId(null);
      } else {
        await api.post('/classrooms', formData);
      }
      setFormData({ name: '', camera_url: '' });
      fetchClassrooms();
    } catch (err) {
      alert('Error saving classroom: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this classroom?')) return;
    try {
      await api.delete(`/classrooms/${id}`);
      fetchClassrooms();
    } catch (err) {
      alert('Error deleting classroom: ' + (err.response?.data?.message || err.message));
    }
  };

  const startEdit = (classroom) => {
    setEditingId(classroom.id);
    setFormData({ name: classroom.name, camera_url: classroom.camera_url || '' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', camera_url: '' });
  };

  return (
    <div className="classroom-manager animate-fade-in">
      <div className="card-header" style={{ marginBottom: '2rem' }}>
        <h2>Classroom Management</h2>
        <p className="text-muted">Manage available rooms and their associated camera IDs.</p>
      </div>

      <div className="manager-grid">
        {/* Add/Edit Form */}
        <div className="card form-card">
          <div className="card-header">
            <h3>{editingId ? 'Edit Classroom' : 'Add New Classroom'}</h3>
          </div>
          <form onSubmit={handleSubmit} className="classroom-form">
            <div className="form-group">
              <label>Room / Lab Name</label>
              <input
                type="text"
                placeholder="e.g. Lab 4A"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
             <div className="form-group">
               <label>Camera / CCTV Input</label>
               {availableCameras.length > 0 ? (
                 <select
                   value={formData.camera_url}
                   onChange={(e) => setFormData({ ...formData, camera_url: e.target.value })}
                   required
                   style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                 >
                   <option value="" style={{ background: '#111', color: '#888' }}>-- Select Camera Input --</option>
                   {availableCameras.map((cam) => (
                     <option key={cam.id} value={cam.name} style={{ background: '#111', color: '#fff' }}>
                       {cam.name} (Index {cam.index})
                     </option>
                   ))}
                 </select>
               ) : (
                 <input
                   type="text"
                   placeholder="Type camera name (e.g. Smart Connect Camera)"
                   value={formData.camera_url}
                   onChange={(e) => setFormData({ ...formData, camera_url: e.target.value })}
                   required
                 />
               )}
               <small className="helper-text">Directly connect organizational camera setups cleanly.</small>
             </div>
            <div className="form-actions">
              {editingId && (
                <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
                  <X size={16} /> Cancel
                </button>
              )}
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                {editingId ? 'Update Classroom' : 'Add Classroom'}
              </button>
            </div>
          </form>
        </div>

        {/* Classroom List */}
        <div className="card list-card">
          <div className="card-header">
            <h3>Current Classrooms</h3>
          </div>
          {loading ? (
            <div className="loader-container">
              <Loader2 className="animate-spin" size={24} />
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ROOM NAME</th>
                    <th>CAMERA IDs</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {classrooms.length > 0 ? (
                    classrooms.map((c) => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: '500' }}>{c.name}</td>
                        <td className="text-muted">{c.camera_url || 'N/A'}</td>
                        <td className="actions-cell">
                          <button 
                            className="btn-icon btn-edit" 
                            onClick={() => startEdit(c)}
                            title="Edit"
                          >
                            <Edit2 size={16} />
                            <span>Edit</span>
                          </button>
                          <button 
                            className="btn-icon btn-delete" 
                            onClick={() => handleDelete(c.id)}
                            title="Delete"
                          >
                            <Trash2 size={16} />
                            <span>Delete</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="text-center text-muted" style={{ padding: '2rem' }}>
                        No classrooms found. Add one to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClassroomManager;
