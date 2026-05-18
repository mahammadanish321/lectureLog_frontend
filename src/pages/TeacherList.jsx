import React, { useState, useEffect } from 'react';
import api from '../api';
import { Users, Search, Trash2, Edit2, Check, X, UserPlus, Upload, Loader2, CheckCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import './TeacherList.css';

const TeacherList = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const isAdmin = user?.role === 'admin';
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal & Registration State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentEditId, setCurrentEditId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);
  const [preview, setPreview] = useState(null);
  const [regFile, setRegFile] = useState(null);
  const [regData, setRegData] = useState({
    name: '', email: '', college_id: ''
  });

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/teachers');
      setTeachers(response.data);
      setError(null);
    } catch (err) {
      addToast('Could not load faculty directory. Please check your connection.', 'error');
      setError('Failed to load faculty directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setRegFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleEditClick = (teacher) => {
    setRegData({
      name: teacher.name,
      email: teacher.email,
      college_id: teacher.college_id
    });
    setPreview(teacher.image_url || `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/public/teachers/${teacher.id}.jpg`);
    setCurrentEditId(teacher.id);
    setIsEditMode(true);
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setIsEditMode(false);
    setCurrentEditId(null);
    setRegData({ name: '', email: '', college_id: '' });
    setRegFile(null);
    setPreview(null);
    setRegSuccess(false);
  };

  const handleRegSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    // Secure Electron detection via preload bridge
    const isElectron = !!(window.electronAPI?.isElectron);
    const AI_SERVICE_URL = 'http://127.0.0.1:8001';

    try {
      let embedding = null;

      // If in Electron, generate face embedding locally FIRST to avoid cloud-to-local mismatch
      if (isElectron && regFile) {
        console.log('[Electron] Generating local face embedding for teacher...');
        try {
          const aiFormData = new FormData();
          aiFormData.append('file', regFile);
          const aiResponse = await fetch(`${AI_SERVICE_URL}/embed`, {
            method: 'POST',
            body: aiFormData,
          });
          
          const aiData = await aiResponse.json();
          
          if (!aiResponse.ok || aiData.error) {
            throw new Error(aiData.error || `AI Service Error (${aiResponse.status})`);
          }

          embedding = aiData.embedding;
          if (!embedding || !Array.isArray(embedding)) {
            throw new Error('The AI could not extract a face signature from this photo. Please try a clearer picture.');
          }
          console.log('[Electron] ✅ Local teacher embedding generated successfully!');
        } catch (aiErr) {
          console.error('[Electron] ❌ Local AI Error:', aiErr.message);
          addToast(
            `Face Recognition Error: ${aiErr.message}. Please ensure the photo is clear and contains a single face.`, 
            'error'
          );
          setSubmitting(false);
          return;
        }
      }

      const data = new FormData();
      Object.keys(regData).forEach(key => data.append(key, regData[key]));
      if (embedding) data.append('face_embedding', JSON.stringify(embedding));
      
      // CRITICAL: Append file LAST for proper Multer parsing
      if (regFile) data.append('image', regFile);

      if (isEditMode) {
        await api.put(`/teachers/${currentEditId}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
        addToast('Faculty profile updated successfully!', 'success');
      } else {
        if (!regFile) { 
          addToast('Please upload a faculty photo to complete enrollment.', 'error'); 
          setSubmitting(false); 
          return; 
        }
        await api.post('/teachers', data, { headers: { 'Content-Type': 'multipart/form-data' } });
        addToast('New faculty member enrolled successfully!', 'success');
      }

      setRegSuccess(true);
      setTimeout(() => {
        closeModal();
        fetchTeachers();
      }, 1500);
    } catch (err) {
      console.error('[Registration Error] Full Details:', err.response?.data);
      const msg = err.response?.data?.message || 'We encountered an error while registering the teacher.';
      addToast(`${msg} ${err.response?.data?.error ? `(${err.response.data.error})` : ''}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this faculty profile?')) return;
    try {
      await api.delete(`/teachers/${id}`);
      addToast('Faculty profile deleted permanently.', 'info');
      fetchTeachers();
    } catch (err) {
      addToast('Failed to delete faculty member.', 'error');
    }
  };

  const filteredTeachers = teachers.filter(t => {
    const searchLower = searchQuery.toLowerCase();
    return t.name.toLowerCase().includes(searchLower) || 
           (t.college_id && t.college_id.toLowerCase().includes(searchLower));
  });

  return (
    <div className="teacher-list-container">
      <div className="management-header-row">
        <div className="title-section">
          <h1>Faculty Management</h1>
        </div>
        <div className="management-context-pill">
          <span className="meta">Admin</span>
          <span className="title">Academic Staff</span>
        </div>
        <div className="header-actions">
          <button className="action-btn-primary" onClick={() => setShowAddModal(true)}>
            <UserPlus size={16} style={{ marginRight: '8px' }} />
            Add Teacher
          </button>
          <button className="action-btn-outline" onClick={fetchTeachers}>
            Refresh List
          </button>
        </div>
      </div>

      <div className="teacher-table-card">
        <div className="table-controls">
          <div className="search-box">
            <Search size={18} color="#94a3b8" />
            <input type="text" placeholder="Search faculty by name or ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>

        <div className="teacher-data-table-wrapper">
          <table className="teacher-data-table">
            <thead>
              <tr><th>Profile</th><th>Faculty Details</th><th>Identifiers</th>{isAdmin && <th>Actions</th>}</tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" className="loading-cell">Synchronizing staff data...</td></tr>
              ) : filteredTeachers.map((teacher) => (
                <tr key={teacher.id}>
                  <td>
                    <div className="teacher-avatar-large">
                      <img src={teacher.image_url || `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/public/teachers/${teacher.id}.jpg`} alt={teacher.name} onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=' + teacher.name; }} />
                    </div>
                  </td>
                  <td>
                    <div className="info-cell"><span className="teacher-name">{teacher.name}</span><span className="teacher-email">{teacher.email}</span></div>
                  </td>
                  <td>
                    <div className="teacher-id-badge">ID: {teacher.college_id}</div>
                  </td>
                  {isAdmin && (
                    <td>
                      <div className="action-buttons">
                        <button className="btn-edit" onClick={() => handleEditClick(teacher)}><Edit2 size={14} /></button>
                        <button className="btn-delete" onClick={() => handleDelete(teacher.id)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* TEACHER ENROLLMENT MODAL */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-pop-in">
            <div className="modal-header">
              <div className="modal-header-copy">
                <h2>{isEditMode ? 'Update Faculty Profile' : 'Faculty Enrollment'}</h2>
                <p>{isEditMode ? 'Modify existing staff metadata.' : 'Initialize a secure academic staff profile.'}</p>
              </div>
              <button type="button" className="modal-close-btn" onClick={closeModal} aria-label="Close faculty enrollment popup">
                <X size={20} />
              </button>
            </div>

            {regSuccess ? (
              <div className="success-card-inline">
                <CheckCircle size={48} color="#22c55e" />
                <h3>{isEditMode ? 'Update Successful' : 'Enrollment Successful'}</h3>
              </div>
            ) : (
              <form onSubmit={handleRegSubmit}>
                <div className="enrollment-form-grid">
                  {/* LEFT: IMAGE */}
                  <div className="image-upload-column">
                    <label className="image-upload-square">
                      {preview ? <img src={preview} alt="Preview" /> : <Upload size={24} />}
                      <input type="file" onChange={handleFileChange} hidden />
                    </label>
                    <span className="upload-label">Faculty Photo</span>
                  </div>

                  {/* RIGHT: FIELDS */}
                  <div className="fields-column">
                    <div className="form-group">
                      <label>Full Name & Title</label>
                      <input type="text" placeholder="e.g. Dr. Sarah Connor" value={regData.name} onChange={e => setRegData({...regData, name: e.target.value})} required />
                    </div>
                    
                    <div className="form-group">
                      <label>Faculty ID (College ID)</label>
                      <input type="text" placeholder="TCH-101" value={regData.college_id} onChange={e => setRegData({...regData, college_id: e.target.value})} required />
                    </div>

                    <div className="form-group">
                      <label>Institutional Email</label>
                      <input type="email" placeholder="sarah@college.edu" value={regData.email} onChange={e => setRegData({...regData, email: e.target.value})} required />
                    </div>
                  </div>
                </div>

                <div className="modal-actions-row">
                  <button type="button" className="btn-modal-cancel" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn-modal-submit" disabled={submitting}>
                    {submitting ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                    {submitting ? (isEditMode ? 'Updating...' : 'Registering...') : (isEditMode ? 'Update Profile' : 'Finalize Enrollment')}
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

export default TeacherList;
