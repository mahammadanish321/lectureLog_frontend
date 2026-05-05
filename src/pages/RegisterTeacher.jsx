import React, { useState, useEffect } from 'react';
import api from '../api';
import { UserPlus, Upload, Loader2, CheckCircle, Trash2, Users, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './RegisterTeacher.css';

const RegisterTeacher = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    college_id: ''
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [teachers, setTeachers] = useState([]);
  const [fetchLoading, setFetchLoading] = useState(true);

  const fetchTeachers = async () => {
    try {
      const response = await api.get('/teachers');
      setTeachers(response.data);
    } catch (err) {
      console.error('Error fetching teachers:', err);
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this teacher?')) return;
    try {
      await api.delete(`/teachers/${id}`);
      fetchTeachers();
    } catch (err) {
      alert('Delete failed');
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    if (selectedFile) {
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return alert('Please upload a teacher photo');

    setLoading(true);
    const data = new FormData();
    data.append('name', formData.name);
    data.append('email', formData.email);
    data.append('college_id', formData.college_id);
    data.append('image', file);

    try {
      await api.post('/teachers', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccess(true);
      setFormData({ name: '', email: '', college_id: '' });
      setFile(null);
      setPreview(null);
      fetchTeachers(); 
    } catch (err) {
      alert('Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="management-header-row">
        <div className="title-section">
          <h1>Faculty Registration</h1>
        </div>

        <div className="management-context-pill">
          <span className="meta">Admin</span>
          <span className="title">Academic Staff</span>
        </div>

        <div className="header-actions">
          <button className="action-btn-outline" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={16} style={{ marginRight: '8px' }} />
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="register-grid">
        <div className="register-content animate-fade-in">
          <h3>Teacher Registration</h3>
          <p>Register a new faculty member to enable session management and routine assignment.</p>
          
          <form onSubmit={handleSubmit} className="register-form">
            <div className="form-sections">
              <div className="photo-section">
                <label className="photo-upload-label">
                  {preview ? (
                    <img src={preview} alt="Preview" className="photo-preview" />
                  ) : (
                    <div className="photo-placeholder">
                      <Upload size={32} />
                      <span>Upload Profile Photo</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleFileChange} hidden />
                </label>
                <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '1rem', fontWeight: 600 }}>Formal identity photo required.</p>
              </div>

              <div className="info-section">
                <div className="form-group">
                  <label>Full Name & Title</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Dr. Sarah Connor"
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Institutional Email</label>
                  <input 
                    type="email" 
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="sarah@college.edu"
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Faculty ID (Default Password)</label>
                  <input 
                    type="text" 
                    value={formData.college_id}
                    onChange={(e) => setFormData({ ...formData, college_id: e.target.value })}
                    placeholder="TCH-101"
                    required 
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
              <span>{loading ? 'Processing Staff Record...' : 'Initialize Faculty Member'}</span>
            </button>
          </form>

          {success && (
            <div className="success-overlay animate-fade-in">
              <div className="success-card">
                <CheckCircle size={48} className="icon-success" />
                <h3>Teacher Registered!</h3>
                <p>Faculty identity has been successfully created and verified.</p>
                <button className="submit-btn" onClick={() => setSuccess(false)} style={{ marginTop: '1rem', width: '200px' }}>
                  Add Another
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="teacher-list-panel card">
          <div className="card-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Current Faculty</h3>
              <Users size={18} color="#94a3b8" />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
            {fetchLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center' }}><Loader2 className="animate-spin" size={24} color="var(--primary)" /></div>
            ) : teachers.map((teacher) => (
              <div key={teacher.id} className="teacher-item-mini">
                <div className="mini-image">
                  <img 
                    src={teacher.image_url || `http://localhost:5000/public/teachers/${teacher.id}.jpg`} 
                    alt={teacher.name} 
                    onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=' + teacher.name; }}
                  />
                </div>
                <div className="mini-details">
                  <p className="name">{teacher.name}</p>
                  <p className="sub">{teacher.college_id} • {teacher.email}</p>
                </div>
                <button className="btn-delete-mini" onClick={() => handleDelete(teacher.id)}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterTeacher;
