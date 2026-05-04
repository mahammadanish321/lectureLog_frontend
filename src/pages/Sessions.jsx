import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import {
  Plus,
  Play,
  Square,
  Video,
  Loader2,
  X
} from 'lucide-react';
import './Sessions.css';

const Sessions = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [teacherSchedules, setTeacherSchedules] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);

  const fetchAttendanceForSession = async (sessionId) => {
    try {
      const response = await api.get(`/attendance/session/${sessionId}`);
      setAttendanceRecords(response.data);
      setShowAttendanceModal(true);
    } catch (err) {
      console.error('Failed to fetch attendance records:', err);
    }
  };

  const getTodayDateString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const getTodayDayString = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };

  const [formData, setFormData] = useState({
    subject_id: '',
    classroom_id: '',
    year: '1',
    stream: 'CSE',
    date: getTodayDateString(),
    day: getTodayDayString(),
    timeSlot: '10:15 AM - 11:05 AM'
  });

  const fetchInitialData = async () => {
    try {
      const [subjectsRes, classroomsRes] = await Promise.all([
        api.get('/subjects'),
        api.get('/classrooms')
      ]);
      setSubjects(subjectsRes.data);
      setClassrooms(classroomsRes.data);
      
      // Don't auto-set classroom_id to avoid accidental conflicts in the first room
      if (subjectsRes.data.length > 0) {
        setFormData(prev => ({ ...prev, subject_id: subjectsRes.data[0].id }));
      }
    } catch (err) {
      console.error('Error fetching dropdown data:', err);
    }
  };

  // Smart Room/Year/Stream selector based on schedule
  useEffect(() => {
    if (formData.subject_id && teacherSchedules.length > 0) {
      const matchedSchedule = teacherSchedules.find(s => String(s.subject_id) === String(formData.subject_id));
      if (matchedSchedule) {
        setFormData(prev => ({
          ...prev,
          classroom_id: matchedSchedule.classroom_id,
          year: matchedSchedule.year || prev.year,
          stream: matchedSchedule.stream || prev.stream,
          timeSlot: `${matchedSchedule.start_time.substring(0,5)} - ${matchedSchedule.end_time.substring(0,5)}`
        }));
      }
    }
  }, [formData.subject_id, teacherSchedules]);

  const fetchSessions = async () => {
    try {
      const response = await api.get('/sessions');
      const role = user?.role?.toLowerCase() || (localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user'))?.role?.toLowerCase() : null);
      const userId = user?.id || (localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user'))?.id : null);
      
      if (role === 'teacher') {
        const filtered = response.data.filter(s => s.teacher_id === userId);
        setSessions(filtered);
        
        const scheduleRes = await api.get('/schedules/my');
        const today = getTodayDayString();
        const todaySchedules = scheduleRes.data.filter(s => s.day_of_week === today);
        setTeacherSchedules(todaySchedules);
      } else {
        setSessions(response.data);
      }
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchInitialData();
  }, [user]);

  const handleStartSession = async (e) => {
    e.preventDefault();
    try {
      const [startStr, endStr] = formData.timeSlot.split(' - ');

      const parseTime = (dateStr, timeStr) => {
        const [time, modifier] = timeStr.split(' ');
        let [hours, minutes] = time.split(':');
        hours = parseInt(hours, 10);
        if (modifier === 'PM' && hours !== 12) {
          hours += 12;
        }
        if (modifier === 'AM' && hours === 12) {
          hours = 0;
        }
        const dateObj = new Date(dateStr);
        dateObj.setHours(hours, parseInt(minutes, 10), 0, 0);
        return dateObj;
      };

      const startTime = parseTime(formData.date, startStr);
      const endTime = parseTime(formData.date, endStr);

      await api.post('/sessions/start', {
        subject_id: parseInt(formData.subject_id),
        classroom_id: parseInt(formData.classroom_id),
        duration: 50, // Standard 50 min duration
        year: formData.year,
        stream: formData.stream,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString()
      });

      setShowModal(false);
      fetchSessions();
    } catch (err) {
      alert('Failed to start custom session: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleEndSession = async (id) => {
    try {
      await api.post('/sessions/end', { id });
      fetchSessions();
    } catch (err) {
      alert('Failed to end session');
    }
  };

  const handleCancelSession = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this custom session?')) return;
    try {
      await api.post('/sessions/cancel', { id });
      fetchSessions();
    } catch (err) {
      alert('Failed to cancel custom session');
    }
  };

  const handleCancelRoutine = async (id) => {
    const collegeId = window.prompt('Please enter your College ID to cancel this scheduled class:');
    if (collegeId === null) return;
    if (!collegeId.trim()) {
      alert('College ID is required to cancel the class.');
      return;
    }

    try {
      await api.post(`/schedules/${id}/cancel`, { college_id: collegeId.trim() });
      alert('Class cancelled successfully.');
      
      // Refresh teacher routines
      const scheduleRes = await api.get('/schedules/my');
      setTeacherSchedules(scheduleRes.data);
    } catch (err) {
      alert('Failed to cancel class: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="sessions-container animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Sessions Dashboard</h2>
        <button 
          className="btn" 
          style={{ 
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', 
            color: '#fff', 
            border: 'none', 
            padding: '0.6rem 1.25rem', 
            borderRadius: '8px', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
          }}
          onClick={() => setShowModal(true)}
        >
          <Plus size={18} />
          <span>New Session</span>
        </button>
      </div>

      <div className="sessions-table animate-fade-in">
        {loading ? (
          <div className="loader-container" style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <Loader2 className="animate-spin" size={40} color="var(--primary)" />
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Type</th>
                <th>Year</th>
                <th>Stream</th>
                <th>Room / Cam</th>
                <th>Time Range</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const combined = [
                  ...teacherSchedules.filter(s => {
                    const hasActiveSession = sessions.some(dbSess => 
                      dbSess.status === 'active' && 
                      dbSess.subject_id === s.subject_id && 
                      !dbSess.is_custom
                    );
                    return !hasActiveSession;
                  }).map(s => {
                    const now = new Date();
                    const currentHours = now.getHours();
                    const currentMinutes = now.getMinutes();
                    const currentTimeInMinutes = currentHours * 60 + currentMinutes;

                    const [startH, startM] = s.start_time.split(':');
                    const [endH, endM] = s.end_time.split(':');
                    const classStartTimeInMinutes = parseInt(startH) * 60 + parseInt(startM);
                    const classEndTimeInMinutes = parseInt(endH) * 60 + parseInt(endM);
                    
                    const isClassDone = currentTimeInMinutes > classEndTimeInMinutes;
                    const isClassOngoing = currentTimeInMinutes >= classStartTimeInMinutes && currentTimeInMinutes <= classEndTimeInMinutes;

                    let status = 'scheduled';
                    if (s.is_cancelled) {
                      status = 'cancelled';
                    } else if (isClassDone) {
                      status = 'ended';
                    } else if (isClassOngoing) {
                      status = 'scheduled'; 
                    }

                    return {
                      id: `sched_${s.id}`,
                      originalId: s.id,
                      subject_name: s.subject_name,
                      type: 'Regular',
                      stream: s.stream || 'N/A',
                      classroom_name: `${s.classroom_name} (Cam: ${s.camera_id})`,
                      time_range: `${s.start_time.substring(0,5)} - ${s.end_time.substring(0,5)}`,
                      status: status,
                      isClassDone,
                      is_cancelled: s.is_cancelled,
                      date: new Date().toLocaleDateString('en-GB'),
                      raw: s
                    };
                  }),
                  ...sessions.map(s => ({
                    id: `custom_${s.id}`,
                    originalId: s.id,
                    subject_name: s.subject_name,
                    type: s.is_custom ? 'Custom' : 'Regular',
                    stream: s.stream || 'N/A',
                    classroom_name: `${s.camera_url || 'Default Lab'}`,
                    time_range: `${new Date(s.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${new Date(s.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`,
                    status: s.status,
                    isClassDone: s.status === 'ended',
                    is_cancelled: false,
                    date: new Date(s.start_time).toLocaleDateString('en-GB'),
                    timestamp: new Date(s.start_time).getTime(),
                    raw: s
                  }))
                ];

                if (combined.length === 0) {
                  return (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted-foreground)' }}>
                        No ongoing or scheduled sessions found.
                      </td>
                    </tr>
                  );
                }

                // Group by Date
                const groups = combined.reduce((acc, item) => {
                  if (!acc[item.date]) acc[item.date] = [];
                  acc[item.date].push(item);
                  return acc;
                }, {});

                // Sort dates: Today first, then descending past dates
                const sortedDates = Object.keys(groups).sort((a, b) => {
                  const today = new Date().toLocaleDateString('en-GB');
                  if (a === today) return -1;
                  if (b === today) return 1;
                  
                  const dateA = new Date(a.split('/').reverse().join('-'));
                  const dateB = new Date(b.split('/').reverse().join('-'));
                  return dateB - dateA;
                });

                return sortedDates.map(date => (
                  <React.Fragment key={date}>
                    <tr className="date-header-row">
                      <td colSpan="8" style={{ background: 'rgba(28, 25, 23, 0.04)', padding: '0.75rem 1.5rem', fontWeight: 700, fontSize: '0.8rem', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {date === new Date().toLocaleDateString('en-GB') ? 'Today' : date}
                      </td>
                    </tr>
                    {groups[date]
                      .sort((a, b) => {
                        // 1. Active first
                        if (a.status === 'active' && b.status !== 'active') return -1;
                        if (a.status !== 'active' && b.status === 'active') return 1;
                        
                        // 2. Cancelled always last
                        if (a.status === 'cancelled' && b.status !== 'cancelled') return 1;
                        if (a.status !== 'cancelled' && b.status === 'cancelled') return -1;

                        // 3. Then sort by time range start
                        return (a.time_range || '').localeCompare(b.time_range || '');
                      })
                      .map((item) => (
                      <tr 
                        key={item.id}
                        style={{
                          backgroundColor: item.is_cancelled 
                            ? 'rgba(239, 68, 68, 0.05)' 
                            : item.isClassDone 
                              ? 'rgba(34, 197, 94, 0.02)' 
                              : 'inherit',
                          opacity: item.isClassDone ? 0.8 : 1
                        }}
                      >
                        <td style={{ fontWeight: 600, color: item.is_cancelled ? '#ef4444' : 'inherit' }}>
                          {item.subject_name}
                        </td>
                        <td>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            padding: '0.2rem 0.5rem', 
                            borderRadius: '4px', 
                            background: item.type === 'Regular' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(234, 179, 8, 0.15)', 
                            color: item.type === 'Regular' ? 'var(--primary)' : '#eab308',
                            fontWeight: 600
                          }}>
                            {item.type}
                          </span>
                        </td>
                        <td style={{ color: 'var(--muted-foreground)', fontWeight: 500 }}>
                          {item.raw.year ? `Year ${item.raw.year}` : 'N/A'}
                        </td>
                        <td style={{ color: 'var(--muted-foreground)' }}>{item.stream}</td>
                        <td>{item.classroom_name}</td>
                        <td>{item.time_range}</td>
                        <td>
                          <span className={`status-badge ${item.status}`}>
                            {item.status.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <div className="action-btns" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            {item.type === 'Regular' && !item.is_cancelled && !item.isClassDone && date === new Date().toLocaleDateString('en-GB') ? (
                              <button 
                                onClick={() => handleCancelRoutine(item.originalId)}
                                className="btn"
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', color: '#fff', background: 'rgba(239, 68, 68, 0.85)', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                              >
                                Cancel Class
                              </button>
                            ) : null}

                            {(user?.role?.toLowerCase() === 'admin' || (item.type === 'Custom' && (item.status === 'active' || item.status === 'scheduled'))) ? (
                              <button 
                                onClick={() => handleCancelSession(item.originalId)}
                                className="btn"
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', color: '#fff', background: 'rgba(239, 68, 68, 0.85)', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                              >
                                {user?.role?.toLowerCase() === 'admin' ? 'Delete Session' : 'Cancel Session'}
                              </button>
                            ) : null}
                            
                            {(item.isClassDone || item.status === 'ended') && (
                              <button 
                                className="btn" 
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', color: '#fff', background: 'rgba(99, 102, 241, 0.85)', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                onClick={() => {
                                  if (item.type === 'Custom') {
                                    fetchAttendanceForSession(item.originalId);
                                  } else {
                                    // Modified search to account for date
                                    const matched = sessions.find(s => 
                                      s.subject_id === item.raw.subject_id && 
                                      new Date(s.start_time).toLocaleDateString('en-GB') === date
                                    );
                                    if (matched) fetchAttendanceForSession(matched.id);
                                    else alert('No database record found for this session.');
                                  }
                                }}
                              >
                                Check Attendance
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ));
              })()}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3>Start New Session</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleStartSession}>
               <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label>Year</label>
                  <select
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    required
                  >
                    <option value="1">Year 1</option>
                    <option value="2">Year 2</option>
                    <option value="3">Year 3</option>
                    <option value="4">Year 4</option>
                  </select>
                </div>
                <div>
                  <label>Stream</label>
                  <select
                    value={formData.stream}
                    onChange={(e) => setFormData({ ...formData, stream: e.target.value })}
                    required
                  >
                    <option value="CSE">CSE</option>
                    <option value="ECE">ECE</option>
                    <option value="ME">ME</option>
                    <option value="CE">CE</option>
                    <option value="EE">EE</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Subject</label>
                <select
                  value={formData.subject_id}
                  onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                  required
                >
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Classroom No.</label>
                <select
                  value={formData.classroom_id}
                  onChange={(e) => setFormData({ ...formData, classroom_id: e.target.value })}
                  required
                >
                  {classrooms.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label>Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label>Day</label>
                  <select
                    value={formData.day}
                    onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                    required
                  >
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Time Duration (Slot)</label>
                <select
                  value={formData.timeSlot}
                  onChange={(e) => setFormData({ ...formData, timeSlot: e.target.value })}
                  required
                >
                  {[
                    '10:15 AM - 11:05 AM',
                    '11:05 AM - 11:55 AM',
                    '11:55 AM - 12:45 PM',
                    '12:45 PM - 01:35 PM',
                    '01:35 PM - 02:25 PM',
                    '02:25 PM - 03:15 PM',
                    '03:15 PM - 04:05 PM',
                    '04:05 PM - 04:55 PM',
                    '04:55 PM - 05:45 PM'
                  ].map(slot => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Start Session</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAttendanceModal && (
        <div className="modal-overlay animate-fade-in" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(28, 25, 23, 0.4)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content animate-scale-in" style={{ padding: '2rem', background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--foreground)' }}>Attendance Records</h3>
              <button 
                onClick={() => setShowAttendanceModal(false)} 
                style={{ background: 'var(--secondary)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--foreground)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="attendance-list-modal" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {attendanceRecords.length > 0 ? (
                attendanceRecords.map((rec, idx) => (
                  <div key={idx} className="attendance-item" style={{ padding: '0.75rem 1rem', background: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="student-modal-info">
                      <span style={{ display: 'block', fontWeight: 600, fontSize: '0.95rem', color: 'var(--foreground)' }}>{rec.student_name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{rec.email}</span>
                    </div>
                    <span style={{ fontSize: '0.8rem', padding: '4px 8px', borderRadius: '4px', background: rec.status === 'present' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: rec.status === 'present' ? '#059669' : '#dc2626', fontWeight: 600 }}>
                      {rec.status.toUpperCase()}
                    </span>
                  </div>
                ))
              ) : (
                <p style={{ textAlign: 'center', color: 'var(--muted-foreground)', padding: '2rem 0' }}>No attendance records found for this session.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sessions;
