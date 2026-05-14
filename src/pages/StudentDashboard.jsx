import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, BookOpen, MapPin, User, AlertCircle, Loader2 } from 'lucide-react';
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
  const [error, setError] = useState(null);
  const [activityFilter, setActivityFilter] = useState('all');
  const [scheduleFilter, setScheduleFilter] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      console.log('StudentDashboard: Fetching data...');
      try {
        const [attRes, statsRes] = await Promise.all([
          api.get('/students/my-attendance'),
          api.get('/students/my-stats')
        ]);
        setAttendance(attRes.data);
        setStats(statsRes.data);
        console.log('StudentDashboard: Attendance and Stats fetched');

        // Get student info from profile API or fallback to AuthContext
        let liveYear, liveStream;
        try {
          const profileRes = await api.get('/students/me');
          console.log('StudentDashboard: Profile fetched', profileRes.data);
          setStudentProfileId(profileRes.data.id);
          liveYear = profileRes.data.year;
          liveStream = profileRes.data.stream;
        } catch (profileErr) {
          console.warn('StudentDashboard: Profile fetch failed, using context fallback', profileErr);
        }

        // Use context user if profile API didn't provide info
        const finalYear = liveYear || user?.year;
        const finalStream = liveStream || user?.stream;

        if (finalYear && finalStream) {
          console.log(`StudentDashboard: Fetching schedules for Year ${finalYear}, Stream ${finalStream}`);
          const [schedRes, sessionRes] = await Promise.all([
            api.get(`/schedules?year=${finalYear}&stream=${finalStream}`),
            api.get(`/sessions?year=${finalYear}&stream=${finalStream}`)
          ]);

          const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const today = days[new Date().getDay()];

          const todayRegular = schedRes.data.filter(s => s.day_of_week === today).map(s => ({ ...s, isCustom: false, isCancelled: s.is_cancelled }));
          const todaySessions = sessionRes.data.filter(s => {
            const sessDate = new Date(s.start_time);
            return sessDate.toDateString() === new Date().toDateString();
          }).map(s => {
            const formatSTime = (isoStr) => {
              if (!isoStr) return '00:00:00';
              if (isoStr.includes('Z')) {
                return new Date(isoStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              }
              return isoStr.includes('T') ? isoStr.split('T')[1].split('.')[0] : isoStr;
            };

            return {
              id: s.id,
              session_id: s.id,
              isSessionRecord: true,
              subject_id: s.subject_id,
              subject_name: s.subject_name,
              teacher_name: s.teacher_name,
              classroom_name: s.classroom_name,
              start_time: formatSTime(s.start_time),
              end_time: formatSTime(s.end_time),
              status: s.status,
              isCustom: s.is_custom,
              isCancelled: false
            };
          });

          const filteredRegular = todayRegular.filter(reg =>
            !todaySessions.some(sess => !sess.isCustom && sess.subject_id === reg.subject_id)
          );

          const toMins = (t) => { const p = (t || '00:00').split(':'); return parseInt(p[0]) * 60 + parseInt(p[1]); };
          const combinedRaw = [...todaySessions, ...filteredRegular];
          const seenKeys = new Set();
          const deduped = combinedRaw.filter(item => {
            const bucket = Math.floor(toMins(item.start_time) / 50);
            const key = `${item.subject_id}-${bucket}`;
            if (seenKeys.has(key)) {
              return item.isCancelled;
            }
            seenKeys.add(key);
            return true;
          });

          const combinedSchedules = deduped.sort((a, b) => toMins(a.start_time) - toMins(b.start_time));
          setSchedules(combinedSchedules);
          console.log('StudentDashboard: Schedules set', combinedSchedules);
          setError(null);
        } else {
          console.error('StudentDashboard: Missing year or stream info', { finalYear, finalStream, user });
          setError('Profile information (Year/Stream) is missing. Please contact admin.');
        }
      } catch (err) {
        console.error('StudentDashboard: Data fetch error:', err);
        setError('Failed to connect to the server. Please check your connection.');
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
    const isAttended = attendance.some(att => {
      // 1. Strict match by session_id
      if (schedule.session_id && String(att.session_id) === String(schedule.session_id)) {
        return att.status === 'present';
      }

      // 2. Fallback match by subject_id + Date + Time Range (to prevent leakage between same-subject classes)
      const attDate = new Date(att.start_time || att.marked_at);
      const isSameDay = attDate.toDateString() === now.toDateString();
      const isSameSubject = String(att.subject_id) === String(schedule.subject_id);
      
      if (isSameDay && isSameSubject) {
        // Parse class start time (HH:MM)
        const [classH, classM] = schedule.start_time.split(':');
        const attH = attDate.getHours();
        const attM = attDate.getMinutes();
        
        // Match if attendance session started within 1 hour of the scheduled time
        const classMins = parseInt(classH) * 60 + parseInt(classM);
        const attMins = attH * 60 + attM;
        const diff = Math.abs(classMins - attMins);
        
        if (diff < 45) { // 45 minute window for matching
          return att.status === 'present';
        }
      }
      return false;
    });

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
      let sessionId = schedule.session_id || (schedule.isCustom ? schedule.id : null);

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
      <div className="loading-screen" style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: 'var(--primary)' }}>
        <Loader2 className="animate-spin" size={48} style={{ marginBottom: '1.5rem', opacity: 0.8 }} />
        <p style={{ fontWeight: 800, letterSpacing: '0.1em', fontSize: '0.9rem' }}>PREPARING YOUR DASHBOARD...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-screen" style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fef2f2', color: '#b91c1c', padding: '2rem', textAlign: 'center' }}>
        <AlertCircle size={64} style={{ marginBottom: '1.5rem' }} />
        <h2 style={{ marginBottom: '0.5rem' }}>Connection Error</h2>
        <p style={{ marginBottom: '2rem', maxWidth: '400px' }}>{error}</p>
        <button onClick={() => window.location.reload()} className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>Retry Connection</button>
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
