import React, { useState, useEffect } from 'react';
import api from '../api';
import { UserPlus, Upload, Loader2, CheckCircle, Trash2, Users } from 'lucide-react';
import './RegisterTeacher.css';

const RegisterTeacher = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    college_id: ''
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Teacher list state
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
    if (!window.confirm('Are you sure you want to delete this teacher? This may affect scheduled routines.')) return;
    try {
      await api.delete(`/teachers/${id}`);
      fetchTeachers();
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.message || err.message));
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
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      alert('Registration failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container animate-fade-in">
      <div className="register-grid">
        {/* Registration Form */}
        <div className="register-content">
          <div className="card-header" style={{ marginBottom: '2rem' }}>
            <h3>Teacher Registration</h3>
            <p>Add a new teacher to assign them to class routines.</p>
          </div>
          
          <form onSubmit={handleSubmit} className="register-form">
            <div className="form-sections">
              <div className="photo-section">
                <label className="photo-upload-label">
                  {preview ? (
                    <img src={preview} alt="Preview" className="photo-preview" />
                  ) : (
                    <div className="photo-placeholder">
                      <Upload size={32} />
                      <span>Upload Photo</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleFileChange} hidden />
                </label>
                <p className="helper-text">Face must be clearly visible.</p>
              </div>

              <div className="info-section">
                <div className="form-group">
                  <label>Full Name</label>
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
                  <label>College ID (Used as default password)</label>
                  <input 
                    type="text" 
                    value={formData.college_id}
                    onChange={(e) => setFormData({ ...formData, college_id: e.target.value })}
                    placeholder="TCH-1234"
                    required 
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary submit-btn" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : <UserPlus size={18} />}
              <span>{loading ? 'Processing...' : 'Register Teacher'}</span>
            </button>
          </form>

          {success && (
            <div className="success-overlay animate-fade-in">
              <div className="success-card">
                <CheckCircle size={48} className="icon-success" />
                <h3>Teacher Registered!</h3>
                <p className="text-muted">The teacher can now be assigned to routines.</p>
                <button className="btn btn-secondary" onClick={() => setSuccess(false)} style={{ marginTop: '1rem' }}>
                  Add Another
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Teacher List Sidebar */}
        <div className="teacher-list-panel card">
          <div className="card-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Registered Teachers</h3>
              <Users size={18} className="text-muted" />
            </div>
          </div>

          <div className="teacher-scroll-list">
            {fetchLoading ? (
              <div className="loader-container">
                <Loader2 className="animate-spin" size={24} />
              </div>
            ) : teachers.length > 0 ? (
              teachers.map((teacher) => (
                <div key={teacher.id} className="teacher-item-mini">
                  <div className="mini-image">
                    <img 
                      src={`http://localhost:5000/public/teachers/${teacher.id}.jpg`} 
                      alt={teacher.name} 
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://ui-avatars.com/api/?name=' + teacher.name;
                      }}
                    />
                  </div>
                  <div className="mini-details">
                    <p className="name">{teacher.name}</p>
                    <p className="sub">{teacher.college_id} • {teacher.email}</p>
                  </div>
                  <button 
                    className="btn-delete-mini"
                    onClick={() => handleDelete(teacher.id)}
                    title="Delete Teacher"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p className="text-muted">No teachers registered yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterTeacher;
