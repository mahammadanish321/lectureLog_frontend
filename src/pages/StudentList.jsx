import React, { useState, useEffect } from 'react';
import api from '../api';
import { Users, Search, Trash2, Mail, Hash, BookOpen, Edit2, Check, X, Calendar, ArrowLeft, Filter, UserPlus, Upload, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './StudentList.css';

const StudentList = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterYear, setFilterYear] = useState('all');
  const [filterStream, setFilterStream] = useState('all');
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
    name: '', email: '', roll_number: '', college_id: '', year: '1', stream: 'CSE'
  });

  const [viewingAttendance, setViewingAttendance] = useState(null);
  const [studentAttendanceData, setStudentAttendanceData] = useState([]);
  const [studentSchedules, setStudentSchedules] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/students');
      setStudents(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load student directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setRegFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleEditClick = (student) => {
    setRegData({
      name: student.name,
      email: student.email,
      roll_number: student.roll_number,
      college_id: student.college_id,
      year: student.year?.toString() || '1',
      stream: student.stream || 'CSE'
    });
    setPreview(`http://localhost:5000/public/students/${student.id}.jpg`);
    setCurrentEditId(student.id);
    setIsEditMode(true);
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setIsEditMode(false);
    setCurrentEditId(null);
    setRegData({ name: '', email: '', roll_number: '', college_id: '', year: '1', stream: 'CSE' });
    setRegFile(null);
    setPreview(null);
    setRegSuccess(false);
  };

  const handleRegSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    const data = new FormData();
    Object.keys(regData).forEach(key => data.append(key, regData[key]));
    if (regFile) data.append('image', regFile);

    try {
      if (isEditMode) {
        await api.put(`/students/${currentEditId}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        if (!regFile) { alert('Please upload a student photo.'); setSubmitting(false); return; }
        await api.post('/students', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      
      setRegSuccess(true);
      setTimeout(() => {
        closeModal();
        fetchStudents();
      }, 1500);
    } catch (err) {
      alert('Operation Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const fetchStudentDetails = async (student) => {
    try {
      setLoading(true);
      const [attRes, schedRes, sessRes, slotRes] = await Promise.all([
        api.get(`/attendance/student/${student.id}`),
        api.get('/schedules'),
        api.get('/sessions'),
        api.get('/time_slots')
      ]);
      setStudentAttendanceData(attRes.data || []);
      setStudentSchedules(schedRes.data || []);
      setAllSessions(sessRes.data || []);
      setTimeSlots(slotRes.data || []);
      setViewingAttendance(student);
    } catch (err) {
      alert(`Failed to load attendance details.`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this student profile?')) return;
    try {
      await api.delete(`/students/${id}`);
      fetchStudents();
    } catch (err) {
      alert('Delete failed.');
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesYear = filterYear === 'all' || student.year?.toString() === filterYear;
    const matchesStream = filterStream === 'all' || student.stream === filterStream;
    const searchLower = searchQuery.toLowerCase();
    return matchesYear && matchesStream && (
      student.name.toLowerCase().includes(searchLower) || 
      (student.roll_number && student.roll_number.toLowerCase().includes(searchLower)) ||
      (student.college_id && student.college_id.toLowerCase().includes(searchLower))
    );
  });

  if (viewingAttendance) {
    return (
      <AttendanceWeeklyGrid 
        student={viewingAttendance} attendance={studentAttendanceData} schedules={studentSchedules} sessions={allSessions} timeSlots={timeSlots} onBack={() => setViewingAttendance(null)}
      />
    );
  }

  return (
    <div className="student-list-container">
      <div className="management-header-row">
        <div className="title-section">
          <h1>Student Management</h1>
        </div>
        <div className="management-context-pill">
          <span className="meta">Admin</span>
          <span className="title">Student Database</span>
        </div>
        <div className="header-actions">
          <button className="action-btn-primary" onClick={() => setShowAddModal(true)}>
            <UserPlus size={16} style={{ marginRight: '8px' }} />
            Add Student
          </button>
          <button className="action-btn-outline" onClick={fetchStudents}>
            Refresh List
          </button>
        </div>
      </div>

      <div className="student-table-card">
        <div className="table-controls">
          <div className="search-box">
            <Search size={18} color="#94a3b8" />
            <input type="text" placeholder="Search students..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="filter-box">
            <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}><option value="all">All Years</option><option value="1">Year 1</option><option value="2">Year 2</option><option value="3">Year 3</option><option value="4">Year 4</option></select>
            <select value={filterStream} onChange={(e) => setFilterStream(e.target.value)}><option value="all">All Streams</option><option value="CSE">CSE</option><option value="CSBS">CSBS</option><option value="ECE">ECE</option><option value="ME">ME</option></select>
          </div>
        </div>

        <div className="student-data-table-wrapper">
          <table className="student-data-table">
            <thead>
              <tr><th>Profile</th><th>Student Info</th><th>IDs</th><th>Academic Year</th><th>Attendance</th>{isAdmin && <th>Actions</th>}</tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="loading-cell">Loading roster...</td></tr>
              ) : filteredStudents.map((student) => (
                <tr key={student.id}>
                  <td>
                    <div className="student-avatar-large">
                      <img src={`http://localhost:5000/public/students/${student.id}.jpg`} alt={student.name} onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=' + student.name; }} />
                    </div>
                  </td>
                  <td>
                    <div className="info-cell"><span className="student-name">{student.name}</span><span className="student-email">{student.email}</span></div>
                  </td>
                  <td>
                    <div className="info-cell"><span className="student-id">Roll: {student.roll_number}</span><span className="student-id">Col: {student.college_id}</span></div>
                  </td>
                  <td>
                    <div className="info-cell"><span className="year-badge">Year {student.year}</span><span className="student-id" style={{ marginTop: '4px' }}>{student.stream}</span></div>
                  </td>
                  <td>
                    <button className="btn-edit" onClick={() => fetchStudentDetails(student)}><Calendar size={14} /> View</button>
                  </td>
                  {isAdmin && (
                    <td>
                      <div className="action-buttons">
                        <button className="btn-edit" onClick={() => handleEditClick(student)}><Edit2 size={14} /></button>
                        <button className="btn-delete" onClick={() => handleDelete(student.id)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CORRECTED 2-COLUMN MODAL */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-pop-in">
            <div className="modal-header">
              <div className="modal-header-copy">
                <h2>{isEditMode ? 'Update Student Profile' : 'New Student Enrollment'}</h2>
                <p>{isEditMode ? 'Modify existing identity metadata.' : 'Initialize a secure academic identity profile.'}</p>
              </div>
              <button type="button" className="modal-close-btn" onClick={closeModal} aria-label="Close student enrollment popup">
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
                  {/* LEFT COLUMN: IMAGE */}
                  <div className="image-upload-column">
                    <label className="image-upload-square">
                      {preview ? <img src={preview} alt="Preview" /> : <Upload size={24} />}
                      <input type="file" onChange={handleFileChange} hidden />
                    </label>
                    <span className="upload-label">Identity Photo</span>
                  </div>

                  {/* RIGHT COLUMN: FIELDS */}
                  <div className="fields-column">
                    <div className="form-group">
                      <label>Full Legal Name</label>
                      <input type="text" placeholder="e.g. Mahammad Anish" value={regData.name} onChange={e => setRegData({...regData, name: e.target.value})} required />
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label>Roll Number</label>
                        <input type="text" placeholder="30" value={regData.roll_number} onChange={e => setRegData({...regData, roll_number: e.target.value})} required />
                      </div>
                      <div className="form-group">
                        <label>College ID</label>
                        <input type="text" placeholder="gmit-30" value={regData.college_id} onChange={e => setRegData({...regData, college_id: e.target.value})} required />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Academic Year</label>
                        <select value={regData.year} onChange={e => setRegData({...regData, year: e.target.value})}>
                          <option value="1">Year 1</option><option value="2">Year 2</option><option value="3">Year 3</option><option value="4">Year 4</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Stream / Dept</label>
                        <select value={regData.stream} onChange={e => setRegData({...regData, stream: e.target.value})}>
                          <option value="CSE">CSE</option><option value="CSBS">CSBS</option><option value="ECE">ECE</option><option value="ME">ME</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Institutional Email</label>
                      <input type="email" placeholder="anish@college.edu" value={regData.email} onChange={e => setRegData({...regData, email: e.target.value})} required />
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

const AttendanceWeeklyGrid = ({ student, attendance, schedules, sessions, timeSlots, onBack }) => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const getCellStatus = (day, slot) => {
    const slotSession = sessions.find(s => {
      const sTime = new Date(s.start_time).toTimeString().substring(0, 5);
      return sTime.startsWith(slot.start_time?.substring(0, 4)) && new Date(s.start_time).getDay() === (days.indexOf(day) + 1);
    });
    if (!slotSession) return { color: 'transparent', subject: '' };
    const wasPresent = attendance.find(a => a.session_id === slotSession.id);
    return wasPresent ? { color: '#dcfce7', text: '#166534', subject: slotSession.subject_name } : { color: '#f1f5f9', text: '#64748b', subject: slotSession.subject_name };
  };

  return (
    <div className="attendance-detail-view animate-fade-in">
      <div className="management-header-row">
        <button className="btn-edit" onClick={onBack}><ArrowLeft size={16} /> Back</button>
        <div className="management-context-pill"><span className="meta">Identity Monitor</span><span className="title">{student.name}</span></div>
      </div>
      <div className="student-table-card" style={{ padding: '1.5rem' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '8px' }}>
          <thead><tr><th></th>{days.map(d => <th key={d} style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase' }}>{d}</th>)}</tr></thead>
          <tbody>
            {timeSlots.map((slot, i) => (
              <tr key={i}>
                <td style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8' }}>{slot.start_time}</td>
                {days.map(day => {
                  const status = getCellStatus(day, slot);
                  return <td key={day} style={{ height: '50px', background: status.color, borderRadius: '10px', fontSize: '0.6rem', textAlign: 'center', color: status.text, fontWeight: 700 }}>{status.subject}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentList;
