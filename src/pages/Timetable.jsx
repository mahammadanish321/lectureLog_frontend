import React, { useState, useEffect } from 'react';
import api from '../api';
import { Calendar, Clock, Plus, Trash2, BookOpen, User, MapPin, ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, Edit3, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Timetable.css';

const Timetable = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';
  const isStudent = user?.role === 'student';

  // NAVIGATION & VIEW STATE
  const [editMode, setEditMode] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1); // 0.8 to 1.2
  const [viewportStart, setViewportStart] = useState(0); // For column navigation
  const visibleColumnCount = 6; // How many slots to show at once

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const [timeSlots, setTimeSlots] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classrooms, setClassrooms] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [editScheduleId, setEditScheduleId] = useState(null);
  const [selectedYear, setSelectedYear] = useState(user?.year?.toString() || '1');
  const [selectedStream, setSelectedStream] = useState(user?.stream || 'CSE');

  const [formData, setFormData] = useState({
    subject_id: '', subject_search: '', teacher_id: '', teacher_search: '', classroom_id: '', classroom_search: '', camera_id: '0'
  });

  const fetchTimeSlots = async () => {
    try {
      const res = await api.get('/time_slots');
      if (res.data && res.data.length > 0) {
        setTimeSlots(res.data);
      }
    } catch (err) { console.error('Failed to load time slots'); }
  };

  const fetchData = async () => {
    try {
      const [schedRes, sessRes, subRes, teacherRes, classRes] = await Promise.all([
        api.get(`/schedules?year=${selectedYear}&stream=${selectedStream}`).catch(() => ({ data: [] })),
        api.get(`/sessions?year=${selectedYear}&stream=${selectedStream}`).catch(() => ({ data: [] })),
        api.get('/subjects').catch(() => ({ data: [] })),
        api.get('/teachers').catch(() => ({ data: [] })),
        api.get('/classrooms').catch(() => ({ data: [] }))
      ]);
      setSchedules(schedRes.data);
      setActiveSessions(sessRes.data);
      setSubjects(subRes.data);
      setTeachers(teacherRes.data);
      setClassrooms(classRes.data);
    } catch (err) { console.error('Timetable data sync error'); }
  };

  useEffect(() => {
    fetchTimeSlots();
    fetchData();
  }, [selectedYear, selectedStream]);

  // NAVIGATION ACTIONS
  const navLeft = () => setViewportStart(prev => Math.max(0, prev - 1));
  const navRight = () => setViewportStart(prev => Math.min(timeSlots.length - visibleColumnCount, prev + 1));
  const zoomIn = () => setZoomLevel(prev => Math.min(1.3, prev + 0.1));
  const zoomOut = () => setZoomLevel(prev => Math.max(0.7, prev - 0.1));

  const handleAddTimeSlot = async () => {
    let lastEnd = '05:45 PM';
    if (timeSlots.length > 0) {
      lastEnd = timeSlots[timeSlots.length - 1].end_time;
    }

    const [time, modifier] = lastEnd.split(' ');
    let [hours, minutes] = time.split(':');
    let h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);
    if (modifier === 'PM' && h !== 12) h += 12;
    if (modifier === 'AM' && h === 12) h = 0;

    const startTime = new Date();
    startTime.setHours(h, m, 0, 0);
    const endTime = new Date(startTime.getTime() + 50 * 60000);

    const newSlot = {
      start_time: startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      end_time: endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      raw_start: startTime.toTimeString().split(' ')[0],
      raw_end: endTime.toTimeString().split(' ')[0]
    };

    try {
      await api.post('/time_slots', newSlot);
      fetchTimeSlots();
    } catch (err) { alert('Failed to add column'); }
  };

  const handleCellClick = (day, slot, existingSchedule = null) => {
    if (!editMode || !isAdmin) return;
    setSelectedSlot({ day, slot });
    if (existingSchedule) {
      setEditScheduleId(existingSchedule.id);
      setFormData({
        subject_id: existingSchedule.subject_id,
        subject_search: existingSchedule.subject_name || '',
        teacher_id: existingSchedule.teacher_id,
        teacher_search: existingSchedule.teacher_name || '',
        classroom_id: existingSchedule.classroom_id,
        classroom_search: existingSchedule.classroom_name || '',
        camera_id: existingSchedule.camera_id || '0'
      });
    } else {
      setEditScheduleId(null);
      setFormData({ subject_id: '', subject_search: '', teacher_id: '', teacher_search: '', classroom_id: '', classroom_search: '', camera_id: '0' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        day_of_week: selectedSlot.day,
        start_time: selectedSlot.slot.raw_start || selectedSlot.slot.rawStart,
        end_time: selectedSlot.slot.raw_end || selectedSlot.slot.rawEnd,
        year: selectedYear, stream: selectedStream, ...formData
      };
      if (editScheduleId) {
        await api.put(`/schedules/${editScheduleId}`, payload);
      } else {
        await api.post('/schedules', payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) { alert('Schedule update failed'); }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Remove this entry?')) return;
    try {
      await api.delete(`/schedules/${id}`);
      fetchData();
    } catch (err) { alert('Delete failed'); }
  };

  const getScheduleForCell = (day, startTime) => {
    return schedules.find(s => s.day_of_week === day && s.start_time.startsWith(startTime.substring(0, 5)));
  };

  const getCustomSessionForCell = (day, cellStart, cellEnd) => {
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return activeSessions.find(sess => {
      const sessStart = new Date(sess.start_time);
      if (day !== daysOfWeek[sessStart.getDay()]) return false;
      const sessStartStr = sessStart.toTimeString().split(' ')[0];
      return sessStartStr >= cellStart && sessStartStr < cellEnd;
    });
  };

  // Viewport Slicing
  const visibleSlots = timeSlots.slice(viewportStart, viewportStart + visibleColumnCount);

  return (
    <div className="timetable-container animate-fade-in">
      <div className="timetable-header">
        <div className="header-info">
          <h1>Class Routine</h1>
          <div className="year-selector-container">
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="year-select-dropdown" disabled={isStudent}>
              <option value="1">1st Year</option><option value="2">2nd Year</option><option value="3">3rd Year</option><option value="4">4th Year</option>
            </select>
            <select value={selectedStream} onChange={(e) => setSelectedStream(e.target.value)} className="year-select-dropdown" disabled={isStudent}>
              <option value="CSE">CSE</option><option value="CSBS">CSBS</option><option value="ECE">ECE</option><option value="ME">ME</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
          <div className="legend">
            <span><span className="dot busy"></span>Regular</span>
            <span><span className="dot custom"></span>Custom</span>
            <span><span className="dot free"></span>Free</span>
          </div>

          <div className="timetable-controls-row">
            {isAdmin && (
              <button className={`btn-edit-mode ${editMode ? 'on' : 'off'}`} onClick={() => setEditMode(!editMode)}>
                <Edit3 size={16} /> {editMode ? 'Disable Editing' : 'Enable Edit Mode'}
              </button>
            )}

            <div className="control-cluster">
              <button className="btn-control" onClick={navLeft} disabled={viewportStart === 0}><ChevronLeft size={18} /></button>
              <button className="btn-control" onClick={navRight} disabled={viewportStart + visibleColumnCount >= timeSlots.length}><ChevronRight size={18} /></button>
            </div>

            <div className="control-cluster">
              <button className="btn-control" onClick={zoomOut}><ZoomOut size={18} /></button>
              <button className="btn-control" onClick={zoomIn}><ZoomIn size={18} /></button>
            </div>

            {editMode && isAdmin && (
              <button className="btn-control" style={{ background: 'var(--primary)', color: 'white' }} onClick={handleAddTimeSlot} title="Add Time Column">
                <Plus size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={`timetable-grid-wrapper glass ${editMode ? 'edit-active' : ''}`}>
        <table className="timetable-grid" style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}>
          <thead>
            <tr>
              <th className="day-name">Time / Day</th>
              {visibleSlots.map((slot, index) => (
                <th key={index}>
                  <div className="time-header">
                    <span className="start">{slot.start_time}</span>
                    <span className="separator">to</span>
                    <span className="end">{slot.end_time}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day}>
                <td className="day-name">{day}</td>
                {visibleSlots.map((slot, index) => {
                  const schedule = getScheduleForCell(day, slot.raw_start);
                  const custom = getCustomSessionForCell(day, slot.raw_start, slot.raw_end);

                  return (
                    <td
                      key={index}
                      className={`slot-cell ${schedule ? 'occupied' : (custom ? 'custom' : 'empty')}`}
                      onClick={() => handleCellClick(day, slot, schedule)}
                    >
                      {schedule ? (
                        <div className="schedule-card animate-scale-in">
                          <span className="subject">{schedule.subject_name}</span>
                          <span className="teacher"><User size={10} /> {schedule.teacher_name}</span>
                          <span className="room-camera"><MapPin size={10} /> {schedule.classroom_name}</span>
                          {editMode && <button className="delete-btn" onClick={(e) => handleDelete(e, schedule.id)}><Trash2 size={12} /></button>}
                        </div>
                      ) : custom ? (
                        <div className="schedule-card custom animate-scale-in">
                          <span className="subject">{custom.subject_name}</span>
                          <span className="teacher"><User size={10} /> Faculty</span>
                        </div>
                      ) : (
                        <div className="add-indicator"><Plus size={14} /></div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass animate-scale-in">
            <h3>{editScheduleId ? 'Modify Session' : 'Assign Session'}</h3>
            <span className="slot-info">{selectedSlot.day} | {selectedSlot.slot.start_time}</span>
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
                <select value={formData.classroom_id} onChange={e => setFormData({ ...formData, classroom_id: e.target.value, classroom_search: e.target.options[e.target.selectedIndex].text })} required>
                  <option value="">Select Room</option>
                  {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
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
