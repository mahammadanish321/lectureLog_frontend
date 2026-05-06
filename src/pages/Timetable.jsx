import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import {
  Calendar, Clock, Plus, Trash2, User, MapPin,
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  ZoomIn, ZoomOut, Edit3, Camera
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Timetable.css';

// Soft pastel palette for time columns
const COLUMN_COLORS = [
  { bg: 'rgba(99,102,241,0.06)', header: 'rgba(99,102,241,0.12)', accent: '#6366f1' },
  { bg: 'rgba(20,184,166,0.06)', header: 'rgba(20,184,166,0.12)', accent: '#14b8a6' },
  { bg: 'rgba(245,158,11,0.06)', header: 'rgba(245,158,11,0.12)', accent: '#f59e0b' },
  { bg: 'rgba(236,72,153,0.06)', header: 'rgba(236,72,153,0.12)', accent: '#ec4899' },
  { bg: 'rgba(59,130,246,0.06)', header: 'rgba(59,130,246,0.12)', accent: '#3b82f6' },
  { bg: 'rgba(16,185,129,0.06)', header: 'rgba(16,185,129,0.12)', accent: '#10b981' },
  { bg: 'rgba(168,85,247,0.06)', header: 'rgba(168,85,247,0.12)', accent: '#a855f7' },
  { bg: 'rgba(239,68,68,0.06)', header: 'rgba(239,68,68,0.12)', accent: '#ef4444' },
  { bg: 'rgba(234,179,8,0.06)', header: 'rgba(234,179,8,0.12)', accent: '#eab308' },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Return the Monday of a given week offset (0 = current week)
const getWeekStart = (offset = 0) => {
  const now = new Date();
  const day = now.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const formatWeekLabel = (weekStart) => {
  const end = new Date(weekStart);
  end.setDate(weekStart.getDate() + 6);
  const opts = { day: 'numeric', month: 'short' };
  return `${weekStart.toLocaleDateString('en-GB', opts)} – ${end.toLocaleDateString('en-GB', opts)}`;
};

const Timetable = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';
  const isStudent = user?.role === 'student';

  /* ── State ────────────────────────────────────────────────── */
  const [editMode, setEditMode] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [colStart, setColStart] = useState(0); // horizontal viewport (col nav)
  const [rowStart, setRowStart] = useState(0); // vertical viewport (row nav)
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week
  const [autoFit, setAutoFit] = useState(false); // auto-scale to show all cols

  const [timeSlots, setTimeSlots] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [availableCams, setAvailableCams] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCustomSubmit, setIsCustomSubmit] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [editScheduleId, setEditScheduleId] = useState(null);
  const [selectedYear, setSelectedYear] = useState(user?.year?.toString() || '1');
  const [selectedStream, setSelectedStream] = useState(user?.stream || 'CSE');
  const [formData, setFormData] = useState({
    subject_id: '', subject_search: '', teacher_id: '', teacher_search: '',
    classroom_id: '', classroom_search: '', camera_id: '0'
  });

  const wrapperRef = useRef(null);

  /* ── Visible counts (only used when not auto-fitting) ──────── */
  const VISIBLE_COLS = 6;
  const VISIBLE_ROWS = 7; // show all 7 days at once normally

  /* ── Derived ───────────────────────────────────────────────── */
  const weekStart = getWeekStart(weekOffset);
  const weekLabel = formatWeekLabel(weekStart);
  const isCurrentWeek = weekOffset === 0;
  const todayName = DAYS[((new Date().getDay() + 6) % 7)]; // Mon=0

  /* ── Fetch helpers ─────────────────────────────────────────── */
  const fetchTimeSlots = async () => {
    try {
      const res = await api.get('/time_slots');
      if (res.data?.length > 0) setTimeSlots(res.data);
    } catch (err) {
      console.error('[Timetable] Failed to fetch time slots:', err);
    }
  };

  const fetchData = async () => {
    try {
      const [schedRes, sessRes, subRes, teacherRes, classRes] = await Promise.all([
        api.get(`/schedules?year=${selectedYear}&stream=${selectedStream}`).catch(() => ({ data: [] })),
        api.get(`/sessions?year=${selectedYear}&stream=${selectedStream}`).catch(() => ({ data: [] })),
        api.get('/subjects').catch(() => ({ data: [] })),
        api.get('/teachers').catch(() => ({ data: [] })),
        api.get('/classrooms').catch(() => ({ data: [] })),
      ]);
      setSchedules(schedRes.data);
      setActiveSessions(sessRes.data);
      setSubjects(subRes.data);
      setTeachers(teacherRes.data);
      setClassrooms(classRes.data);
    } catch { }
  };

  const detectCameras = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(t => t.stop());
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAvailableCams(
        devices.filter(d => d.kind === 'videoinput')
          .map((d, i) => ({ id: i.toString(), name: d.label || `Camera ${i + 1}` }))
      );
    } catch { }
  };

  useEffect(() => {
    fetchTimeSlots();
    fetchData();
    detectCameras();
  }, [selectedYear, selectedStream]);

  /* ── Navigation ────────────────────────────────────────────── */
  const maxColStart = Math.max(0, timeSlots.length - VISIBLE_COLS);
  const maxRowStart = Math.max(0, DAYS.length - VISIBLE_ROWS);

  const navColLeft = () => setColStart(p => Math.max(0, p - 1));
  const navColRight = () => setColStart(p => Math.min(maxColStart, p + 1));
  const navRowUp = () => setRowStart(p => Math.max(0, p - 1));
  const navRowDown = () => setRowStart(p => Math.min(maxRowStart, p + 1));
  const zoomIn = () => { setZoomLevel(p => Math.min(1.4, p + 0.1)); setAutoFit(false); };
  const zoomOut = () => { setZoomLevel(p => Math.max(0.5, p - 0.1)); setAutoFit(false); };
  const toggleFit = () => { setAutoFit(p => !p); setZoomLevel(1); };

  /* ── Viewport slices ───────────────────────────────────────── */
  const visibleSlots = autoFit
    ? timeSlots
    : timeSlots.slice(colStart, colStart + VISIBLE_COLS);

  const visibleDays = DAYS.slice(rowStart, rowStart + VISIBLE_ROWS);

  /* ── Cell lookup ───────────────────────────────────────────── */
  const getScheduleForCell = (day, rawStart) =>
    schedules.find(s => s.day_of_week === day && s.start_time.startsWith(rawStart.substring(0, 5)));

  const getCustomSessionForCell = (day, cellStart, cellEnd) => {
    const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const wEnd = new Date(weekStart);
    wEnd.setDate(weekStart.getDate() + 6);
    wEnd.setHours(23, 59, 59, 999);

    return activeSessions.find(sess => {
      if (!sess.is_custom) return false;
      const s = new Date(sess.start_time);
      if (s < weekStart || s > wEnd) return false;
      if (DOW[s.getDay()] !== day) return false;
      const str = s.toTimeString().split(' ')[0];
      return str >= cellStart && str < cellEnd;
    });
  };

  /* ── AutoFit: use ResizeObserver so it reacts to panel size changes ─── */
  const [fitScale, setFitScale] = useState(1);

  useEffect(() => {
    if (!autoFit || !wrapperRef.current || timeSlots.length === 0) return;

    const calcFitScale = () => {
      const wrapW = wrapperRef.current?.clientWidth || 0;
      if (!wrapW) return;
      // Each col ~130px wide + 110px for day label
      const tableW = 110 + timeSlots.length * 130;
      const scale = Math.min(1, wrapW / tableW);
      setFitScale(Math.max(0.4, scale)); // never smaller than 40%
    };

    calcFitScale();
    const ro = new ResizeObserver(calcFitScale);
    ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, [autoFit, timeSlots.length]);

  const tableScale = autoFit ? fitScale : zoomLevel;

  /* ── Add time slot ─────────────────────────────────────────── */
  const handleAddTimeSlot = async () => {
    let lastEnd = '05:45 PM';
    if (timeSlots.length > 0) lastEnd = timeSlots[timeSlots.length - 1].end_time;
    const [time, mod] = lastEnd.split(' ');
    let [hh, mm] = time.split(':');
    let h = parseInt(hh);
    if (mod === 'PM' && h !== 12) h += 12;
    if (mod === 'AM' && h === 12) h = 0;
    const s = new Date(); s.setHours(h, parseInt(mm), 0, 0);
    const e = new Date(s.getTime() + 50 * 60000);
    try {
      await api.post('/time_slots', {
        start_time: s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        end_time: e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        raw_start: s.toTimeString().split(' ')[0],
        raw_end: e.toTimeString().split(' ')[0],
      });
      fetchTimeSlots();
    } catch { alert('Failed to add column'); }
  };

  /* ── Cell click ────────────────────────────────────────────── */
  const handleCellClick = async (day, slot, existing = null) => {
    const isTeacher = user?.role === 'teacher';
    const canEditRoutine = editMode && isAdmin;
    const isFreeOrCancelled = !existing || existing.is_cancelled;

    // Allow clicking if:
    // 1. Admin is in Edit Mode (to manage routine)
    // 2. Admin/Teacher clicks a FREE or CANCELLED slot (to add a custom session for today/specific date)
    if (!canEditRoutine && !((isAdmin || isTeacher) && isFreeOrCancelled)) return;

    try {
      const [sr, tr, cr] = await Promise.all([
        api.get('/subjects').catch(() => ({ data: [] })),
        api.get('/teachers').catch(() => ({ data: [] })),
        api.get('/classrooms').catch(() => ({ data: [] })),
      ]);
      setSubjects(sr.data); setTeachers(tr.data); setClassrooms(cr.data);
    } catch { }

    setSelectedSlot({ day, slot });
    
    // Determine if this click is for a one-off custom session or a routine update
    // If not in edit mode, it MUST be a custom session.
    const shouldBeCustom = !canEditRoutine;
    setIsCustomSubmit(shouldBeCustom);

    if (existing && !shouldBeCustom) {
      setEditScheduleId(existing.id);
      setFormData({
        subject_id: existing.subject_id, subject_search: existing.subject_name || '',
        teacher_id: existing.teacher_id, teacher_search: existing.teacher_name || '',
        classroom_id: existing.classroom_id, classroom_search: existing.classroom_name || '',
        camera_id: existing.camera_id || '0',
      });
    } else {
      setEditScheduleId(null);
      // Auto-fill teacher if the user is a teacher starting a custom session
      setFormData({ 
        subject_id: '', subject_search: '', 
        teacher_id: isTeacher ? user.id : '', 
        teacher_search: isTeacher ? user.name : '', 
        classroom_id: '', classroom_search: '', 
        camera_id: '0' 
      });
    }
    setIsModalOpen(true);
  };

  /* ── Submit / Delete ───────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const startTimeRaw = selectedSlot.slot.raw_start || selectedSlot.slot.rawStart;
      const endTimeRaw = selectedSlot.slot.raw_end || selectedSlot.slot.rawEnd;

      if (isCustomSubmit) {
        // ── ADD CUSTOM SESSION ──
        const dayIdx = DAYS.indexOf(selectedSlot.day);
        const targetDate = new Date(weekStart);
        targetDate.setDate(weekStart.getDate() + dayIdx);

        const parseTimeISO = (date, timeStr) => {
          const [h, m] = timeStr.split(':');
          const d = new Date(date);
          d.setHours(parseInt(h), parseInt(m), 0, 0);
          return d.toISOString();
        };

        await api.post('/sessions/start', {
          subject_id: parseInt(formData.subject_id),
          classroom_id: parseInt(formData.classroom_id),
          teacher_id: parseInt(formData.teacher_id),
          year: selectedYear,
          stream: selectedStream,
          start_time: parseTimeISO(targetDate, startTimeRaw),
          end_time: parseTimeISO(targetDate, endTimeRaw),
        });
      } else {
        // ── MANAGE ROUTINE ──
        const payload = {
          day_of_week: selectedSlot.day,
          start_time: startTimeRaw,
          end_time: endTimeRaw,
          year: selectedYear, stream: selectedStream, ...formData
        };
        if (editScheduleId) await api.put(`/schedules/${editScheduleId}`, payload);
        else await api.post('/schedules', payload);
      }
      
      setIsModalOpen(false); 
      fetchData();
    } catch (err) { 
      alert(err.response?.data?.message || 'Operation failed'); 
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('PERMANENTLY delete this class from the routine?')) return;
    try {
      await api.post('/sessions/end-by-schedule', { schedule_id: id });
      await api.delete(`/schedules/${id}`);
      fetchData();
    } catch { alert('Delete failed.'); }
  };

  const truncate = (text, len = 20) => {
    if (!text) return '';
    return text.length > len ? text.substring(0, len) + '..' : text;
  };

  /* ── Render ────────────────────────────────────────────────── */
  return (
    <div className="timetable-container animate-fade-in">

      {/* ── HEADER ── */}
      <div className="timetable-header">
        <div className="header-info">
          <h1>Class Routine</h1>
          <div className="year-selector-container">
            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="year-select-dropdown" disabled={isStudent}>
              <option value="1">1st Year</option><option value="2">2nd Year</option>
              <option value="3">3rd Year</option><option value="4">4th Year</option>
            </select>
            <select value={selectedStream} onChange={e => setSelectedStream(e.target.value)} className="year-select-dropdown" disabled={isStudent}>
              <option value="CSE">CSE</option><option value="CSBS">CSBS</option>
              <option value="ECE">ECE</option><option value="ME">ME</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
          {/* Legend */}
          <div className="legend">
            <span><span className="dot busy" />Regular</span>
            <span><span className="dot custom" />Custom</span>
            <span><span className="dot free" />Free</span>
          </div>

          {/* Controls row */}
          <div className="timetable-controls-row">
            {isAdmin && (
              <button className={`btn-edit-mode ${editMode ? 'on' : 'off'}`} onClick={() => setEditMode(!editMode)}>
                <Edit3 size={16} /> {editMode ? 'Disable Editing' : 'Enable Edit Mode'}
              </button>
            )}

            {/* Week navigation */}
            <div className="control-cluster week-nav">
              <button className="btn-control" onClick={() => setWeekOffset(p => p - 1)} title="Previous week"><ChevronLeft size={16} /></button>
              <span className="week-label">{isCurrentWeek ? 'This Week' : weekLabel}</span>
              <button className="btn-control" onClick={() => setWeekOffset(p => p + 1)} title="Next week"><ChevronRight size={16} /></button>
              {!isCurrentWeek && (
                <button className="btn-control today-btn" onClick={() => setWeekOffset(0)} title="Go to current week">Today</button>
              )}
            </div>

            {/* Column navigation */}
            {!autoFit && (
              <div className="control-cluster">
                <button className="btn-control" onClick={navColLeft} disabled={colStart === 0} title="Scroll columns left" ><ChevronLeft size={18} /></button>
                <span className="nav-counter">{colStart + 1}–{Math.min(colStart + VISIBLE_COLS, timeSlots.length)} / {timeSlots.length}</span>
                <button className="btn-control" onClick={navColRight} disabled={colStart >= maxColStart} title="Scroll columns right"><ChevronRight size={18} /></button>
              </div>
            )}

            {/* Row navigation */}
            <div className="control-cluster">
              <button className="btn-control" onClick={navRowUp} disabled={rowStart === 0} title="Scroll rows up"  ><ChevronUp size={18} /></button>
              <span className="nav-counter">{rowStart + 1}–{Math.min(rowStart + VISIBLE_ROWS, DAYS.length)} / {DAYS.length}</span>
              <button className="btn-control" onClick={navRowDown} disabled={rowStart >= maxRowStart} title="Scroll rows down"><ChevronDown size={18} /></button>
            </div>

            {/* Zoom */}
            <div className="control-cluster">
              <button className="btn-control" onClick={zoomOut} disabled={autoFit} title="Zoom out"><ZoomOut size={18} /></button>
              <button
                className={`btn-control fit-btn ${autoFit ? 'fit-active' : ''}`}
                onClick={toggleFit}
                title={autoFit ? 'Manual zoom' : 'Fit all columns'}
              >Fit</button>
              <button className="btn-control" onClick={zoomIn} disabled={autoFit} title="Zoom in" ><ZoomIn size={18} /></button>
            </div>

            {editMode && isAdmin && (
              <button className="btn-control add-col-btn" onClick={handleAddTimeSlot} title="Add time column">
                <Plus size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── GRID ── */}
      <div className={`timetable-grid-wrapper glass ${editMode ? 'edit-active' : ''}`} ref={wrapperRef}>
        <div className="timetable-scroll-area">
          <div style={tableScale < 1 ? {
            width: `${Math.round(100 / tableScale)}%`,
            height: `${Math.round(100 / tableScale)}%`,
            transformOrigin: 'top left',
            transform: `scale(${tableScale})`,
            overflow: 'visible',
          } : {
            transform: `scale(${tableScale})`,
            transformOrigin: 'top left',
          }}>
            <table
              className="timetable-grid"
            >
              <thead>
                <tr>
                  <th className="day-name corner-cell">
                    <div className="corner-label">
                      <span>Day</span>
                      <span className="corner-slash">/</span>
                      <span>Time</span>
                    </div>
                  </th>
                  {visibleSlots.map((slot, idx) => {
                    const globalIdx = autoFit ? idx : colStart + idx;
                    const col = COLUMN_COLORS[globalIdx % COLUMN_COLORS.length];
                    return (
                      <th key={idx} style={{ background: col.header }}>
                        <div className="time-header">
                          <div className="col-accent-bar" style={{ background: col.accent }} />
                          <span className="start">{slot.start_time}</span>
                          <span className="separator">↓</span>
                          <span className="end">{slot.end_time}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {visibleDays.map((day) => {
                  const isToday = isCurrentWeek && day === todayName;
                  return (
                    <tr key={day} className={isToday ? 'today-row' : ''}>
                      <td className={`day-name ${isToday ? 'today' : ''}`}>
                        <div className="day-cell-inner">
                          <span className="day-text">{day}</span>
                          {isToday && <span className="today-badge">TODAY</span>}
                        </div>
                      </td>
                      {visibleSlots.map((slot, idx) => {
                        const globalIdx = autoFit ? idx : colStart + idx;
                        const col = COLUMN_COLORS[globalIdx % COLUMN_COLORS.length];
                        const schedule = getScheduleForCell(day, slot.raw_start);
                        const custom = getCustomSessionForCell(day, slot.raw_start, slot.raw_end);
                        const isEmpty = (!schedule || schedule.is_cancelled) && !custom;

                        return (
                          <td
                            key={idx}
                            className={`slot-cell ${schedule ? 'occupied' : (custom ? 'custom-cell' : 'empty')}`}
                            style={{ background: isEmpty ? col.bg : undefined }}
                            onClick={() => handleCellClick(day, slot, schedule)}
                          >
                            <div className="slot-content-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {schedule && (
                                <div className={`schedule-card animate-scale-in ${schedule.is_cancelled ? 'cancelled-routine' : ''}`} style={{ '--card-accent': col.accent, opacity: schedule.is_cancelled ? 0.65 : 1, filter: schedule.is_cancelled ? 'grayscale(0.8)' : 'none', marginBottom: custom ? '4px' : '0' }}>
                                  <div className="card-header">
                                    <span className="subject" style={{ textDecoration: schedule.is_cancelled ? 'line-through' : 'none' }}>{truncate(schedule.subject_name)}</span>
                                    {editMode && isAdmin && (
                                      <button className="delete-sched-btn" onClick={e => handleDelete(e, schedule.id)}><Trash2 size={12} /></button>
                                    )}
                                  </div>
                                  <span className="teacher"><User size={10} /> {schedule.teacher_name}</span>
                                  <span className="room-camera"><MapPin size={10} /> {schedule.classroom_name}</span>
                                  {schedule.is_cancelled && (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.4rem' }}>
                                      <span style={{ padding: '0.15rem 0.4rem', background: '#fee2e2', color: '#ef4444', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.02em' }}>CANCELLED</span>
                                      {!custom && <span className="free-indicator-mini"><Plus size={10} /> FREE</span>}
                                    </div>
                                  )}
                                </div>
                              )}

                              {custom && (
                                <div className="schedule-card custom animate-scale-in">
                                  <div className="card-header">
                                    <span className="subject">{truncate(custom.subject_name)}</span>
                                    {editMode && isAdmin && (
                                      <button className="delete-sched-btn" onClick={async (e) => {
                                        e.stopPropagation();
                                        if (window.confirm('End this custom session?')) {
                                          setActiveSessions(p => p.filter(s => s.id !== custom.id));
                                          try { await api.post('/sessions/end', { id: custom.id }); fetchData(); }
                                          catch { alert('Failed'); fetchData(); }
                                        }
                                      }}><Trash2 size={12} /></button>
                                    )}
                                  </div>
                                  <span className="teacher"><User size={10} /> {custom.teacher_name || 'Faculty'}</span>
                                  <span className="room-camera"><MapPin size={10} /> {custom.classroom_name}</span>
                                  <span className="custom-badge">★ Custom</span>
                                </div>
                              )}

                              {!custom && (!schedule || schedule.is_cancelled) && (
                                <div className="add-indicator"><Plus size={14} /></div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── MODAL ── */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass animate-scale-in">
            <h3>{isCustomSubmit ? 'Start Custom Session' : (editScheduleId ? 'Modify Routine' : 'Assign Routine')}</h3>
            <span className="slot-info">{selectedSlot.day} | {selectedSlot.slot.start_time} {isCustomSubmit && `(${new Date(new Date(weekStart).setDate(weekStart.getDate() + DAYS.indexOf(selectedSlot.day))).toLocaleDateString('en-GB')})`}</span>
            <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
              <div className="form-group">
                <label>Subject</label>
                <select value={formData.subject_id} onChange={e => setFormData({ ...formData, subject_id: e.target.value, subject_search: e.target.options[e.target.selectedIndex].text })} required>
                  <option value="">Select Subject</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Faculty</label>
                <select value={formData.teacher_id} onChange={e => setFormData({ ...formData, teacher_id: e.target.value, teacher_search: e.target.options[e.target.selectedIndex].text })} required>
                  <option value="">Select Teacher</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Room / Lab</label>
                <select value={formData.classroom_id} onChange={e => {
                  const room = classrooms.find(c => c.id.toString() === e.target.value);
                  setFormData({ ...formData, classroom_id: e.target.value, classroom_search: room?.name || '', camera_id: room?.camera_source || '0' });
                }} required>
                  <option value="">Select Room</option>
                  {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {formData.classroom_id && (
                <div className="form-group animate-fade-in" style={{ marginTop: '0.5rem' }}>
                  <label style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 800 }}>CAMERA / SENSOR LINK</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: 'rgba(16,89,52,0.03)', borderRadius: '16px', border: '1.5px dashed rgba(16,89,52,0.2)', marginTop: '4px' }}>
                    <div style={{ width: '32px', height: '32px', background: 'white', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                      <Camera size={16} color="var(--primary)" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
                        {(() => {
                          const room = classrooms.find(c => c.id.toString() === formData.classroom_id.toString());
                          const rawId = room?.camera_url;
                          if (!rawId) return 'Hardware Internal';
                          const cam = availableCams.find(c => c.id === rawId);
                          return cam ? cam.name : `Camera Index ${rawId}`;
                        })()}
                      </span>
                      <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--primary)', opacity: 0.8 }}>Auto-detecting frames for AI analysis</span>
                    </div>
                  </div>
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Session</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timetable;
