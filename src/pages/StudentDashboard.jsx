import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, BookOpen, MapPin, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import './StudentDashboard.css';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [stats, setStats] = useState({ present: 0, total: 0 });
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentProfileId, setStudentProfileId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [attRes, statsRes] = await Promise.all([
          api.get('/students/my-attendance'),
          api.get('/students/my-stats')
        ]);
        setAttendance(attRes.data);
        setStats(statsRes.data);

        // Fetch routines for student using live data
        try {
          const profileRes = await api.get('/students/me');
          setStudentProfileId(profileRes.data.id);
          const liveYear = profileRes.data.year;
          const liveStream = profileRes.data.stream;
          
          if (liveYear && liveStream) {
            const [schedRes, sessionRes] = await Promise.all([
              api.get(`/schedules?year=${liveYear}&stream=${liveStream}`),
              api.get(`/sessions?year=${liveYear}&stream=${liveStream}`)
            ]);
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const today = days[new Date().getDay()];
            
            const todayRegular = schedRes.data.filter(s => s.day_of_week === today).map(s => ({ ...s, isCustom: false, isCancelled: s.is_cancelled }));
            const todaySessions = sessionRes.data.filter(s => {
              const sessDate = new Date(s.start_time);
              return sessDate.toDateString() === new Date().toDateString();
            }).map(s => ({
              id: s.id,
              subject_id: s.subject_id,
              subject_name: s.subject_name,
              teacher_name: s.teacher_name || 'Teacher',
              start_time: new Date(s.start_time).toTimeString().split(' ')[0],
              end_time: new Date(s.end_time).toTimeString().split(' ')[0],
              classroom_name: s.classroom_name,
              camera_id: s.camera_url || 'N/A',
              isCustom: s.is_custom,
              isCancelled: s.status === 'cancelled'
            }));

            // Helper: convert HH:MM:SS to total minutes
            const toMins = (t) => { const p = (t || '00:00').split(':'); return parseInt(p[0]) * 60 + parseInt(p[1]); };

            // Deduplicate: If a session exists for a scheduled class, prefer the session
            const filteredRegular = todayRegular.filter(reg => {
              return !todaySessions.some(sess =>
                String(sess.subject_id) === String(reg.subject_id) &&
                Math.abs(toMins(sess.start_time) - toMins(reg.start_time)) <= 20
              );
            });

            // Combine, then final dedup pass (prefer sessions over schedules)
            const combinedRaw = [...todaySessions, ...filteredRegular];
            const seenKeys = new Set();
            const deduped = combinedRaw.filter(item => {
              const bucket = Math.floor(toMins(item.start_time) / 50);
              const key = `${item.subject_id}-${bucket}`;
              if (seenKeys.has(key)) return false;
              seenKeys.add(key);
              return true;
            });

            const combinedSchedules = deduped.sort((a, b) =>
              a.start_time.localeCompare(b.start_time)
            );
            setSchedules(combinedSchedules);
          }
        } catch (profileErr) {
          console.error('Profile fetch failed, using fallback:', profileErr);
          if (user?.year && user?.stream) {
            const [schedRes, sessionRes] = await Promise.all([
              api.get(`/schedules?year=${user.year}&stream=${user.stream}`),
              api.get(`/sessions?year=${user.year}&stream=${user.stream}`)
            ]);
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const today = days[new Date().getDay()];
            
            const todayRegular = schedRes.data.filter(s => s.day_of_week === today).map(s => ({ ...s, isCustom: false, isCancelled: s.is_cancelled }));
            const todaySessions = sessionRes.data.filter(s => {
              const sessDate = new Date(s.start_time);
              return sessDate.toDateString() === new Date().toDateString();
            }).map(s => ({
              id: s.id,
              subject_id: s.subject_id,
              subject_name: s.subject_name,
              teacher_name: s.teacher_name || 'Teacher',
              start_time: new Date(s.start_time).toTimeString().split(' ')[0],
              end_time: new Date(s.end_time).toTimeString().split(' ')[0],
              classroom_name: s.classroom_name,
              camera_id: s.camera_url || 'N/A',
              isCustom: s.is_custom,
              isCancelled: s.status === 'cancelled'
            }));

            const toMins2 = (t) => { const p = (t || '00:00').split(':'); return parseInt(p[0]) * 60 + parseInt(p[1]); };

            const filteredRegular = todayRegular.filter(reg => {
              return !todaySessions.some(sess =>
                String(sess.subject_id) === String(reg.subject_id) &&
                Math.abs(toMins2(sess.start_time) - toMins2(reg.start_time)) <= 20
              );
            });

            const combinedRaw2 = [...todaySessions, ...filteredRegular];
            const seenKeys2 = new Set();
            const deduped2 = combinedRaw2.filter(item => {
              const bucket = Math.floor(toMins2(item.start_time) / 50);
              const key = `${item.subject_id}-${bucket}`;
              if (seenKeys2.has(key)) return false;
              seenKeys2.add(key);
              return true;
            });

            const combinedSchedules = deduped2.sort((a, b) =>
              a.start_time.localeCompare(b.start_time)
            );
            setSchedules(combinedSchedules);
          }
        }
      } catch (err) {
        console.error('Failed to fetch student data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (loading) return <div className="loading-state">Loading your dashboard...</div>;

  const getClassActivityStatus = (classItem) => {
    const now = new Date();
    
    const [startH, startM] = classItem.start_time.split(':');
    const [endH, endM] = classItem.end_time.split(':');
    
    const classStart = new Date();
    classStart.setHours(parseInt(startH, 10), parseInt(startM, 10), 0, 0);
    
    const classEnd = new Date();
    classEnd.setHours(parseInt(endH, 10), parseInt(endM, 10), 0, 0);

    const isAttended = attendance.some(att => 
      att.subject_name.toLowerCase() === classItem.subject_name.toLowerCase() && 
      new Date(att.start_time).toDateString() === now.toDateString() &&
      att.status === 'present'
    );

    if (classItem.isCancelled) {
      return { type: 'cancelled', text: 'Cancelled' };
    }

    if (isAttended) {
      return { type: 'attended', text: 'Attended' };
    }

    if (now < classStart) {
      const diffMs = classStart - now;
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      let timeStr = '';
      if (diffHrs > 0) {
        timeStr = `${diffHrs} hour${diffHrs > 1 ? 's' : ''} later`;
      } else {
        timeStr = `${diffMins} min${diffMins > 1 ? 's' : ''} later`;
      }
      return { type: 'pending', text: timeStr };
    }

    if (now > classEnd) {
      return { type: 'missed', text: 'Missed' };
    }

    return { type: 'ongoing', text: 'Ongoing Class' };
  };

  const attendedToday = schedules.filter(s => getClassActivityStatus(s).type === 'attended').length;
  const completedToday = schedules.filter(s => getClassActivityStatus(s).type !== 'pending').length;
  const attendancePercentage = completedToday > 0 ? Math.round((attendedToday / completedToday) * 100) : 0;

  const handleRecheck = async (classItem) => {
    try {
      let sessionId = classItem.isCustom ? classItem.id : null;
      
      if (!sessionId) {
        const sessionRes = await api.get('/sessions');
        const match = sessionRes.data.find(s => 
          s.subject_name.toLowerCase() === classItem.subject_name.toLowerCase() && 
          new Date(s.start_time).toDateString() === new Date().toDateString()
        );
        if (match) {
          sessionId = match.id;
        }
      }

      if (!sessionId) {
        alert('No active/ended session record was found for this class. Attendance cannot be rechecked.');
        return;
      }

      await api.post('/recheck', {
        student_id: studentProfileId,
        session_id: sessionId,
        message: `Student requested recheck for ${classItem.subject_name}`
      });
      alert('Recheck request submitted successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to submit recheck request.');
    }
  };

  return (
    <div className="student-dashboard animate-fade-in">

      <div className="stats-grid">
        <div className="stat-card glass">
          <div className="stat-icon-wrapper blue">
            <CheckCircle size={24} />
          </div>
          <div className="stat-info">
            <h3>{schedules.filter(s => getClassActivityStatus(s).type === 'attended').length}</h3>
            <p>Classes Present</p>
          </div>
        </div>

        <div className="stat-card glass">
          <div className="stat-icon-wrapper purple">
            <BookOpen size={24} />
          </div>
          <div className="stat-info">
            <h3>{schedules.length > 0 ? `${schedules.filter(s => getClassActivityStatus(s).type !== 'pending').length} / ${schedules.length}` : '0'}</h3>
            <p>Total Classes</p>
          </div>
        </div>

        <div className="stat-card glass">
          <div className="stat-icon-wrapper orange">
            <Clock size={24} />
          </div>
          <div className="stat-info">
            <h3>{attendancePercentage}%</h3>
            <p>Attendance Rate</p>
          </div>
          <div className="stat-progress">
            <div className="progress-bar" style={{ width: `${attendancePercentage}%` }}></div>
          </div>
        </div>
      </div>

      {/* My Activity Panel */}
      <section className="my-activity-section glass animate-fade-in" style={{ padding: '1.5rem', marginBottom: '2rem', borderRadius: '12px' }}>
        <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
          <CheckCircle size={22} className="text-primary" style={{ color: 'var(--primary)' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>My Activity</h2>
        </div>
        
        <div className="activity-list" style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {schedules.length > 0 ? (
            schedules.map((schedule, index) => {
              const status = getClassActivityStatus(schedule);
              const cardBg = schedule.isCancelled 
                ? 'rgba(239, 68, 68, 0.05)' 
                : (schedule.isCustom ? 'rgba(234, 179, 8, 0.12)' : 'rgba(28, 25, 23, 0.03)');
              const cardBorder = schedule.isCancelled 
                ? '1px dashed #ef4444' 
                : (schedule.isCustom ? '2px solid #eab308' : '1px solid rgba(28, 25, 23, 0.08)');

              return (
                <div key={index} className={`activity-card ${schedule.isCancelled ? 'cancelled-card' : ''}`} style={{ padding: '1.25rem', borderRadius: '10px', background: cardBg, border: cardBorder, display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: schedule.isCancelled ? 0.6 : 1 }}>
                  <div className="activity-details">
                    <h4 style={{ fontWeight: 600, fontSize: '1rem', color: schedule.isCancelled ? '#ef4444' : '#1c1917', marginBottom: '4px', textDecoration: schedule.isCancelled ? 'line-through' : 'none' }}>{schedule.subject_name}</h4>
                    <p style={{ fontSize: '0.8rem', color: 'rgba(28, 25, 23, 0.6)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User size={12} /> {schedule.teacher_name}
                    </p>
                    <p style={{ fontSize: '0.8rem', color: 'rgba(28, 25, 23, 0.6)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <Clock size={12} /> {schedule.start_time.substring(0, 5)} - {schedule.end_time.substring(0, 5)}
                    </p>
                  </div>
                  
                  <div className="activity-action" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    {status.type === 'cancelled' && (
                      <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, fontSize: '0.9rem' }}>
                        <XCircle size={20} /> Cancelled
                      </span>
                    )}
                    {status.type === 'attended' && (
                      <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, fontSize: '0.9rem' }}>
                        <CheckCircle size={20} /> Attended
                      </span>
                    )}
                    {status.type === 'pending' && (
                      <span style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500, fontSize: '0.85rem', background: 'rgba(59, 130, 246, 0.1)', padding: '4px 8px', borderRadius: '6px' }}>
                        <Clock size={16} /> {status.text}
                      </span>
                    )}
                    {status.type === 'missed' && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                        <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, fontSize: '0.9rem' }}>
                          <XCircle size={20} /> Missed
                        </span>
                        <button 
                          onClick={() => handleRecheck(schedule)}
                          style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px', background: 'rgba(28, 25, 23, 0.05)', border: '1px solid rgba(28, 25, 23, 0.2)', color: '#1c1917', cursor: 'pointer', transition: 'all 0.2s' }}
                          onMouseOver={(e) => e.target.style.background = 'rgba(28, 25, 23, 0.1)'}
                          onMouseOut={(e) => e.target.style.background = 'rgba(28, 25, 23, 0.05)'}
                        >
                          Request Recheck
                        </button>
                      </div>
                    )}
                    {status.type === 'ongoing' && (
                      <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, fontSize: '0.9rem' }}>
                        Live Now
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', gridColumn: '1/-1' }}>No activities mapped for today.</p>
          )}
        </div>
      </section>

      <div className="dashboard-sections" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>

        <section className="upcoming-section glass">
          <div className="section-header">
            <Clock size={20} />
            <h2>Scheduled Classes Today</h2>
          </div>
          <div className="upcoming-list">
            {schedules.length > 0 ? (
              schedules.map((schedule, index) => (
                <div key={index} className="schedule-row" style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '1rem', 
                  borderBottom: '1px solid var(--border)', 
                  background: schedule.isCancelled ? 'rgba(239, 68, 68, 0.02)' : (schedule.isCustom ? 'rgba(234, 179, 8, 0.08)' : 'transparent'), 
                  borderLeft: schedule.isCancelled ? '4px solid #ef4444' : (schedule.isCustom ? '4px solid #eab308' : 'none'),
                  opacity: schedule.isCancelled ? 0.7 : 1
                }}>
                  <div className="class-main-info">
                    <span className="subject-name" style={{ fontWeight: 600, display: 'block', textDecoration: schedule.isCancelled ? 'line-through' : 'none', color: schedule.isCancelled ? '#ef4444' : 'inherit' }}>
                      {schedule.subject_name} {schedule.isCancelled && <span style={{ fontSize: '0.7rem', fontWeight: 400, marginLeft: '8px' }}>(CANCELLED)</span>}
                    </span>
                    <span className="teacher-name" style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                      <User size={12} /> {schedule.teacher_name}
                    </span>
                  </div>
                  <div className="class-meta-info" style={{ textAlign: 'right' }}>
                    <span className="time-range" style={{ fontSize: '0.85rem', fontWeight: 500, color: schedule.isCancelled ? '#ef4444' : 'var(--primary)', display: 'block' }}>
                      {schedule.start_time.substring(0, 5)} - {schedule.end_time.substring(0, 5)}
                    </span>
                    <span className="room-camera" style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', justifyContent: 'flex-end' }}>
                      <MapPin size={12} /> {schedule.classroom_name} (Cam: {schedule.camera_id})
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>No classes scheduled for today.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default StudentDashboard;
