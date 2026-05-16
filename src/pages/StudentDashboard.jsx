import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, BookOpen, MapPin, User, AlertCircle, Loader2, TrendingUp } from 'lucide-react';
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
  const [scheduleFilter, setScheduleFilter] = useState('all');
  const [activeSession, setActiveSession] = useState(null);

  const formatTime12h = (t) => {
    if (!t) return '--:--';
    const [h, m] = t.split(':');
    const hours = parseInt(h);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  };

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
            api.get('/sessions')
          ]);

          const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const today = days[new Date().getDay()];

          const todayRegular = schedRes.data.filter(s => s.day_of_week === today).map(s => ({ ...s, isCustom: false, isCancelled: s.is_cancelled }));
          const todaySessions = sessionRes.data.filter(s => {
            const sessDate = new Date(s.start_time);
            const isToday = sessDate.toDateString() === new Date().toDateString();
            const isMyBatch = String(s.year) === String(finalYear) && String(s.stream).toLowerCase() === String(finalStream).toLowerCase();
            return isToday && isMyBatch;
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
              isCancelled: s.status === 'cancelled'
            };
          });

          const toMins = (t) => { 
            const p = (t || '00:00').split(':'); 
            return parseInt(p[0]) * 60 + parseInt(p[1]); 
          };

          const filteredRegular = todayRegular.filter(reg =>
            !todaySessions.some(sess => 
              (String(sess.schedule_id) === String(reg.id) || 
              (String(sess.subject_id) === String(reg.subject_id) && Math.abs(toMins(sess.start_time) - toMins(reg.start_time)) < 15))
              && sess.status !== 'cancelled'
            )
          );

          const combinedSchedules = [...todaySessions, ...filteredRegular].sort((a, b) => toMins(a.start_time) - toMins(b.start_time));
          
          // Find live session for precise tracking
          const currentActive = sessionRes.data.find(s => s.status === 'active');
          setActiveSession(currentActive);
          
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
    if (!schedule) return { type: 'upcoming', text: 'Upcoming', batch: 'Upcoming', theme: 'blue' };
    const now = new Date();
    const isCustom = schedule.isCustom || schedule.is_custom || String(schedule.id).startsWith('sess_');

    // 1. Cancelled Status (Higher priority than Live/Ended)
    if (schedule.status === 'cancelled' || schedule.isCancelled) {
      return { type: 'cancelled', text: 'Cancelled', batch: 'Ended', theme: 'red' };
    }

    // Attendance record search
    const att = attendance.find(a => {
      if (a.schedule_id && String(a.schedule_id) === String(schedule.id)) return true;
      if (schedule.session_id && String(a.session_id) === String(schedule.session_id)) return true;
      
      const isSameSubject = String(a.subject_id) === String(schedule.subject_id);
      const isToday = new Date(a.start_time).toDateString() === now.toDateString();
      if (isSameSubject && isToday) {
        const [h, m] = (schedule.start_time || '00:00').split(':');
        const classStart = new Date();
        classStart.setHours(parseInt(h), parseInt(m), 0);
        const attStart = new Date(a.start_time);
        return Math.abs(attStart - classStart) / 60000 < 45;
      }
      return false;
    });

    const isAttended = att && ['present', 'detected', 'processing'].includes(att.status);

    const startTime = schedule.start_time || '00:00:00';
    const endTime = schedule.end_time || '23:59:59';
    const [startH, startM] = startTime.split(':');
    const [endH, endM] = endTime.split(':');
    const classStart = new Date(); classStart.setHours(parseInt(startH || 0), parseInt(startM || 0), 0);
    const classEnd = new Date(); classEnd.setHours(parseInt(endH || 23), parseInt(endM || 59), 0);

    const isLive = (activeSession?.schedule_id === schedule.id) || (now >= classStart && now <= classEnd);

    // 2. LIVE
    if (isLive) {
      let subStatus = 'Checking...';
      if (att) {
        if (att.status === 'detected') subStatus = 'Found You';
        else if (att.status === 'processing') subStatus = 'Processing You';
        else if (att.status === 'present') subStatus = 'Present';
      }
      return { 
        type: 'ongoing', 
        text: subStatus, 
        batch: 'LIVE', 
        theme: isCustom ? 'yellow' : 'emerald' 
      };
    }

    // 3. Ended
    if (now > classEnd || isAttended) {
      return { 
        type: isAttended ? 'attended' : 'missed', 
        text: isAttended ? 'Present' : 'Absent', 
        batch: 'Ended', 
        theme: 'ash' 
      };
    }

    // 4. Upcoming
    return { 
      type: 'pending', 
      text: 'Upcoming', 
      batch: 'Upcoming', 
      theme: isCustom ? 'yellow' : 'blue' 
    };
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

  const attendedToday = schedules.filter(s => {
    const info = getClassActivityStatus(s);
    return info.text === 'Present' || info.type === 'attended';
  }).length;
  const totalSlots = schedules.length;
  const todayAttendanceRate = totalSlots > 0 ? Math.round((attendedToday / totalSlots) * 100) : 0;

  const getStatusPriority = (type) => {
    switch (type) {
      case 'ongoing': return 1;
      case 'pending': return 2;
      case 'attended': return 3;
      case 'missed': return 4;
      case 'cancelled': return 5;
      default: return 6;
    }
  };

  // Pre-sort classes for the unified feed
  const sortedClasses = [...schedules].sort((a, b) => {
    const aStatus = getClassActivityStatus(a).type;
    const bStatus = getClassActivityStatus(b).type;
    if (aStatus !== bStatus) {
      return getStatusPriority(aStatus) - getStatusPriority(bStatus);
    }
    return (a.start_time || '').localeCompare(b.start_time || '');
  });

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

  return (
    <div className="student-dashboard animate-fade-in">


      <div className="stats-grid">
        <div className="stat-card glass">
          <div className="stat-top">
            <div className="stat-icon-wrapper blue">
              <Calendar size={22} />
            </div>
          </div>
          <div className="stat-info">
            <h3>{totalSlots}</h3>
            <p>Classes Today</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontSize: '0.8rem', color: '#64748b', fontWeight: '700' }}>
              <CheckCircle size={12} color="#105934" />
              Done: {attendedToday}
            </div>
          </div>
        </div>

        <div
          className="stat-card glass attendance-progress-card"
          style={{
            flex: 1.5,
            background: (() => {
              const percent = todayAttendanceRate;
              const color = percent >= 80 ? 'rgba(16, 89, 52, 0.15)' : percent >= 50 ? 'rgba(234, 179, 8, 0.15)' : 'rgba(239, 68, 68, 0.15)';
              return `linear-gradient(90deg, ${color} 0%, ${color} ${percent}%, transparent ${percent}%, transparent 100%)`;
            })()
          }}
        >
          <div className="stat-top">
            <div className="stat-icon-wrapper orange">
              <TrendingUp size={22} color="#105934" />
            </div>
          </div>
          <div className="stat-info">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <h3 style={{ fontSize: '2.5rem' }}>{todayAttendanceRate}%</h3>
              <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: '800' }}>Rate</span>
            </div>
            <p>Today's Pace</p>
          </div>
        </div>
      </div>

      <div className="dashboard-main-content" style={{ gridTemplateColumns: '1fr' }}>
        <section className="section-card glass animate-fade-in" style={{ width: '100%' }}>
          <div className="section-header" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="header-icon-pill" style={{ background: 'rgba(16, 89, 52, 0.08)', padding: '8px', borderRadius: '10px', display: 'flex' }}>
                <CheckCircle size={18} />
              </div>
              <h2>Classes</h2>
            </div>
            <div className="filter-group">
              <button className="filter-pill active">All Today</button>
            </div>
          </div>

          <div className="activity-list">
            {sortedClasses.length > 0 ? (
              sortedClasses.map((schedule, index) => {
                const statusInfo = getClassActivityStatus(schedule);
                const theme = statusInfo.theme;
                const batchLabel = statusInfo.batch;
                const statusLabel = statusInfo.text;

                const themeStyles = {
                  emerald: { border: '#105934', bg: '#f0fdf4', text: '#105934' },
                  blue: { border: '#1d4ed8', bg: '#eff6ff', text: '#1d4ed8' },
                  yellow: { border: '#b45309', bg: '#fffbeb', text: '#b45309' },
                  ash: { border: '#94a3b8', bg: '#f8fafc', text: '#64748b' },
                  red: { border: '#ef4444', bg: '#fef2f2', text: '#ef4444' },
                };
                const activeTheme = themeStyles[theme] || themeStyles.ash;

                return (
                  <div key={index} className={`activity-card ${theme === 'ash' ? 'ended' : ''}`} 
                    style={{
                      borderLeft: `4px solid ${activeTheme.border}`,
                      background: theme === 'ash' ? '#f9fafb' : '#fff',
                      opacity: theme === 'ash' ? 0.8 : 1,
                      borderColor: theme === 'red' ? '#feb2b2' : activeTheme.border + '30',
                      borderWidth: theme === 'ash' ? '1px' : '1px'
                    }}>
                    <div className="activity-details">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h4 style={{
                          textDecoration: theme === 'red' ? 'line-through' : 'none',
                          color: activeTheme.text,
                          fontSize: '1.1rem'
                        }}>
                          {schedule.subject_name}
                        </h4>
                        <span style={{ 
                          background: activeTheme.border, 
                          color: '#fff', 
                          fontSize: '0.65rem', 
                          padding: '2px 8px', 
                          borderRadius: '4px', 
                          fontWeight: '900',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {theme === 'emerald' && <span className="live-dot" style={{ width: '6px', height: '6px', background: '#fff', borderRadius: '50%' }}></span>}
                          {batchLabel}
                        </span>
                      </div>
                      <div className="activity-meta" style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#64748b' }}>
                          <User size={14} /> {schedule.teacher_name}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#64748b' }}>
                          <MapPin size={14} /> {schedule.classroom_name || 'Lab'}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: activeTheme.text, fontWeight: '600' }}>
                          <Clock size={14} /> {formatTime12h(schedule.start_time)} - {formatTime12h(schedule.end_time)}
                        </span>
                      </div>
                    </div>

                    <div className="activity-action">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span className="status-label" style={{ 
                          background: activeTheme.bg, 
                          color: activeTheme.text, 
                          padding: '6px 16px', 
                          borderRadius: '8px', 
                          fontWeight: '800',
                          border: `1px solid ${activeTheme.border}30`
                        }}>
                          {statusLabel}
                        </span>
                        {statusInfo.type === 'missed' && (
                          <button onClick={() => handleRecheck(schedule)} className="recheck-btn-desktop" style={{
                              padding: '8px 16px',
                              fontSize: '0.75rem',
                              fontWeight: '800',
                              borderRadius: '8px',
                              background: '#fff',
                              border: `2px solid var(--primary)`,
                              color: 'var(--primary)',
                              cursor: 'pointer'
                          }}>
                            RECHECK
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-state-container" style={{ padding: '60px', textAlign: 'center', background: '#f8fafc', borderRadius: '20px', border: '2px dashed #e2e8f0' }}>
                <p style={{ color: '#94a3b8', fontSize: '1.1rem', fontWeight: '600' }}>No classes scheduled for today.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default StudentDashboard;
