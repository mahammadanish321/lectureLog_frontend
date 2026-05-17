import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import {
  Plus, Loader2, X, Clock, MapPin, User, BookOpen,
  CalendarDays, CheckCircle2, Trash2, Star, ChevronDown, XCircle
} from 'lucide-react';
import './Sessions.css';

/* ── helpers ─────────────────────────────────────────── */
const getTodayDateString = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};
const getTodayDayString = () =>
  ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];

const STATUS_META = {
  active: { label: 'Live', cls: 'status-active' },
  scheduled: { label: 'Upcoming', cls: 'status-scheduled' },
  ended: { label: 'Ended', cls: 'status-ended' },
  cancelled: { label: 'Cancelled', cls: 'status-cancelled' },
};

/* ── component ───────────────────────────────────────── */
const Sessions = () => {
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const isTeacher = user?.role?.toLowerCase() === 'teacher';

  const [sessions, setSessions] = useState([]);
  const [teacherSchedules, setTeacherSchedules] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [showAttModal, setShowAttModal] = useState(false);
  const [attLoading, setAttLoading] = useState(false);
  const [attFilter, setAttFilter] = useState('present');
  const todayDefault = new Date().toLocaleDateString('en-GB');
  const [expandedDates, setExpandedDates] = useState({ [todayDefault]: true });

  const toggleDateGroup = (date) => {
    setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }));
  };

  const [formData, setFormData] = useState({
    subject_id: '', classroom_id: '', year: '1', stream: 'CSE',
    date: getTodayDateString(), day: getTodayDayString(),
    timeSlot: '10:15 AM - 11:05 AM'
  });

  const [passwordModal, setPasswordModal] = useState({
    open: false,
    id: null,
    isCustom: false,
    password: '',
    loading: false,
    title: '',
    subtitle: '',
  });

  /* ── fetch ─────────────────────────────────────────── */
  const fetchInitialData = async () => {
    try {
      const [sr, cr, tr] = await Promise.allSettled([
        api.get('/subjects'),
        api.get('/classrooms'),
        api.get('/time_slots')
      ]);

      if (sr.status === 'fulfilled' && sr.value?.data) {
        setSubjects(sr.value.data);
        if (sr.value.data.length > 0) setFormData(p => ({ ...p, subject_id: sr.value.data[0].id }));
      }
      if (cr.status === 'fulfilled' && cr.value?.data) {
        setClassrooms(cr.value.data);
      }

      const trData = tr.status === 'fulfilled' ? tr.value?.data : null;
      if (trData?.length > 0) {
        const formattedSlots = trData.map(t => `${t.start_time} - ${t.end_time}`);
        setTimeSlots(formattedSlots);
        setFormData(p => ({ ...p, timeSlot: formattedSlots[0] }));
      } else {
        const defSlots = ['10:15 AM - 11:05 AM', '11:05 AM - 11:55 AM', '11:55 AM - 12:45 PM', '12:45 PM - 01:35 PM', '01:35 PM - 02:25 PM', '02:25 PM - 03:15 PM', '03:15 PM - 04:05 PM', '04:05 PM - 04:55 PM', '04:55 PM - 05:45 PM', '05:45 PM - 06:35 PM', '06:35 PM - 07:25 PM', '07:25 PM - 08:15 PM', '08:15 PM - 09:05 PM', '09:05 PM - 09:55 PM', '09:55 PM - 10:45 PM', '10:45 PM - 11:35 PM'];
        setTimeSlots(defSlots);
        setFormData(p => ({ ...p, timeSlot: defSlots[0] }));
      }
    } catch { }
  };

  const fetchSessions = async () => {
    try {
      // allCustom=true → backend returns custom sessions across all future weeks
      const res = await api.get('/sessions?allCustom=true');
      const role = user?.role?.toLowerCase();
      const uid = user?.id;
      if (role === 'teacher') {
        setSessions(res.data.filter(s => String(s.teacher_id) === String(uid)));
        const schRes = await api.get('/schedules/my');
        setTeacherSchedules(schRes.data);
      } else {
        setSessions(res.data);
      }
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSessions(); fetchInitialData(); }, [user]);

  // Smart auto-fill from schedule
  useEffect(() => {
    if (!formData.subject_id || !teacherSchedules.length) return;
    const m = teacherSchedules.find(s => String(s.subject_id) === String(formData.subject_id));
    if (m) setFormData(p => ({
      ...p,
      classroom_id: m.classroom_id,
      year: m.year || p.year,
      stream: m.stream || p.stream,
      timeSlot: `${m.start_time.substring(0, 5)} - ${m.end_time.substring(0, 5)}`
    }));
  }, [formData.subject_id, teacherSchedules]);

  /* ── actions ────────────────────────────────────────── */
  const handleStartSession = async (e) => {
    e.preventDefault();
    try {
      const [startStr, endStr] = formData.timeSlot.split(' - ');
      const parseTime = (dateStr, timeStr) => {
        const [time, mod] = timeStr.trim().split(' ');
        let [hh, mm] = time.split(':');
        let h = parseInt(hh);
        if (mod === 'PM' && h !== 12) h += 12;
        if (mod === 'AM' && h === 12) h = 0;
        const d = new Date(dateStr);
        d.setHours(h, parseInt(mm), 0, 0);
        return d;
      };
      await api.post('/sessions/start', {
        subject_id: parseInt(formData.subject_id),
        classroom_id: parseInt(formData.classroom_id),
        duration: 50,
        year: formData.year,
        stream: formData.stream,
        start_time: parseTime(formData.date, startStr).toISOString(),
        end_time: parseTime(formData.date, endStr).toISOString(),
      });
      setShowModal(false);
      fetchSessions();
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleCancelSession = async (id) => {
    const session = sessions.find(s => s.id === id);
    if (!session) return;
    const now = new Date();
    const day = now.getDay();
    const mon = new Date(now); mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1)); mon.setHours(0, 0, 0, 0);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23, 59, 59, 999);
    if (new Date(session.start_time) > sun && !isAdmin) {
      alert('This session belongs to a future week and cannot be deleted until that week becomes active.');
      return;
    }
    setPasswordModal({
      open: true,
      id,
      isCustom: true,
      password: '',
      loading: false,
      title: 'Cancel Custom Session',
      subtitle: 'Enter your account password to cancel this custom session:',
    });
  };

  const handleCancelRoutine = async (id) => {
    setPasswordModal({
      open: true,
      id,
      isCustom: false,
      password: '',
      loading: false,
      title: 'Cancel Routine Class',
      subtitle: 'Enter your account password to cancel this routine class:',
    });
  };

  const submitCancelSession = async () => {
    if (!passwordModal.password) {
      alert('Please enter your password.');
      return;
    }
    setPasswordModal((prev) => ({ ...prev, loading: true }));
    try {
      if (passwordModal.isCustom) {
        await api.post('/sessions/cancel', { id: passwordModal.id, password: passwordModal.password });
      } else {
        await api.post(`/schedules/${passwordModal.id}/cancel`, { password: passwordModal.password });
      }
      setPasswordModal((prev) => ({ ...prev, open: false, loading: false }));
      fetchSessions();
    } catch (err) {
      alert(err.response?.data?.message || 'Cancellation failed');
      setPasswordModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const fetchAttendance = async (sessionId) => {
    setAttLoading(true);
    setShowAttModal(true);
    try {
      const r = await api.get(`/attendance/session/${sessionId}?include_absent=true`);
      setAttendanceRecords(r.data);
    } catch { setAttendanceRecords([]); }
    finally { setAttLoading(false); }
  };

  /* ── build combined list ────────────────────────────── */
  const buildCombined = () => {
    const today = new Date().toLocaleDateString('en-GB');
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const currentDayIdx = now.getDay();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const getScheduleInfo = (s) => {
      const targetIdx = days.indexOf(s.day_of_week);
      const diff = targetIdx - currentDayIdx;
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() + diff);
      const dateStr = targetDate.toLocaleDateString('en-GB');

      let status = 'scheduled';
      let done = false;

      if (s.is_cancelled) {
        status = 'cancelled';
        done = true;
      } else if (diff < 0) {
        status = 'ended';
        done = true;
      } else if (diff === 0) {
        const [eh, em] = s.end_time.split(':');
        const endMin = parseInt(eh) * 60 + parseInt(em);
        if (nowMin > endMin) {
          status = 'ended';
          done = true;
        }
      }
      return { dateStr, status, done };
    };

    const fromSchedules = teacherSchedules
      .filter(s => {
        const { dateStr } = getScheduleInfo(s);
        if (dateStr !== today) return false;
        // Do not show routine if there's already a DB session for this subject on this date
        return !sessions.some(db =>
          !db.is_custom &&
          db.subject_id === s.subject_id &&
          new Date(db.start_time).toLocaleDateString('en-GB') === dateStr
        );
      })
      .map(s => {
        const { dateStr, status, done } = getScheduleInfo(s);
        return {
          id: `sched_${s.id}_${dateStr}`, originalId: s.id,
          subject_name: s.subject_name, type: 'Regular',
          year: s.year, stream: s.stream || 'N/A',
          room: `${s.classroom_name} (Cam ${s.camera_id})`,
          time_range: `${s.start_time.substring(0, 5)} – ${s.end_time.substring(0, 5)}`,
          status, isCustom: false, isDone: done,
          date: dateStr, raw: s,
        };
      });

    const fromSessions = sessions.map(s => {
      const formatWallTime = (isoStr) => {
        if (!isoStr) return '--:--';
        
        // 1. Real Timestamp (UTC) -> Convert to local
        if (isoStr.includes('Z')) {
          try {
            return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          } catch (e) { return isoStr; }
        }

        // 2. Wall Clock ISO
        const timePart = isoStr.includes('T') ? isoStr.split('T')[1].split('.')[0] : isoStr;
        const [h, m] = timePart.split(':');
        const hh = parseInt(h);
        const ampm = hh >= 12 ? 'PM' : 'AM';
        const h12 = hh % 12 || 12;
        return `${String(h12).padStart(2, '0')}:${m} ${ampm}`;
      };

      return {
        id: `db_${s.id}`, originalId: s.id, scheduleId: s.schedule_id || s.id,
        subject_name: s.subject_name, type: s.is_custom ? 'Custom' : 'Regular',
        year: s.year, stream: s.stream || 'N/A',
        room: s.classroom_name || s.camera_url || '—',
        time_range: `${formatWallTime(s.start_time)} – ${formatWallTime(s.end_time)}`,
        status: s.status, isCustom: !!s.is_custom, isDone: s.status === 'ended',
        date: (() => {
          if (!s.start_time || !s.start_time.includes('T')) return new Date().toLocaleDateString('en-GB');
          const [yyyy, mm, dd] = s.start_time.split('T')[0].split('-');
          return `${dd}/${mm}/${yyyy}`;
        })(),
        raw: s,
      };
    });

    return [...fromSchedules, ...fromSessions];
  };

  const combined = buildCombined();

  // Group by date
  const groups = combined.reduce((acc, item) => {
    if (!acc[item.date]) acc[item.date] = [];
    acc[item.date].push(item);
    return acc;
  }, {});

  const todayStr = new Date().toLocaleDateString('en-GB');
  const sortedDates = Object.keys(groups).sort((a, b) => {
    if (a === todayStr) return -1;
    if (b === todayStr) return 1;
    return new Date(b.split('/').reverse().join('-')) - new Date(a.split('/').reverse().join('-'));
  });

  // sort items within each group
  sortedDates.forEach(d => {
    groups[d].sort((a, b) => {
      const order = { active: 0, scheduled: 1, ended: 2, cancelled: 3 };
      return (order[a.status] ?? 9) - (order[b.status] ?? 9) || a.time_range.localeCompare(b.time_range);
    });
  });

  useEffect(() => {
    if (sortedDates.length > 0) {
      setExpandedDates(prev => ({
        ...prev,
        [sortedDates[0]]: true,
        [todayStr]: true
      }));
    }
  }, [sortedDates.length]);

  /* ── date label helper ─────────────────────────────────── */
  const formatDateLabel = (dateStr) => {
    if (dateStr === todayStr) return 'Today';
    // Parse dd/mm/yyyy
    const [dd, mm, yyyy] = dateStr.split('/');
    const d = new Date(`${yyyy}-${mm}-${dd}`);
    const diff = Math.round((d - new Date(todayStr.split('/').reverse().join('-'))) / 86400000);
    if (diff === 1) return 'Tomorrow';
    if (diff > 1 && diff <= 7) return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  /* ── counts ─────────────────────────────────────────────── */
  const liveCount = combined.filter(i => i.status === 'active').length;
  const upcomingCount = combined.filter(i => i.status === 'scheduled').length;
  const completedCount = combined.filter(i => i.status === 'ended').length;
  const cancelledCount = combined.filter(i => i.status === 'cancelled').length;
  const customCount = combined.filter(i => i.isCustom).length;

  /* ── render ──────────────────────────────────────────── */
  return (
    <div className="sess-page animate-fade-in">

      {/* ── PAGE HEADER ── */}
      <div className="sess-header">
        <div className="sess-header-left">
          <h1>Sessions</h1>
          <p className="sess-subtitle">Monitor and manage all class sessions</p>
        </div>
        <button className="sess-new-btn" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New Session
        </button>
      </div>

      {/* ── STAT PILLS ── */}
      <div className="sess-stats-row">
        <div className="sess-stat-pill pill-green">
          <div className="pill-dot pulse-dot" />
          <span className="pill-val">{liveCount}</span>
          <span className="pill-label">Live</span>
        </div>
        <div className="sess-stat-pill pill-blue">
          <CalendarDays size={13} />
          <span className="pill-val">{upcomingCount}</span>
          <span className="pill-label">Upcoming</span>
        </div>
        <div className="sess-stat-pill pill-neutral">
          <CheckCircle2 size={13} />
          <span className="pill-val">{completedCount}</span>
          <span className="pill-label">Completed</span>
        </div>
        <div className="sess-stat-pill pill-red">
          <XCircle size={13} />
          <span className="pill-val">{cancelledCount}</span>
          <span className="pill-label">Cancelled</span>
        </div>
        <div className="sess-stat-pill pill-amber">
          <Star size={12} />
          <span className="pill-val">{customCount}</span>
          <span className="pill-label">Custom</span>
        </div>
        <div className="sess-stat-pill pill-neutral">
          <BookOpen size={13} />
          <span className="pill-val">{combined.length}</span>
          <span className="pill-label">Total</span>
        </div>
      </div>

      {/* ── SESSIONS LIST ── */}
      {loading ? (
        <div className="sess-loader">
          <Loader2 size={36} className="animate-spin" color="var(--primary)" />
          <span>Loading sessions…</span>
        </div>
      ) : combined.length === 0 ? (
        <div className="sess-empty">
          <CalendarDays size={40} color="#cbd5e1" />
          <p>No session history or upcoming classes found.</p>
          <button className="sess-new-btn" onClick={() => setShowModal(true)}>
            <Plus size={15} /> Add Custom Session
          </button>
        </div>
      ) : (
        <div className="sess-groups">
          {sortedDates.map(date => {
            const isOpen = !!expandedDates[date];
            const isToday = date === todayStr;
            const isFuture = !isToday && (() => {
              const [dd, mm, yyyy] = date.split('/');
              return new Date(`${yyyy}-${mm}-${dd}`) > new Date();
            })();
            const hasCustom = groups[date].some(i => i.isCustom);
            return (
              <div key={date} className="sess-group">
                {/* Date header */}
                <button
                  className={`sess-date-header ${isToday ? 'today-header' : ''} ${isFuture && hasCustom ? 'future-custom-header' : ''}`}
                  onClick={() => toggleDateGroup(date)}
                >
                  <div className="sess-date-left">
                    {isToday && <span className="today-chip">TODAY</span>}
                    {isFuture && hasCustom && <span className="upcoming-chip">UPCOMING</span>}
                    <span className="date-text">{formatDateLabel(date)}</span>
                    <span className="date-count">{groups[date].length} session{groups[date].length !== 1 ? 's' : ''}</span>
                  </div>
                  <ChevronDown size={16} className={`chevron ${isOpen ? 'open' : ''}`} />
                </button>

                {/* Session cards */}
                {isOpen && (
                  <div className="sess-cards">
                    {groups[date].map(item => (
                      <div
                        key={item.id}
                        className={`sess-card ${item.status} ${item.isCustom ? 'custom-card' : ''}`}
                      >
                        {/* Card body */}
                        <div className="sess-card-body">
                          <div className="sess-card-left">
                            <div className={`sess-type-bar ${item.isCustom ? 'bar-amber' : 'bar-green'}`} />
                            <div className="sess-card-info">
                              <h3 className="sess-subject">{item.subject_name}</h3>
                              <div className="sess-meta-row">
                                <span className="sess-meta"><User size={11} /> Year {item.year} · {item.stream}</span>
                                <span className="sess-meta"><MapPin size={11} /> {item.room}</span>
                                <span className="sess-meta"><Clock size={11} /> {item.time_range}</span>
                              </div>
                            </div>
                          </div>

                          <div className="sess-card-right">
                            {/* Custom badge */}
                            {item.isCustom && (
                              <span className="custom-badge-pill">
                                <Star size={11} /> Custom
                              </span>
                            )}

                            {/* Status badge */}
                            <span className={`sess-status-badge ${STATUS_META[item.status]?.cls || ''}`}>
                              {item.status === 'active' && <span className="live-dot" />}
                              {STATUS_META[item.status]?.label || item.status}
                            </span>

                            {/* Actions */}
                            <div className="sess-actions">
                              {/* Cancel regular class */}
                              {item.type === 'Regular' && !item.isCustom && (item.status === 'active' || item.status === 'scheduled') && (
                                <button className="act-btn act-red" onClick={() => handleCancelRoutine(item.scheduleId || item.originalId)}>
                                  Cancel Class
                                </button>
                              )}

                              {/* Cancel custom session */}
                              {item.isCustom && (item.status === 'active' || item.status === 'scheduled') && (
                                <button className="act-btn act-red" onClick={() => handleCancelSession(item.originalId)}>
                                  Cancel Class
                                </button>
                              )}

                              {/* Admin delete any session */}
                              {isAdmin && !item.isCustom && (item.status === 'active' || item.status === 'scheduled') && (
                                <button className="act-btn act-red" onClick={() => handleCancelRoutine(item.scheduleId || item.originalId)}>
                                  Cancel
                                </button>
                              )}

                              {/* Check Attendance */}
                              {(item.status === 'ended' || item.status === 'active' || item.status === 'cancelled') && (
                                <button className="act-btn act-primary" onClick={() => {
                                  if (item.id.startsWith('db_') || item.isCustom || item.type === 'Custom') {
                                    fetchAttendance(item.originalId);
                                  } else {
                                    // It's a schedule template (sched_), find corresponding DB session
                                    const matched = sessions.find(s =>
                                      s.subject_id === item.raw.subject_id &&
                                      new Date(s.start_time).toLocaleDateString('en-GB') === date
                                    );
                                    if (matched) fetchAttendance(matched.id);
                                    else alert('No attendance record exists for this session yet.');
                                  }
                                }}>
                                  <CheckCircle2 size={13} /> {item.status === 'active' ? 'Live Attendance' : 'Attendance'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── NEW SESSION MODAL ── */}
      {showModal && (
        <div className="sess-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="sess-modal animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="sess-modal-header">
              <div>
                <h2>New Custom Session</h2>
                <p>Add a special or extra class outside the regular routine</p>
              </div>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleStartSession} className="sess-modal-form">
              <div className="form-row-2">
                <div className="form-field">
                  <label>Year</label>
                  <select value={formData.year} onChange={e => setFormData({ ...formData, year: e.target.value })} required>
                    <option value="1">Year 1</option><option value="2">Year 2</option>
                    <option value="3">Year 3</option><option value="4">Year 4</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>Stream</label>
                  <select value={formData.stream} onChange={e => setFormData({ ...formData, stream: e.target.value })} required>
                    <option>CSE</option><option>ECE</option><option>ME</option><option>CE</option><option>EE</option>
                  </select>
                </div>
              </div>

              <div className="form-field">
                <label>Subject</label>
                <select value={formData.subject_id} onChange={e => setFormData({ ...formData, subject_id: e.target.value })} required>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ''}</option>)}
                </select>
              </div>

              <div className="form-field">
                <label>Classroom</label>
                <select value={formData.classroom_id} onChange={e => setFormData({ ...formData, classroom_id: e.target.value })} required>
                  <option value="">Select Classroom</option>
                  {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="form-row-2">
                <div className="form-field">
                  <label>Date</label>
                  <input type="date" value={formData.date} onChange={e => {
                    const newDate = e.target.value;
                    if (!newDate) return;
                    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    const dayOnly = new Date(newDate).getDay();
                    const dayName = days[Number.isNaN(dayOnly) ? 0 : dayOnly];
                    setFormData(prev => ({ ...prev, date: newDate, day: dayName }));
                  }} required />
                </div>
                <div className="form-field">
                  <label>Day</label>
                  <select value={formData.day} disabled className="disabled-select" required>
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d =>
                      <option key={d} value={d}>{d}</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="form-field">
                <label>Time Slot</label>
                <select value={formData.timeSlot} onChange={e => setFormData({ ...formData, timeSlot: e.target.value })} required>
                  {timeSlots.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="modal-footer-btns">
                <button type="button" className="modal-cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="modal-submit-btn"><Plus size={15} /> Add Session</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ATTENDANCE MODAL ── */}
      {showAttModal && (
        <div className="sess-modal-overlay" onClick={() => setShowAttModal(false)}>
          <div className="sess-modal att-modal animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="attendance-modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Class Attendance</h3>
                <span className="slot-info" style={{ marginTop: '4px', marginBottom: 0 }}>Roster Records</span>
              </div>
              <button className="modal-icon-close" onClick={() => setShowAttModal(false)}>
                <XCircle size={20} />
              </button>
            </div>

            <div className="attendance-filter-row">
              {(() => {
                const presentCount = attendanceRecords.filter(r => r.status !== 'absent').length;
                const absentCount = attendanceRecords.filter(r => r.status === 'absent').length;
                return ['present', 'absent'].map(filter => (
                  <button
                    key={filter}
                    className={`attendance-filter-btn ${attFilter === filter ? 'active' : ''}`}
                    onClick={() => setAttFilter(filter)}
                  >
                    {filter === 'present' ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                    {filter === 'present' ? `Present (${presentCount})` : `Absent (${absentCount})`}
                  </button>
                ));
              })()}
            </div>

            {attLoading ? (
              <div className="attendance-loading"><Loader2 className="animate-spin" size={28} /></div>
            ) : (
              <div className="attendance-roster">
                {attendanceRecords
                  .filter(rec => (attFilter === 'present' ? rec.status !== 'absent' : rec.status === 'absent'))
                  .map((rec, i) => (
                    <div key={rec.student_id || rec.id || i} className="attendance-roster-row">
                      <img
                        className="attendance-avatar"
                        src={rec.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(rec.student_name || 'Student')}`}
                        alt={rec.student_name}
                      />
                      <div className="attendance-student-info">
                        <strong>{rec.student_name}</strong>
                        <span>{rec.roll_number || 'No roll'} · {rec.email || `${String(rec.student_name).toLowerCase().replace(/\s+/g, '')}@Merge.edu`}</span>
                      </div>
                      <div className="attendance-time">
                        {rec.marked_at ? new Date(rec.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                      </div>
                      <span className={`attendance-status-icon ${rec.status === 'absent' ? 'absent' : 'present'}`}>
                        {rec.status === 'absent' ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
                      </span>
                    </div>
                  ))}
                {attendanceRecords.filter(rec => (attFilter === 'present' ? rec.status !== 'absent' : rec.status === 'absent')).length === 0 && (
                  <div className="attendance-empty">No {attFilter} students found.</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Password Modal */}
      {passwordModal.open && (
        <div className="sess-modal-overlay animate-fade-in" onClick={() => setPasswordModal((prev) => ({ ...prev, open: false }))}>
          <div className="sess-modal animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="sess-modal-header">
              <div>
                <h2>{passwordModal.title}</h2>
                <p>{passwordModal.subtitle}</p>
              </div>
              <button className="modal-close-btn" onClick={() => setPasswordModal((prev) => ({ ...prev, open: false }))}>×</button>
            </div>
            <div className="sess-modal-form">
              <div className="form-field">
                <label>Account Password</label>
                <input
                  type="password"
                  placeholder="Enter password..."
                  value={passwordModal.password}
                  onChange={(e) => setPasswordModal((prev) => ({ ...prev, password: e.target.value }))}
                  disabled={passwordModal.loading}
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') submitCancelSession(); }}
                />
              </div>
            </div>
            <div className="modal-footer-btns">
              <button className="modal-cancel-btn" onClick={() => setPasswordModal((prev) => ({ ...prev, open: false }))} disabled={passwordModal.loading}>Cancel</button>
              <button className="modal-submit-btn" style={{ background: '#ef4444', boxShadow: '0 4px 12px rgba(239,68,68,0.2)' }} onClick={submitCancelSession} disabled={passwordModal.loading}>
                {passwordModal.loading ? <Loader2 className="animate-spin" size={18} /> : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sessions;
