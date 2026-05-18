import React, { useState, useEffect } from 'react';
import api from '../api';
import { UserPlus, Upload, Loader2, CheckCircle, Users, Trash2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './RegisterStudent.css';

const RegisterStudent = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    roll_number: '',
    college_id: '',
    year: '1',
    stream: 'CSE'
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [students, setStudents] = useState([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [filterYear, setFilterYear] = useState('all');

  const fetchStudents = async () => {
    try {
      const response = await api.get('/students');
      setStudents(response.data);
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this student?')) return;
    try {
      await api.delete(`/students/${id}`);
      fetchStudents();
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
    if (!file) return alert('Please upload a student photo');

    // Secure Electron detection via preload bridge
    const isElectron = !!(window.electronAPI?.isElectron);
    const AI_SERVICE_URL = 'http://127.0.0.1:8001';

    setLoading(true);

    try {
      let embedding = null;

      // 1. Always try local AI first when in Electron
      if (isElectron) {
        try {
          const aiFormData = new FormData();
          aiFormData.append('file', file);

          const aiResponse = await fetch(`${AI_SERVICE_URL}/embed`, {
            method: 'POST',
            body: aiFormData,
          });

          if (!aiResponse.ok) throw new Error(`AI responded with status ${aiResponse.status}`);

          const aiData = await aiResponse.json();
          embedding = aiData.embedding;

          if (!embedding || !Array.isArray(embedding)) {
            throw new Error('AI returned an invalid embedding.');
          }

          console.log('[Electron] Local embedding generated successfully.');
        } catch (aiErr) {
          console.error('[Electron] Local AI Error:', aiErr);
          alert(
            '⚠️ The AI face recognition service is still warming up.\n\n' +
            'Please wait 30 seconds for it to fully start, then try again.\n\n' +
            'If this keeps happening, restart the application.'
          );
          setLoading(false);
          return;
        }
      }

      // 2. Send data to backend (with local embedding if available)
      const data = new FormData();
      Object.keys(formData).forEach(key => data.append(key, formData[key]));
      data.append('image', file);
      if (embedding) {
        data.append('face_embedding', JSON.stringify(embedding));
      }

      await api.post('/students', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccess(true);
      setFormData({ name: '', email: '', roll_number: '', college_id: '', year: '1', stream: 'CSE' });
      setFile(null);
      setPreview(null);
      fetchStudents();
    } catch (err) {
      alert('Registration failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = filterYear === 'all'
    ? students
    : students.filter(s => s.year?.toString() === filterYear);

  return (
    <div className="register-container">
      <div className="management-header-row">
        <div className="title-section">
          <h1>Identity Registration</h1>
        </div>

        <div className="management-context-pill">
          <span className="meta">Admin</span>
          <span className="title">Identity Console</span>
        </div>

        <div className="header-actions">
          <button className="action-btn-outline" onClick={() => navigate('/students')}>
            <ArrowLeft size={16} style={{ marginRight: '8px' }} />
            Back to Directory
          </button>
        </div>
      </div>

      <div className="register-grid">
        <div className="register-content animate-fade-in">
          <h3>Student Registration</h3>
          <p>Initialize a new student identity for AI monitoring and tracking.</p>

          <form onSubmit={handleSubmit} className="register-form">
            <div className="form-sections">
              <div className="photo-section">
                <label className="photo-upload-label">
                  {preview ? (
                    <img src={preview} alt="Preview" className="photo-preview" />
                  ) : (
                    <div className="photo-placeholder">
                      <Upload size={32} />
                      <span>Upload Face ID</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleFileChange} hidden />
                </label>
                <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '1rem', fontWeight: 600 }}>Face must be clearly visible and centered.</p>
              </div>

              <div className="info-section">
                <div className="form-group">
                  <label>Full Legal Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. mahammad anish"
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Academic Year</label>
                    <select value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })}>
                      <option value="1">1st Year</option><option value="2">2nd Year</option><option value="3">3rd Year</option><option value="4">4th Year</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Stream</label>
                    <select value={formData.stream} onChange={(e) => setFormData({ ...formData, stream: e.target.value })}>
                      <option value="CSE">CSE</option><option value="CSBS">CSBS</option><option value="ECE">ECE</option><option value="ME">ME</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>College ID</label>
                    <input
                      type="text"
                      value={formData.college_id}
                      onChange={(e) => setFormData({ ...formData, college_id: e.target.value })}
                      placeholder="gmit-30"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Roll Number</label>
                    <input
                      type="text"
                      value={formData.roll_number}
                      onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                      placeholder="30"
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Institutional Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="anish@college.edu"
                    required
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
              <span>{loading ? 'Processing Identity...' : 'Initialize Identity'}</span>
            </button>
          </form>

          {success && (
            <div className="success-overlay animate-fade-in">
              <div className="success-card">
                <CheckCircle size={48} className="icon-success" />
                <h3>Student Registered!</h3>
                <p>Facial identity has been successfully processed and verified.</p>
                <button className="submit-btn" onClick={() => setSuccess(false)} style={{ marginTop: '1rem', width: '200px' }}>
                  Register Another
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="student-list-panel card">
          <div className="card-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Identity Roster</h3>
              <Users size={18} color="#94a3b8" />
            </div>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="form-group select"
              style={{ marginTop: '1rem', padding: '0.4rem', fontSize: '0.75rem' }}
            >
              <option value="all">All Academic Years</option>
              <option value="1">Year 1</option><option value="2">Year 2</option><option value="3">Year 3</option><option value="4">Year 4</option>
            </select>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.5rem 1.5rem' }}>
            {fetchLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Loader2 className="animate-spin" size={24} color="var(--primary)" /></div>
            ) : filteredStudents.map((student) => (
              <div key={student.id} className="student-item-mini">
                <div className="mini-image">
                  <img
                    src={student.image_url || `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/public/students/${student.student_id || student.id}.jpg`}
                    alt={student.name}
                    onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=' + student.name; }}
                  />
                </div>
                <div className="mini-details">
                  <p className="name">{student.name}</p>
                  <p className="sub">#{student.roll_number} • {student.stream} • Year {student.year}</p>
                </div>
                <button className="btn-delete-mini" onClick={() => handleDelete(student.id)}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterStudent;
