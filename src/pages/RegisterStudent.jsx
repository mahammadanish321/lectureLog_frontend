import React, { useState, useEffect } from 'react';
import api from '../api';
import { UserPlus, Upload, Loader2, CheckCircle, Search, Filter, Users, User, Trash2 } from 'lucide-react';
import './RegisterStudent.css';

const RegisterStudent = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    roll_number: '',
    college_id: '',
    year: '1'
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Student list state
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
    if (!window.confirm('Are you sure you want to delete this student? All attendance records and photos will be removed.')) return;
    try {
      await api.delete(`/students/${id}`);
      fetchStudents();
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
    if (!file) return alert('Please upload a student photo');

    setLoading(true);
    const data = new FormData();
    data.append('name', formData.name);
    data.append('email', formData.email);
    data.append('roll_number', formData.roll_number);
    data.append('college_id', formData.college_id);
    data.append('year', formData.year);
    data.append('image', file);

    try {
      await api.post('/students', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccess(true);
      setFormData({ name: '', email: '', roll_number: '', college_id: '', year: '1' });
      setFile(null);
      setPreview(null);
      fetchStudents(); 
      setTimeout(() => setSuccess(false), 3000);
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
    <div className="register-container animate-fade-in">
      <div className="register-grid">
        {/* Registration Form */}
        <div className="register-content">
          <div className="card-header" style={{ marginBottom: '2rem' }}>
            <h3>Student Registration</h3>
            <p>Register a new student with identity verification.</p>
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
                    placeholder="e.g. John Doe"
                    required 
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Academic Year</label>
                    <select 
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    >
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>College ID</label>
                    <input 
                      type="text" 
                      value={formData.college_id}
                      onChange={(e) => setFormData({ ...formData, college_id: e.target.value })}
                      placeholder="COL-1234"
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
                    placeholder="john@college.edu"
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Roll Number</label>
                  <input 
                    type="text" 
                    value={formData.roll_number}
                    onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                    placeholder="2024-CS-01"
                    required 
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary submit-btn" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : <UserPlus size={18} />}
              <span>{loading ? 'Processing...' : 'Register Student'}</span>
            </button>
          </form>

          {success && (
            <div className="success-overlay animate-fade-in">
              <div className="success-card">
                <CheckCircle size={48} className="icon-success" />
                <h3>Student Registered!</h3>
                <p className="text-muted">Facial identity has been successfully processed.</p>
                <button className="btn btn-secondary" onClick={() => setSuccess(false)} style={{ marginTop: '1rem' }}>
                  Add Another
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Student List Sidebar */}
        <div className="student-list-panel card">
          <div className="card-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Registered Students</h3>
              <Users size={18} className="text-muted" />
            </div>
            <div className="list-filters" style={{ marginTop: '1rem' }}>
              <select 
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                style={{ height: '2rem', fontSize: '0.875rem' }}
              >
                <option value="all">All Years</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>
          </div>

          <div className="student-scroll-list">
            {fetchLoading ? (
              <div className="loader-container">
                <Loader2 className="animate-spin" size={24} />
              </div>
            ) : filteredStudents.length > 0 ? (
              filteredStudents.map((student) => (
                <div key={student.id} className="student-item-mini">
                  <div className="mini-image">
                    <img 
                      src={`http://localhost:5000/public/students/${student.id}.jpg`} 
                      alt={student.name} 
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://ui-avatars.com/api/?name=' + student.name;
                      }}
                    />
                  </div>
                  <div className="mini-details">
                    <p className="name">{student.name}</p>
                    <p className="sub">{student.roll_number} • Year {student.year}</p>
                  </div>
                  <button 
                    className="btn-delete-mini"
                    onClick={() => handleDelete(student.id)}
                    title="Delete Student"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p className="text-muted">No students registered yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterStudent;
