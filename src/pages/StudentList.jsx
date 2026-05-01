import React, { useState, useEffect } from 'react';
import api from '../api';
import { Users, Search, Trash2, Mail, Hash, BookOpen, Edit2, Check, X, Calendar, ArrowLeft, Clock } from 'lucide-react';
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
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
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
      console.error('Error fetching students:', err);
      setError('Failed to load students.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

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
      console.error('Error fetching student details:', err);
      const errorMsg = err.response?.data?.message || err.message;
      alert(`Failed to load attendance data: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this student? All their attendance records will also be permanently deleted.')) return;
    try {
      await api.delete(`/students/${id}`);
      fetchStudents();
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleEditClick = (student) => {
    setEditingId(student.id);
    setEditFormData({
      name: student.name,
      email: student.email,
      roll_number: student.roll_number,
      college_id: student.college_id,
      year: student.year,
      stream: student.stream || 'CSE'
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData({});
  };

  const handleSaveEdit = async (id) => {
    try {
      await api.put(`/students/${id}`, editFormData);
      setEditingId(null);
      fetchStudents();
    } catch (err) {
      alert('Update failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesYear = filterYear === 'all' || student.year?.toString() === filterYear;
    const matchesStream = filterStream === 'all' || student.stream === filterStream;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      student.name.toLowerCase().includes(searchLower) || 
      student.roll_number.toLowerCase().includes(searchLower) ||
      student.college_id.toLowerCase().includes(searchLower) ||
      student.email.toLowerCase().includes(searchLower);
    
    return matchesYear && matchesStream && matchesSearch;
  });

  if (viewingAttendance) {
    return (
      <AttendanceWeeklyGrid 
        student={viewingAttendance}
        attendance={studentAttendanceData}
        schedules={studentSchedules}
        sessions={allSessions}
        timeSlots={timeSlots}
        onBack={() => setViewingAttendance(null)}
      />
    );
  }

  return (
    <div className="student-list-container animate-fade-in">
      <div className="header-actions">
        <div>
          <h1 className="page-title">Students Directory</h1>
          <p className="page-subtitle">View and manage all registered student details.</p>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="table-controls card">
        <div className="search-box">
          <Search size={18} className="text-muted" />
          <input 
            type="text" 
            placeholder="Search by name, roll no, college ID, or email..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="filter-box">
          <span className="text-muted">Filter:</span>
          <select 
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
          >
            <option value="all">All Years</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>
          <select 
            value={filterStream}
            onChange={(e) => setFilterStream(e.target.value)}
          >
            <option value="all">All Streams</option>
            <option value="CSE">CSE</option>
            <option value="CSBS">CSBS</option>
            <option value="ECE">ECE</option>
            <option value="ME">ME</option>
            <option value="CE">CE</option>
            <option value="EE">EE</option>
          </select>
        </div>
      </div>

      <div className="student-table-card card">
        <div className="table-responsive">
          <table className="student-data-table">
            <thead>
              <tr>
                <th>Profile</th>
                <th>Student Info</th>
                <th>IDs</th>
                <th>Academic Year</th>
                <th>Attendance</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="loading-cell">Loading student data...</td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty-cell">No students found matching your criteria.</td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <div className="student-avatar-large">
                        <img 
                          src={`http://localhost:5000/public/students/${student.id}.jpg`} 
                          alt={student.name} 
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://ui-avatars.com/api/?name=' + student.name;
                          }}
                        />
                      </div>
                    </td>
                    <td>
                      <div className="info-cell">
                        {editingId === student.id ? (
                          <>
                            <input 
                              type="text" 
                              className="edit-input" 
                              value={editFormData.name} 
                              onChange={(e) => setEditFormData({...editFormData, name: e.target.value})} 
                            />
                            <input 
                              type="email" 
                              className="edit-input" 
                              value={editFormData.email} 
                              onChange={(e) => setEditFormData({...editFormData, email: e.target.value})} 
                            />
                          </>
                        ) : (
                          <>
                            <span className="student-name">{student.name}</span>
                            <span className="student-email">
                              <Mail size={12} /> {student.email}
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="info-cell">
                        {editingId === student.id ? (
                          <>
                            <input 
                              type="text" 
                              className="edit-input" 
                              value={editFormData.roll_number} 
                              onChange={(e) => setEditFormData({...editFormData, roll_number: e.target.value})} 
                            />
                            <input 
                              type="text" 
                              className="edit-input" 
                              value={editFormData.college_id} 
                              onChange={(e) => setEditFormData({...editFormData, college_id: e.target.value})} 
                            />
                          </>
                        ) : (
                          <>
                            <span className="student-id">
                              <Hash size={12} /> Roll: {student.roll_number}
                            </span>
                            <span className="student-id">
                              <BookOpen size={12} /> Col: {student.college_id}
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                    <td>
                      {editingId === student.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <select 
                            className="edit-select"
                            value={editFormData.year}
                            onChange={(e) => setEditFormData({...editFormData, year: e.target.value})}
                          >
                            <option value="1">Year 1</option>
                            <option value="2">Year 2</option>
                            <option value="3">Year 3</option>
                            <option value="4">Year 4</option>
                          </select>
                          <select 
                            className="edit-select"
                            value={editFormData.stream}
                            onChange={(e) => setEditFormData({...editFormData, stream: e.target.value})}
                          >
                            <option value="CSE">CSE</option>
                            <option value="CSBS">CSBS</option>
                            <option value="ECE">ECE</option>
                            <option value="ME">ME</option>
                            <option value="CE">CE</option>
                            <option value="EE">EE</option>
                          </select>
                        </div>
                      ) : (
                        <div className="info-cell">
                          <span className={`year-badge year-${student.year}`}>
                            Year {student.year}
                          </span>
                          {student.stream && (
                            <span className="student-id" style={{ marginTop: '4px', display: 'inline-block' }}>
                              <BookOpen size={12} /> {student.stream}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      <button 
                        className="btn-outline" 
                        onClick={() => fetchStudentDetails(student)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                      >
                        <Calendar size={14} />
                        Attendance
                      </button>
                    </td>
                    {isAdmin && (
                      <td>
                        {editingId === student.id ? (
                          <div className="action-buttons">
                            <button 
                              className="btn-save-edit"
                              onClick={() => handleSaveEdit(student.id)}
                              title="Save"
                            >
                              <Check size={16} />
                            </button>
                            <button 
                              className="btn-cancel-edit"
                              onClick={handleCancelEdit}
                              title="Cancel"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="action-buttons">
                            <button 
                              className="btn-edit"
                              onClick={() => handleEditClick(student)}
                              title="Edit Student"
                            >
                              <Edit2 size={16} /> Edit
                            </button>
                            <button 
                              className="btn-delete"
                              onClick={() => handleDelete(student.id)}
                              title="Delete Student"
                            >
                              <Trash2 size={16} /> Delete
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const AttendanceWeeklyGrid = ({ student, attendance, schedules, sessions, timeSlots, onBack }) => {
  const [selectedYear, setSelectedYear] = useState(student.year?.toString() || '1');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedWeek, setSelectedWeek] = useState(1);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const getCellStatus = (day, slot) => {
    // 1. Find the date for this Day/Week/Month (current year)
    const year = new Date().getFullYear();
    const firstDayOfMonth = new Date(year, selectedMonth, 1);
    const offset = (selectedWeek - 1) * 7;
    
    // Find first 'Monday' of that week-ish
    const targetDate = new Date(year, selectedMonth, 1 + offset);
    const dayIndex = days.indexOf(day);
    const currentDayOfWeek = targetDate.getDay(); // 0 is Sunday
    const diff = (dayIndex + 1) - (currentDayOfWeek === 0 ? 7 : currentDayOfWeek);
    targetDate.setDate(targetDate.getDate() + diff);

    const dateStr = targetDate.toDateString();
    
    // Filter sessions for this specific date and year stage
    const daySessions = sessions.filter(s => {
      if (!s.start_time) return false;
      const sDate = new Date(s.start_time);
      return sDate.toDateString() === dateStr && String(s.year) === String(selectedYear);
    });

    // Check if any session matches this time slot
    const slotSession = daySessions.find(s => {
      const sTime = new Date(s.start_time).toTimeString().substring(0, 5);
      return sTime.startsWith(slot.raw_start.substring(0, 4));
    });

    if (!slotSession) {
      // Check if there's a regular schedule for this day/slot
      const hasSchedule = schedules.find(s => 
        s.day_of_week === day && 
        s.start_time.startsWith(slot.raw_start.substring(0, 4)) &&
        String(s.year) === String(selectedYear)
      );
      return hasSchedule ? { color: '#f1f5f9', label: 'No Class Session', subject: hasSchedule.subject_name } : { color: 'transparent', label: '', subject: '' };
    }

    const subject = slotSession.subject_name || 'N/A';
    if (slotSession.status === 'cancelled') return { color: '#ef4444', label: 'Cancelled', subject };

    const wasPresent = attendance.find(a => a.session_id === slotSession.id);
    return wasPresent ? { color: '#22c55e', label: 'Present', subject } : { color: '#cbd5e1', label: 'Absent', subject };
  };

  return (
    <div className="attendance-detail-view animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <button className="btn-back" onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', fontWeight: 600 }}>
          <ArrowLeft size={18} /> Back to Directory
        </button>
        
        <div className="grid-filters" style={{ display: 'flex', gap: '1rem' }}>
          <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="filter-select">
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>
          <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="filter-select">
            {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={selectedWeek} onChange={e => setSelectedWeek(parseInt(e.target.value))} className="filter-select">
            <option value="1">1st Week</option>
            <option value="2">2nd Week</option>
            <option value="3">3rd Week</option>
            <option value="4">4th Week</option>
          </select>
        </div>
      </div>

      <div className="student-profile-header card" style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '1.5rem', marginBottom: '2rem' }}>
        <img 
          src={`http://localhost:5000/public/students/${student.id}.jpg`} 
          alt={student.name} 
          style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px solid var(--primary)' }}
          onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=' + student.name; }}
        />
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1c1917', margin: 0 }}>{student.name}</h2>
          <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--muted-foreground)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            <span>Roll: {student.roll_number}</span>
            <span>{student.stream} - Year {student.year}</span>
          </div>
        </div>
      </div>

      <div className="weekly-grid-container card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        <table className="weekly-attendance-table" style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: '8px' }}>
          <thead>
            <tr>
              <th style={{ width: '100px' }}></th>
              {days.map(d => <th key={d} style={{ padding: '10px', fontSize: '0.85rem', color: 'var(--muted-foreground)', textAlign: 'center' }}>{d}</th>)}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((slot, idx) => (
              <tr key={idx}>
                <td style={{ padding: '10px', fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>
                  {slot.start_time || slot.start}
                </td>
                {days.map(day => {
                  const status = getCellStatus(day, slot);
                  return (
                    <td key={day} style={{ height: '60px', padding: 0 }}>
                      <div 
                        title={`${status.label}: ${status.subject}`}
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          background: status.color, 
                          borderRadius: '8px',
                          border: status.color === 'transparent' ? 'none' : '1px solid rgba(0,0,0,0.05)',
                          transition: 'all 0.2s',
                          cursor: status.color === 'transparent' ? 'default' : 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '4px',
                          textAlign: 'center',
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          color: status.color === '#22c55e' || status.color === '#ef4444' ? 'white' : '#64748b',
                          boxShadow: status.color !== 'transparent' ? '0 2px 4px rgba(0,0,0,0.02)' : 'none'
                        }}
                        onMouseEnter={(e) => { if(status.color !== 'transparent') e.target.style.transform = 'translateY(-2px)'; }}
                        onMouseLeave={(e) => { e.target.style.transform = 'translateY(0)'; }}
                      >
                        {status.subject && (
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {status.subject}
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="heatmap-legend" style={{ display: 'flex', gap: '1.5rem', marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--muted-foreground)', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', background: '#22c55e', borderRadius: '2px' }} /> Present</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', background: '#ef4444', borderRadius: '2px' }} /> Cancelled</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', background: '#cbd5e1', borderRadius: '2px' }} /> Absent</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', background: '#f1f5f9', borderRadius: '2px' }} /> No Session Started</div>
        </div>
      </div>
    </div>
  );
};

export default StudentList;
