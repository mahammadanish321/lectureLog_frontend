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
  const [activityFilter, setActivityFilter] = useState('all');
  const [scheduleFilter, setScheduleFilter] = useState('all');

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
              status: s.status,
              isCancelled: s.status === 'cancelled'
            }));

            // Helper: convert HH:MM:SS to total minutes
            const toMins = (t) => { const p = (t || '00:00').split(':'); return parseInt(p[0]) * 60 + parseInt(p[1]); };

            // Deduplicate: If a session exists for a scheduled class, prefer the session
            // EXCEPTION: If the regular class is CANCELLED, always keep it to show the status
            const filteredRegular = todayRegular.filter(reg => {
              const hasConflict = todaySessions.some(sess =>
                String(sess.subject_id) === String(reg.subject_id) &&
                Math.abs(toMins(sess.start_time) - toMins(reg.start_time)) <= 20
              );
              return !hasConflict || reg.isCancelled;
            });

            // Combine, then final dedup pass (prefer sessions over schedules, but preserve cancelled status)
            const combinedRaw = [...todaySessions, ...filteredRegular];
            const seenKeys = new Set();
            const deduped = combinedRaw.filter(item => {
              const bucket = Math.floor(toMins(item.start_time) / 50);
              const key = `${item.subject_id}-${bucket}`;
              if (seenKeys.has(key)) {
                // If the current item is cancelled, allow it to stay as a separate entry
                return item.isCancelled;
              }
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
              status: s.status,
              isCancelled: s.status === 'cancelled'
            }));

            // Helper: convert HH:MM:SS to total minutes
            const toMins = (t) => { const p = (t || '00:00').split(':'); return parseInt(p[0]) * 60 + parseInt(p[1]); };

            // Deduplicate: Preserve cancelled classes even if a session exists
            const filteredRegular = todayRegular.filter(reg => {
              const hasConflict = todaySessions.some(sess =>
                String(sess.subject_id) === String(reg.subject_id) &&
                Math.abs(toMins(sess.start_time) - toMins(reg.start_time)) <= 20
              );
              return !hasConflict || reg.isCancelled;
            });

            const combinedSchedules = [...todaySessions, ...filteredRegular].sort((a, b) =>
              a.start_time.localeCompare(b.start_time)
            );
            setSchedules(combinedSchedules);
          }
        }
      } catch (err) {
        console.error('Dashboard data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const getClassActivityStatus = (schedule) => {
    const now = new Date();
    
    // Check attendance status first
    const isAttended = attendance.some(att => 
      String(att.subject_id) === String(schedule.subject_id) && 
      new Date(att.marked_at).toDateString() === now.toDateString()
    );

    // If attended, always show as Present regardless of time/status
    if (isAttended) return { type: 'attended', text: 'Present' };

    // If cancelled, return early
    if (schedule.status === 'cancelled' || schedule.isCancelled) return { type: 'cancelled', text: 'Cancelled' };
    
    const [startH, startM] = schedule.start_time.split(':');
    const [endH, endM] = schedule.end_time.split(':');
    
    const classStart = new Date();
    classStart.setHours(parseInt(startH, 10), parseInt(startM, 10), 0, 0);
    
    const classEnd = new Date();
    classEnd.setHours(parseInt(endH, 10), parseInt(endM, 10), 0, 0);

    // If the session is explicitly marked as ended or the time has passed
    if (schedule.status === 'ended' || now > classEnd) {
      return { type: 'missed', text: 'Absent' };
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

    // If it's within time and not ended, it's ongoing (unless it was explicitly started)
    return { type: 'ongoing', text: 'Live Now' };
  };

  const handleRecheck = async (schedule) => {
    try {
      let sessionId = schedule.isCustom ? schedule.id : null;
      
      if (!sessionId) {
        const sessionRes = await api.get('/sessions');
        const match = sessionRes.data.find(s => 
          s.subject_name.toLowerCase() === schedule.subject_name.toLowerCase() && 
          new Date(s.start_time).toDateString() === new Date().toDateString()
        );
        if (match) {
          sessionId = match.id;
        }
      }

      if (!sessionId) {
        alert('No active/ended session record was found for this class.');
        return;
      }

      await api.post('/recheck', {
        student_id: studentProfileId,
        session_id: sessionId,
        message: `Student requested recheck for ${schedule.subject_name}`
      });
      alert('Recheck request submitted successfully.');
    } catch (err) {
      console.error('Recheck error:', err);
      alert('Failed to submit recheck request.');
    }
  };

  const attendedToday = schedules.filter(s => getClassActivityStatus(s).type === 'attended').length;
  
  // Calculate unique class slots for the day (deduplicating cancelled + replacement sessions)
  const uniqueSlots = new Set();
  schedules.forEach(s => {
    const [h, m] = s.start_time.split(':');
    const mins = parseInt(h) * 60 + parseInt(m);
    const bucket = Math.floor(mins / 50);
    uniqueSlots.add(`${s.subject_id}-${bucket}`);
  });
  
  const totalSlots = uniqueSlots.size;
  const completedToday = schedules.filter(s => {
    const status = getClassActivityStatus(s);
    return status.type === 'attended' || status.type === 'missed';
  }).length;
  
  const attendancePercentage = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

  if (loading) {
    return (
      <div className="loading-screen" style={{ background: 'transparent', height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
        <p style={{ fontWeight: 700, fontSize: '1.2rem', letterSpacing: '0.05em' }}>PREPARING YOUR DASHBOARD...</p>
      </div>
    );
  }

  const filteredActivity = schedules.filter(schedule => {
    // Hide cancelled classes from the activity feed (they belong in Today's Schedule only)
    if (schedule.isCancelled) return false;
    
    const status = getClassActivityStatus(schedule);
    // Only show completed classes in activity feed
    const isCompleted = status.type === 'attended' || status.type === 'missed';
    if (!isCompleted) return false;
    
    if (activityFilter === 'all') return true;
    if (activityFilter === 'present') return status.type === 'attended';
    if (activityFilter === 'absent') return status.type === 'missed';
    return true;
  });

  const filteredSchedule = schedules.filter(schedule => {
    if (scheduleFilter === 'all') return true;
    if (scheduleFilter === 'custom') return schedule.isCustom;
    if (scheduleFilter === 'regular') return !schedule.isCustom;
    if (scheduleFilter === 'cancelled') return schedule.isCancelled;
    return true;
  });

  return (
    <div className="student-dashboard animate-fade-in">


      <div className="stats-grid">
        <div className="stat-card glass">
          <div className="stat-top">
            <div className="stat-icon-wrapper blue">
              <CheckCircle size={22} />
            </div>
          </div>
          <div className="stat-info">
            <h3>{attendedToday}</h3>
            <p>Classes Present</p>
          </div>
        </div>

        <div className="stat-card glass">
          <div className="stat-top">
            <div className="stat-icon-wrapper purple">
              <BookOpen size={22} />
            </div>
          </div>
          <div className="stat-info">
            <h3>{totalSlots > 0 ? `${completedToday} / ${totalSlots}` : '0'}</h3>
            <p>Total Classes</p>
          </div>
        </div>

        <div 
          className="stat-card glass attendance-progress-card" 
          style={{
            background: (() => {
              const percent = attendancePercentage;
              const color = percent >= 80 ? 'rgba(16, 89, 52, 0.15)' : percent >= 50 ? 'rgba(234, 179, 8, 0.15)' : 'rgba(239, 68, 68, 0.15)';
              return `linear-gradient(90deg, ${color} 0%, ${color} ${percent}%, transparent ${percent}%, transparent 100%)`;
            })()
          }}
        >
          <div className="stat-top">
            <div className="stat-icon-wrapper orange">
              <Clock size={22} />
            </div>
          </div>
          <div className="stat-info">
            <h3>{attendancePercentage}%</h3>
            <p>Attendance Rate</p>
          </div>
        </div>
      </div>

      <div className="dashboard-main-content">
        {/* My Activity Section */}
        <section className="section-card glass animate-fade-in">
          <div className="section-header" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="header-icon-pill" style={{ background: 'rgba(16, 89, 52, 0.08)', padding: '8px', borderRadius: '10px', display: 'flex' }}>
                <CheckCircle size={18} />
              </div>
              <h2>My Activity</h2>
            </div>
            <div className="filter-group">
              <button className={`filter-pill ${activityFilter === 'all' ? 'active' : ''}`} onClick={() => setActivityFilter('all')}>All</button>
              <button className={`filter-pill ${activityFilter === 'present' ? 'active' : ''}`} onClick={() => setActivityFilter('present')}>Present</button>
              <button className={`filter-pill ${activityFilter === 'absent' ? 'active' : ''}`} onClick={() => setActivityFilter('absent')}>Absent</button>
            </div>
          </div>
          
          <div className="activity-list">
            {filteredActivity.length > 0 ? (
              filteredActivity.map((schedule, index) => {
                const status = getClassActivityStatus(schedule);
                
                return (
                  <div key={index} className={`activity-card ${schedule.isCancelled ? 'cancelled' : ''}`}>
                    <div className="activity-details">
                      <h4 style={{ 
                        textDecoration: schedule.isCancelled ? 'line-through' : 'none', 
                        color: schedule.isCancelled ? '#ef4444' : '#1e293b' 
                      }}>
                        {schedule.subject_name}
                      </h4>
                      <div className="activity-meta" style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
                          <User size={12} /> {schedule.teacher_name}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
                          <Clock size={12} /> {schedule.start_time.substring(0, 5)} - {schedule.end_time.substring(0, 5)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="activity-action" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                      {status.type === 'cancelled' && (
                        <span className="status-label status-cancelled">
                          <XCircle size={14} /> Cancelled
                        </span>
                      )}
                      {status.type === 'attended' && (
                        <span className="status-label status-attended">
                          <CheckCircle size={14} /> Present
                        </span>
                      )}
                      {status.type === 'pending' && (
                        <span className="status-label status-pending">
                          <Clock size={14} /> {status.text}
                        </span>
                      )}
                      {status.type === 'missed' && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                          <span className="status-label status-missed">
                            <XCircle size={14} /> Absent
                          </span>
                          <button 
                            onClick={() => handleRecheck(schedule)}
                            className="recheck-btn"
                            style={{ 
                              padding: '4px 10px', 
                              fontSize: '0.65rem', 
                              fontWeight: '700',
                              borderRadius: '6px', 
                              background: '#fff', 
                              border: '1px solid var(--primary)', 
                              color: 'var(--primary)',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            RECHECK
                          </button>
                        </div>
                      )}
                      {status.type === 'ongoing' && (
                        <span className="status-label status-ongoing">
                          Live Now
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-state">
                <p>No {activityFilter !== 'all' ? activityFilter : 'activities'} recorded for today.</p>
              </div>
            )}
          </div>
        </section>

        <section className="section-card glass">
          <div className="section-header" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="header-icon-pill" style={{ background: 'rgba(16, 89, 52, 0.08)', padding: '8px', borderRadius: '10px', display: 'flex' }}>
                <Clock size={18} />
              </div>
              <h2>Today's Schedule</h2>
            </div>
            <div className="filter-group">
              <button className={`filter-pill ${scheduleFilter === 'all' ? 'active' : ''}`} onClick={() => setScheduleFilter('all')}>All</button>
              <button className={`filter-pill ${scheduleFilter === 'regular' ? 'active' : ''}`} onClick={() => setScheduleFilter('regular')}>Regular</button>
              <button className={`filter-pill ${scheduleFilter === 'custom' ? 'active' : ''}`} onClick={() => setScheduleFilter('custom')}>Custom</button>
              <button className={`filter-pill ${scheduleFilter === 'cancelled' ? 'active' : ''}`} onClick={() => setScheduleFilter('cancelled')}>Cancelled</button>
            </div>
          </div>
          <div className="upcoming-list">
            {filteredSchedule.length > 0 ? (
              filteredSchedule.map((schedule, index) => (
                <div key={index} className={`schedule-row ${schedule.isCustom ? 'custom-session' : ''} ${schedule.isCancelled ? 'cancelled-session' : ''} ${getClassActivityStatus(schedule).type === 'attended' || getClassActivityStatus(schedule).type === 'missed' ? 'is-ended' : ''}`}>
                  <div className="class-main-info">
                    {schedule.isCustom && (
                      <div className="custom-badge">
                        ★ CUSTOM
                      </div>
                    )}
                    <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1e293b' }}>
                      {schedule.subject_name} 
                      {schedule.isCancelled && <span style={{ fontSize: '0.65rem', color: '#ef4444', marginLeft: '6px', fontWeight: '800' }}>[CANCELLED]</span>}
                      {(getClassActivityStatus(schedule).type === 'attended' || getClassActivityStatus(schedule).type === 'missed') && !schedule.isCancelled && (
                        <span style={{ fontSize: '0.65rem', color: '#64748b', marginLeft: '6px', fontWeight: '800', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>[ENDED]</span>
                      )}
                    </h4>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      <User size={12} /> {schedule.teacher_name}
                    </p>
                  </div>
                  <div className="class-meta-info" style={{ textAlign: 'right' }}>
                    <span className="time-badge" style={schedule.isCustom ? { background: 'rgba(234, 179, 8, 0.15)', color: '#854d0e' } : {}}>
                      {schedule.start_time.substring(0, 5)} - {schedule.end_time.substring(0, 5)}
                    </span>
                    <p style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', justifyContent: 'flex-end', fontWeight: '600' }}>
                      <MapPin size={10} /> {schedule.classroom_name}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>No {scheduleFilter !== 'all' ? scheduleFilter : 'classes'} scheduled for today.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default StudentDashboard;
