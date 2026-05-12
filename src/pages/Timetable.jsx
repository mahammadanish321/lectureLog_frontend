import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import {
  Calendar, Clock, Plus, Trash2, User, MapPin,
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  ZoomIn, ZoomOut, Edit3, Camera, CheckCircle2, XCircle, Loader2
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

const formatISODate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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
  const [studentAttendance, setStudentAttendance] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [attendanceModal, setAttendanceModal] = useState({ open: false, loading: false, records: [], filter: 'present', title: '' });
  const [isCustomSubmit, setIsCustomSubmit] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [editScheduleId, setEditScheduleId] = useState(null);
  const [selectedYear, setSelectedYear] = useState(user?.year?.toString() || '1');
  const [selectedStream, setSelectedStream] = useState(user?.stream || 'CSE');
  const [formData, setFormData] = useState({
    subject_id: '', subject_search: '', teacher_id: '', teacher_search: '',
    classroom_id: '', classroom_search: '', camera_id: '0'
  });
  const [slotEditModal, setSlotEditModal] = useState({ open: false, slot: null, start: '', end: '' });

  // Sync with user profile once loaded
  useEffect(() => {
    if (user?.year) setSelectedYear(user.year.toString());
    if (user?.stream) setSelectedStream(user.stream);
  }, [user]);

  const wrapperRef = useRef(null);

  /* ── Visible counts (only used when not auto-fitting) ──────── */
  const VISIBLE_COLS = 6;
  const VISIBLE_ROWS = 7; // show all 7 days at once normally

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  /* ── Derived ───────────────────────────────────────────────── */
  const weekStart = getWeekStart(weekOffset);
  const weekLabel = formatWeekLabel(weekStart);
  const isCurrentWeek = weekOffset === 0;
  const istNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const todayName = DAYS[((istNow.getDay() + 6) % 7)]; // Mon=0
  const currentTimeStr = istNow.toLocaleTimeString('en-GB', { hour12: false }).substring(0, 5); // HH:MM

  // Auto-scroll to current time slot
  useEffect(() => {
    if (isCurrentWeek && timeSlots.length > 0) {
      setTimeout(() => {
        const activeCol = wrapperRef.current?.querySelector('.current-time-col');
        if (activeCol) {
          activeCol.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }, 500);
    }
  }, [isCurrentWeek, timeSlots.length, weekOffset]);

  /* ── Fetch helpers ─────────────────────────────────────────── */
  const fetchTimeSlots = async () => {
    try {
      const res = await api.get('/time_slots');
      if (res.data?.length > 0) {
        // Sort chronologically by raw_start
        const sorted = [...res.data].sort((a, b) => (a.raw_start || '').localeCompare(b.raw_start || ''));
        setTimeSlots(sorted);
      }
    } catch (err) {
      console.error('[Timetable] Failed to fetch time slots:', err);
    }
  };

  const handleEditTimeSlot = (slot) => {
    setSlotEditModal({ open: true, slot, start: slot.start_time, end: slot.end_time });
  };

  const handleSaveEditedSlot = async (e) => {
    e.preventDefault();
    const { slot, start, end } = slotEditModal;
    
    // Convert to raw time (HH:MM:SS)
    const convertToRaw = (timeStr) => {
      const [time, mod] = timeStr.split(' ');
      let [hh, mm] = time.split(':');
      let h = parseInt(hh);
      if (mod === 'PM' && h !== 12) h += 12;
      if (mod === 'AM' && h === 12) h = 0;
      return `${h.toString().padStart(2, '0')}:${mm.padStart(2, '0')}:00`;
    };

    try {
      await api.put(`/time_slots/${slot.id}`, {
        start_time: start,
        end_time: end,
        raw_start: convertToRaw(start),
        raw_end: convertToRaw(end)
      });
      setSlotEditModal({ open: false, slot: null, start: '', end: '' });
      fetchTimeSlots();
    } catch { alert('Failed to update time slot'); }
  };

  const handleDeleteTimeSlot = async (slotId) => {
    if (!window.confirm('Are you sure you want to delete this entire time column? All classes in this slot across all days will be hidden.')) return;
    try {
      await api.delete(`/time_slots/${slotId}`);
      fetchTimeSlots();
    } catch { alert('Failed to delete time slot'); }
  };

  const fetchData = async () => {
    try {
      const weekStartParam = formatISODate(weekStart);
      const [schedRes, sessRes, subRes, teacherRes, classRes] = await Promise.all([
        api.get(`/schedules?year=${selectedYear}&stream=${selectedStream}&week_start=${weekStartParam}`).catch(() => ({ data: [] })),
        api.get(`/sessions?year=${selectedYear}&stream=${selectedStream}&week_start=${weekStartParam}`).catch(() => ({ data: [] })),
        api.get('/subjects').catch(() => ({ data: [] })),
        api.get('/teachers').catch(() => ({ data: [] })),
        api.get('/classrooms').catch(() => ({ data: [] })),
      ]);
      setSchedules(schedRes.data);
      setActiveSessions(sessRes.data);
      setSubjects(subRes.data);
      setTeachers(teacherRes.data);
      setClassrooms(classRes.data);

      if (isStudent) {
        const attRes = await api.get('/students/my-attendance').catch(() => ({ data: [] }));
        setStudentAttendance(attRes.data || []);
      } else {
        setStudentAttendance([]);
      }
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
  }, [selectedYear, selectedStream, weekOffset]);

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
  const getSchedulesForCell = (day, rawStart) =>
    schedules
      .filter(s => s.day_of_week === day && s.start_time.startsWith(rawStart.substring(0, 5)))
      .sort((a, b) => Number(a.is_deleted_history || a.is_cancelled) - Number(b.is_deleted_history || b.is_cancelled));

  const getEditableSchedule = (cellSchedules) =>
    cellSchedules.find(s => !s.is_snapshot_history && !s.is_deleted_history && !s.is_cancelled) || cellSchedules[0] || null;


  const getCustomSessionForCell = (day, cellStart, cellEnd) => {
    const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const wEnd = new Date(weekStart);
    wEnd.setDate(weekStart.getDate() + 6);
    wEnd.setHours(23, 59, 59, 999);

    return activeSessions.find(sess => {
      if (!sess.is_custom || !sess.start_time) return false;
      const parts = sess.start_time.split('T');
      if (parts.length !== 2) return false;
      
      const datePart = parts[0];
      const timePart = parts[1].split('.')[0];
      
      const [y, m, d] = datePart.split('-');
      const sDate = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
      
      if (sDate < weekStart || sDate > wEnd) return false;
      if (DOW[sDate.getDay()] !== day) return false;
      
      return timePart >= cellStart && timePart < cellEnd;
    });
  };

  const getDateForDay = (day) => {
    const target = new Date(weekStart);
    target.setDate(weekStart.getDate() + DAYS.indexOf(day));
    target.setHours(0, 0, 0, 0);
    return target;
  };

  const getRoutineSessionForCell = (schedule, day, cellStart) => {
    if (!schedule || schedule.is_cancelled || schedule.is_deleted_history) return null;
    const targetDate = getDateForDay(day).toDateString();
    return activeSessions.find(sess => {
      if (sess.is_custom || String(sess.id).startsWith('routine_')) return false;
      if (String(sess.subject_id) !== String(schedule.subject_id)) return false;
      if (String(sess.teacher_id) !== String(schedule.teacher_id)) return false;
      if (String(sess.classroom_id) !== String(schedule.classroom_id)) return false;
      const start = new Date(sess.start_time);
      if (start.toDateString() !== targetDate) return false;
      return start.toTimeString().split(' ')[0].startsWith(cellStart.substring(0, 5));
    });
  };

  const isPastSlot = (day, rawEnd) => {
    const end = getDateForDay(day);
    const [h, m] = rawEnd.split(':');
    end.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
    return new Date() > end;
  };

  const getAttendanceSession = (schedule, custom, day, slot) => {
    if (custom && !String(custom.id).startsWith('routine_')) return custom;
    return getRoutineSessionForCell(schedule, day, slot.raw_start);
  };

  const canCheckAttendance = (schedule, custom, day, slot) => {
    if (schedule?.is_cancelled || schedule?.is_deleted_history || custom?.status === 'cancelled') return false;
    const session = getAttendanceSession(schedule, custom, day, slot);
    if (!session) return false;
    return session.status === 'ended' || isPastSlot(day, slot.raw_end);
  };

  const getStudentAttendanceState = (schedule, custom, day, slot) => {
    if (!isStudent) return null;
    if (schedule?.is_cancelled || schedule?.is_deleted_history || custom?.status === 'cancelled') {
      return { status: 'cancelled' };
    }
    if (!isPastSlot(day, slot.raw_end)) return null;

    const session = getAttendanceSession(schedule, custom, day, slot);
    const targetDate = getDateForDay(day).toDateString();
    const present = studentAttendance.some(att => {
      if (session && String(att.session_id) === String(session.id)) return att.status === 'present';
      
      const attFullDate = new Date(att.start_time || att.marked_at);
      if (attFullDate.toDateString() !== targetDate) return false;
      if (String(att.subject_id) !== String((custom || schedule)?.subject_id)) return false;
      if (att.status !== 'present') return false;

      // Time matching fallback (within 45 minutes of slot start)
      const [slotH, slotM] = slot.raw_start.split(':');
      const slotMins = parseInt(slotH) * 60 + parseInt(slotM);
      const attMins = attFullDate.getHours() * 60 + attFullDate.getMinutes();
      return Math.abs(slotMins - attMins) < 45;
    });
    return { status: present ? 'present' : 'absent' };
  };

  const openAttendanceModal = async (session, title) => {
    if (!session || String(session.id).startsWith('routine_')) {
      alert('No completed session record exists for this class yet.');
      return;
    }
    setAttendanceModal({ open: true, loading: true, records: [], filter: 'present', title });
    try {
      const res = await api.get(`/attendance/session/${session.id}?include_absent=true`);
      setAttendanceModal({ open: true, loading: false, records: res.data || [], filter: 'present', title });
    } catch (err) {
      setAttendanceModal({ open: true, loading: false, records: [], filter: 'present', title });
    }
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
    // REQUIRE EDIT MODE FOR ALL CLICKS
    if (!editMode) return;

    const isTeacher = user?.role === 'teacher';
    const isAdmin = user?.role === 'admin';
    const isFreeOrCancelled = !existing || existing.is_cancelled || existing.is_deleted_history;

    try {
      const [sr, tr, cr] = await Promise.all([
        api.get('/subjects').catch(() => ({ data: [] })),
        api.get('/teachers').catch(() => ({ data: [] })),
        api.get('/classrooms').catch(() => ({ data: [] })),
      ]);
      setSubjects(sr.data); setTeachers(tr.data); setClassrooms(cr.data);
    } catch { }

    setSelectedSlot({ day, slot });

    // For Admins on the Routine page, default to Regular Routine unless it's a teacher starting a one-off.
    // If Admin clicks, we assume they want to manage the template.
    const shouldBeCustom = isTeacher; 
    setIsCustomSubmit(shouldBeCustom);

    if (existing && !shouldBeCustom && !existing.is_snapshot_history && !existing.is_cancelled && !existing.is_deleted_history) {
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

  const handleDelete = async (e, schedule) => {
    e.stopPropagation();
    const id = schedule.id;
    const isTeacher = user?.role === 'teacher';
    const isAdmin = user?.role === 'admin';
    
    if (isTeacher) {
      const pass = window.prompt('Enter your Password to cancel this class for this week:');
      if (!pass) return;
      try {
        const cancelDate = formatISODate(getDateForDay(schedule.day_of_week));
        await api.post(`/schedules/${id}/cancel`, { 
          password: pass,
          cancel_date: cancelDate,
          week_start: formatISODate(weekStart)
        });
        fetchData();
      } catch (err) { 
        alert(err.response?.data?.message || 'Cancel failed.'); 
      }
    } else if (isAdmin) {
      if (!window.confirm('Delete this class from the routine? This week will keep a cancelled history card.')) return;
      try {
        await api.post('/sessions/end-by-schedule', { schedule_id: id });
        await api.delete(`/schedules/${id}?week_start=${formatISODate(weekStart)}`);
        fetchData();
      } catch { alert('Delete failed.'); }
    }
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
            <span><span className="dot cancelled" />Cancelled</span>
            <span><span className="dot free" />Free</span>
          </div>

          {/* Controls row */}
          <div className="timetable-controls-row">
            {(isAdmin || isTeacher) && (
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
                    const isCurrentSlot = isCurrentWeek && currentTimeStr >= slot.raw_start.substring(0, 5) && currentTimeStr < slot.raw_end.substring(0, 5);

                    return (
                      <th key={idx} style={{ background: col.header, position: 'relative' }} className={isCurrentSlot ? 'current-time-col' : ''}>
                        <div className="time-header">
                          <div className="col-accent-bar" style={{ background: col.accent }} />
                          <span className="start">{slot.start_time}</span>
                          <span className="separator">↓</span>
                          <span className="end">{slot.end_time}</span>
                          
                          {editMode && isAdmin && (
                            <div className="slot-mgmt-overlay">
                              <button onClick={() => handleEditTimeSlot(slot)} className="slot-mgmt-btn edit"><Edit3 size={10} /></button>
                              <button onClick={() => handleDeleteTimeSlot(slot.id)} className="slot-mgmt-btn delete"><Trash2 size={10} /></button>
                            </div>
                          )}
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
                        const isCurrentSlot = isCurrentWeek && currentTimeStr >= slot.raw_start.substring(0, 5) && currentTimeStr < slot.raw_end.substring(0, 5);
                        const cellSchedules = getSchedulesForCell(day, slot.raw_start);
                        const schedule = getEditableSchedule(cellSchedules);
                        const custom = getCustomSessionForCell(day, slot.raw_start, slot.raw_end);
                        const isEmpty = cellSchedules.every(s => s.is_cancelled || s.is_deleted_history) && !custom;
                        const attendanceSession = getAttendanceSession(schedule, custom, day, slot);
                        const showAttendanceButton = !isStudent && canCheckAttendance(schedule, custom, day, slot);
                        const studentState = getStudentAttendanceState(schedule, custom, day, slot);

                        return (
                          <td
                            key={idx}
                            className={`slot-cell ${cellSchedules.length ? 'occupied' : (custom ? 'custom-cell' : 'empty')} ${isCurrentSlot ? 'current-time-col' : ''}`}
                            style={{ background: isEmpty ? col.bg : undefined }}
                            onClick={() => handleCellClick(day, slot, schedule)}
                          >
                            <div className="slot-content-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {cellSchedules.map(schedule => (
                                <div key={`${schedule.source_type || 'regular'}-${schedule.id}`} className={`schedule-card animate-scale-in ${schedule.is_cancelled || schedule.is_deleted_history ? 'cancelled-routine' : ''}`} style={{ '--card-accent': col.accent, marginBottom: custom ? '4px' : '0' }}>
                                  <div className="card-header">
                                    <span className="subject" style={{ textDecoration: schedule.is_cancelled || schedule.is_deleted_history ? 'line-through' : 'none' }}>{truncate(schedule.subject_name)}</span>
                                    {editMode && !schedule.is_snapshot_history && !schedule.is_deleted_history && (isAdmin || (isTeacher && schedule.teacher_id === user?.id)) && (
                                      <button className="delete-sched-btn" onClick={e => handleDelete(e, schedule)}><Trash2 size={12} /></button>
                                    )}
                                  </div>
                                  <span className="teacher"><User size={10} /> {schedule.teacher_name}</span>
                                  <span className="room-camera"><MapPin size={10} /> {schedule.classroom_name}</span>
                                  {(schedule.is_cancelled || schedule.is_deleted_history) && (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.4rem' }}>
                                      <span style={{ padding: '0.15rem 0.4rem', background: '#fee2e2', color: '#ef4444', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.02em' }}>CANCELLED</span>
                                      {!custom && <span className="free-indicator-mini"><Plus size={10} /> FREE</span>}
                                    </div>
                                  )}
                                  {studentState && !custom && !schedule.is_cancelled && !schedule.is_deleted_history && (
                                    <span className={`student-attendance-chip ${studentState.status}`}>
                                      {studentState.status === 'present' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                    </span>
                                  )}
                                </div>
                              ))}

                              {custom && (
                                <div className={`schedule-card custom animate-scale-in ${custom.status === 'cancelled' ? 'cancelled-routine' : ''}`}>
                                  <div className="card-header">
                                    <span className="subject" style={{ textDecoration: custom.status === 'cancelled' ? 'line-through' : 'none' }}>{truncate(custom.subject_name)}</span>
                                    {editMode && custom.status !== 'cancelled' && (isAdmin || (isTeacher && custom.teacher_id === user?.id)) && (
                                      <button className="delete-sched-btn" onClick={async (e) => {
                                        e.stopPropagation();
                                        if (window.confirm('Cancel this custom session?')) {
                                          try { await api.post('/sessions/cancel', { id: custom.id }); fetchData(); }
                                          catch { alert('Failed'); fetchData(); }
                                        }
                                      }}><Trash2 size={12} /></button>
                                    )}
                                  </div>
                                  <span className="teacher"><User size={10} /> {custom.teacher_name || 'Faculty'}</span>
                                  <span className="room-camera"><MapPin size={10} /> {custom.classroom_name}</span>
                                  <span className="custom-badge">{custom.status === 'cancelled' ? 'Cancelled Custom' : custom.status === 'ended' ? 'Completed Custom' : 'Custom'}</span>
                                  {studentState && (
                                    <span className={`student-attendance-chip ${studentState.status}`}>
                                      {studentState.status === 'present' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                    </span>
                                  )}
                                </div>
                              )}

                              {showAttendanceButton && (
                                <button
                                  className="attendance-hover-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openAttendanceModal(attendanceSession, (custom || schedule)?.subject_name || 'Class Attendance');
                                  }}
                                >
                                  Check Attendance
                                </button>
                              )}

                              {!custom && (!schedule || schedule.is_cancelled || schedule.is_deleted_history) && (
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
                          if (!room) return 'Select a classroom';
                          
                          // Prioritize the name saved in the database during initialization
                          if (room.camera_name) return room.camera_name;
                          
                          // Fallback to browser detection if database name is missing
                          const rawId = room.camera_url;
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
                <button type="submit" className="btn-primary">
                  {isCustomSubmit ? 'Start Session' : (editScheduleId ? 'Update Routine' : 'Save to Routine')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {attendanceModal.open && (
        <div className="modal-overlay" onClick={() => setAttendanceModal(p => ({ ...p, open: false }))}>
          <div className="modal-content glass attendance-modal animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="attendance-modal-header">
              <div>
                <h3>Class Attendance</h3>
                <span className="slot-info">{attendanceModal.title}</span>
              </div>
              <button className="modal-icon-close" onClick={() => setAttendanceModal(p => ({ ...p, open: false }))}>
                <XCircle size={20} />
              </button>
            </div>

            <div className="attendance-filter-row">
              {['present', 'absent'].map(filter => (
                <button
                  key={filter}
                  className={`attendance-filter-btn ${attendanceModal.filter === filter ? 'active' : ''}`}
                  onClick={() => setAttendanceModal(p => ({ ...p, filter }))}
                >
                  {filter === 'present' ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                  {filter === 'present' ? 'Present' : 'Absent'}
                </button>
              ))}
            </div>

            {attendanceModal.loading ? (
              <div className="attendance-loading"><Loader2 className="animate-spin" size={28} /></div>
            ) : (
              <div className="attendance-roster">
                {attendanceModal.records
                  .filter(rec => rec.status === attendanceModal.filter)
                  .map(rec => (
                    <div key={rec.student_id || rec.id} className="attendance-roster-row">
                      <img
                        className="attendance-avatar"
                        src={rec.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(rec.student_name || 'Student')}`}
                        alt={rec.student_name}
                      />
                      <div className="attendance-student-info">
                        <strong>{rec.student_name}</strong>
                        <span>{rec.roll_number || 'No roll'} · {rec.email}</span>
                      </div>
                      <div className="attendance-time">
                        {rec.marked_at ? new Date(rec.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                      </div>
                      <span className={`attendance-status-icon ${rec.status}`}>
                        {rec.status === 'present' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                      </span>
                    </div>
                  ))}
                {attendanceModal.records.filter(rec => rec.status === attendanceModal.filter).length === 0 && (
                  <div className="attendance-empty">No {attendanceModal.filter} students found.</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {slotEditModal.open && (
        <div className="modal-overlay">
          <div className="modal-content glass animate-scale-in" style={{ maxWidth: '400px' }}>
            <h3>Edit Time Slot</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.5rem' }}>Update the duration for this routine column.</p>
            <form onSubmit={handleSaveEditedSlot}>
              <div className="form-group">
                <label>Start Time (e.g. 09:05 AM)</label>
                <input 
                  type="text" 
                  value={slotEditModal.start} 
                  onChange={e => setSlotEditModal({ ...slotEditModal, start: e.target.value })}
                  placeholder="09:05 AM"
                  required 
                />
              </div>
              <div className="form-group">
                <label>End Time (e.g. 09:55 AM)</label>
                <input 
                  type="text" 
                  value={slotEditModal.end} 
                  onChange={e => setSlotEditModal({ ...slotEditModal, end: e.target.value })}
                  placeholder="09:55 AM"
                  required 
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setSlotEditModal({ open: false, slot: null, start: '', end: '' })}>Cancel</button>
                <button type="submit" className="btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timetable;
