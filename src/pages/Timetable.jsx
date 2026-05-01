import React, { useState, useEffect } from 'react';
import api from '../api';
import { Calendar, Clock, Plus, Trash2, BookOpen, User, MapPin, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Timetable.css';

const Timetable = () => {
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';
  const isStudent = user?.role === 'student';
  const readOnly = isTeacher || isStudent;
  
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  const defaultSlots = [
    { start: '10:15 AM', end: '11:05 AM', rawStart: '10:15:00', rawEnd: '11:05:00' },
    { start: '11:05 AM', end: '11:55 AM', rawStart: '11:05:00', rawEnd: '11:55:00' },
    { start: '11:55 AM', end: '12:45 PM', rawStart: '11:55:00', rawEnd: '12:45:00' },
    { start: '12:45 PM', end: '01:35 PM', rawStart: '12:45:00', rawEnd: '13:35:00' },
    { start: '01:35 PM', end: '02:25 PM', rawStart: '13:35:00', rawEnd: '14:25:00' },
    { start: '02:25 PM', end: '03:15 PM', rawStart: '14:25:00', rawEnd: '15:15:00' },
    { start: '03:15 PM', end: '04:05 PM', rawStart: '15:15:00', rawEnd: '16:05:00' },
    { start: '04:05 PM', end: '04:55 PM', rawStart: '16:05:00', rawEnd: '16:55:00' },
    { start: '04:55 PM', end: '05:45 PM', rawStart: '16:55:00', rawEnd: '17:45:00' }
  ];

  const [timeSlots, setTimeSlots] = useState(defaultSlots);

  const fetchTimeSlots = async () => {
    try {
      const res = await api.get('/time_slots');
      if (res.data && res.data.length > 0) {
        setTimeSlots(res.data);
      }
    } catch (err) {
      console.error('Failed to load time slots:', err);
    }
  };

  const handleAddTimeSlot = async () => {
    let lastEnd = '05:45 PM';
    if (timeSlots.length > 0) {
      lastEnd = timeSlots[timeSlots.length - 1].end_time || timeSlots[timeSlots.length - 1].end;
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
    } catch (err) {
      alert('Failed to save new time slot column.');
    }
  };

  const handleDeleteTimeSlot = async (index) => {
    const targetSlot = timeSlots[index];
    if (!targetSlot || !targetSlot.id) return;

    if (window.confirm('Are you sure you want to delete this time slot column?')) {
      try {
        await api.delete(`/time_slots/${targetSlot.id}`);
        fetchTimeSlots();
      } catch (err) {
        alert('Failed to remove time slot column.');
      }
    }
  };

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
    subject_id: '',
    subject_search: '',
    teacher_id: '',
    teacher_search: '',
    classroom_id: '',
    classroom_search: '',
    camera_id: '0' // Default local camera
  });

  useEffect(() => {
    const fetchProfileAndSet = async () => {
      if (isStudent) {
        try {
          const res = await api.get('/students/me');
          if (res.data.year) setSelectedYear(res.data.year.toString());
          if (res.data.stream) setSelectedStream(res.data.stream);
        } catch (err) {
          console.error('Failed to fetch real-time student profile:', err);
          // Fallback to cached context user info
          if (user?.year) setSelectedYear(user.year.toString());
          if (user?.stream) setSelectedStream(user.stream);
        }
      }
    };
    fetchProfileAndSet();
  }, [isStudent]);

  useEffect(() => {
    fetchTimeSlots();
    fetchData();
  }, [selectedYear, selectedStream]);

  const fetchData = async () => {
    try {
      const schedRes = await api.get(`/schedules?year=${selectedYear}&stream=${selectedStream}`).catch(() => ({ data: [] }));
      const sessionRes = await api.get(`/sessions?year=${selectedYear}&stream=${selectedStream}`).catch(() => ({ data: [] }));
      const subRes = await api.get('/subjects').catch(() => ({ data: [] }));
      const teacherRes = await api.get('/teachers').catch(() => ({ data: [] }));
      const classRes = await api.get('/classrooms').catch(() => ({ data: [] }));

      setSchedules(schedRes.data);
      setActiveSessions(sessionRes.data);
      setSubjects(subRes.data);
      setTeachers(teacherRes.data);
      setClassrooms(classRes.data);
    } catch (err) {
      console.error('Error fetching timetable data:', err);
    }
  };

  const handleCellClick = (day, slot, existingSchedule = null) => {
    if (readOnly) return; // Prevent teachers and students from editing routing
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
      setFormData({
        subject_id: '',
        subject_search: '',
        teacher_id: '',
        teacher_search: '',
        classroom_id: '',
        classroom_search: '',
        camera_id: '0'
      });
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to remove this class from the routine?')) return;
    try {
      await api.delete(`/schedules/${id}`);
      fetchData();
    } catch (err) {
      alert('Failed to delete schedule: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject_id) {
      alert('Please select a valid subject from the dropdown list.');
      return;
    }
    if (!formData.teacher_id) {
      alert('Please select a valid teacher from the dropdown list.');
      return;
    }
    if (!formData.classroom_id) {
      alert('Please select a valid Room / Lab from the dropdown list.');
      return;
    }
    
    try {
      const payload = {
        day_of_week: selectedSlot.day,
        start_time: selectedSlot.slot.raw_start || selectedSlot.slot.rawStart,
        end_time: selectedSlot.slot.raw_end || selectedSlot.slot.rawEnd,
        year: selectedYear,
        stream: selectedStream,
        ...formData
      };

      if (editScheduleId) {
        await api.put(`/schedules/${editScheduleId}`, payload);
      } else {
        await api.post('/schedules', payload);
      }
      
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      alert('Failed to add schedule: ' + (err.response?.data?.message || err.message));
    }
  };

  const getScheduleForCell = (day, startTime) => {
    return schedules.find(s => 
      s.day_of_week === day && 
      s.start_time.startsWith(startTime.substring(0, 5)) &&
      !s.is_cancelled
    );
  };

  const getCustomSessionForCell = (day, cellStart, cellEnd) => {
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return activeSessions.filter(sess => sess.status !== 'ended' && sess.status !== 'cancelled').find(sess => {
      const sessStart = new Date(sess.start_time);
      const sessDay = daysOfWeek[sessStart.getDay()];
      
      if (day !== sessDay) return false;

      const sessEnd = new Date(sess.end_time);
      const sessStartStr = sessStart.toTimeString().split(' ')[0];
      const sessEndStr = sessEnd.toTimeString().split(' ')[0];

      return (sessStartStr <= cellStart && sessEndStr >= cellEnd) || 
             (sessStartStr >= cellStart && sessStartStr < cellEnd) ||
             (sessEndStr > cellStart && sessEndStr <= cellEnd);
    });
  };

  return (
    <div className="timetable-container animate-fade-in">
      <div className="timetable-header">
        <div className="header-info">
          <h1>Class Routine</h1>
          <p>Manage weekly lecture schedules and assignments</p>
          <div className="year-selector-container">
            <label>Select Year:</label>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(e.target.value)}
              className="year-select-dropdown"
              disabled={isStudent}
            >
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
            </select>
            <label style={{ marginLeft: '1rem' }}>Stream:</label>
            <select 
              value={selectedStream} 
              onChange={(e) => setSelectedStream(e.target.value)}
              className="year-select-dropdown"
              disabled={isStudent}
            >
              <option value="CSE">CSE</option>
              <option value="CSBS">CSBS</option>
              <option value="ECE">ECE</option>
              <option value="ME">ME</option>
              <option value="CE">CE</option>
              <option value="EE">EE</option>
            </select>
          </div>
        </div>
        <div className="legend">
        <span><span className="dot busy"></span>Regular Class</span>
        <span><span className="dot custom"></span>Custom Class</span>
        <span><span className="dot free"></span>Free Slot</span>
      </div>
      </div>

      <div className="timetable-grid-wrapper glass">
        <table className="timetable-grid">
          <thead>
            <tr>
              <th className="sticky-col">Time / Day</th>
              {timeSlots.map((slot, index) => (
                <th key={index} style={{ position: 'relative' }}>
                  <div className="time-header">
                    <span className="start">{slot.start_time || slot.start}</span>
                    <span className="separator">-</span>
                    <span className="end">{slot.end_time || slot.end}</span>
                  </div>
                  {!readOnly && (
                    <button 
                      onClick={() => handleDeleteTimeSlot(index)}
                      style={{ position: 'absolute', top: '4px', right: '4px', background: 'transparent', border: 'none', color: 'rgba(239, 68, 68, 0.6)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Delete time slot"
                    >
                      <X size={12} />
                    </button>
                  )}
                </th>
              ))}
              {!readOnly && (
                <th style={{ width: '50px', padding: 0 }}>
                  <button 
                    onClick={handleAddTimeSlot} 
                    style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', color: '#fff', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 'auto', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}
                    title="Add time slot"
                  >
                    <Plus size={16} />
                  </button>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day}>
                <td className="day-name sticky-col">{day}</td>
                {timeSlots.map((slot, index) => {
                  const schedule = getScheduleForCell(day, slot.raw_start || slot.rawStart);
                  const customSession = getCustomSessionForCell(day, slot.raw_start || slot.rawStart, slot.raw_end || slot.rawEnd);
                  const isCustomCancelled = customSession?.status === 'cancelled';
                  
                  return (
                    <td 
                      key={index} 
                      className={`slot-cell ${schedule ? 'occupied' : (customSession ? 'custom' : 'empty')} ${readOnly ? 'read-only' : ''}`}
                      onClick={() => !readOnly && !customSession && handleCellClick(day, slot, schedule)}
                    >
                      {schedule ? (
                        <div className="schedule-card animate-scale-in">
                          <span className="subject">{schedule.subject_name}</span>
                          <span className="teacher">
                            <User size={10} /> {schedule.teacher_name}
                          </span>
                          <span className="room-camera" style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                            <MapPin size={10} /> {schedule.classroom_name} (Cam: {schedule.camera_id})
                          </span>
                          {!readOnly && (
                            <button 
                              className="delete-btn" 
                              onClick={(e) => handleDelete(e, schedule.id)}
                              title="Remove class"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      ) : customSession ? (
                        <div className="schedule-card custom animate-scale-in">
                          <span className="subject">{customSession.subject_name}</span>
                          <span className="teacher">
                            <User size={10} /> {customSession.teacher_name || 'Custom Session'}
                          </span>
                          <span className="room-camera" style={{ fontSize: '0.65rem', color: 'rgba(28, 25, 23, 0.6)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                            <MapPin size={10} /> {customSession.classroom_name || 'Room N/A'}
                          </span>
                          {!readOnly && (
                            <button 
                              className="delete-btn" 
                              onClick={(e) => handleDelete(e, customSession.id)}
                              title="Remove custom session"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      ) : (
                        !readOnly && (
                          <div className="add-indicator">
                            <Plus size={14} />
                          </div>
                        )
                      )}
                    </td>
                  );
                })}
                {!readOnly && <td style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content glass animate-scale-in">
            <h3>{editScheduleId ? 'Update Class' : 'Assign Class'}</h3>
            <p className="slot-info">
              {selectedSlot.day} • {selectedSlot.slot.start} - {selectedSlot.slot.end}
            </p>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Subject</label>
                <input 
                  list="subjects-list"
                  required 
                  placeholder="Type to search subject..."
                  value={formData.subject_search}
                  onChange={(e) => {
                    const val = e.target.value;
                    const searchVal = val.trim().toLowerCase();
                    const found = subjects.find(s => {
                      const codeMatch = s.code && s.code.trim().toLowerCase() === searchVal;
                      const nameMatch = s.name && s.name.trim().toLowerCase() === searchVal;
                      const fullMatch = s.code && `${s.code.trim().toLowerCase()} - ${s.name.trim().toLowerCase()}` === searchVal;
                      return codeMatch || nameMatch || fullMatch;
                    });
                    setFormData({
                      ...formData, 
                      subject_search: val,
                      subject_id: found ? found.id : ''
                    });
                  }}
                  className="searchable-input"
                />
                <datalist id="subjects-list">
                  {subjects.map(s => (
                    <option key={s.id} value={s.code ? `${s.code} - ${s.name}` : s.name} />
                  ))}
                </datalist>
              </div>
              <div className="form-group">
                <label>Teacher</label>
                <input 
                  list="teachers-list"
                  required 
                  placeholder="Type to search teacher..."
                  value={formData.teacher_search}
                  onChange={(e) => {
                    const val = e.target.value;
                    const searchVal = val.trim().toLowerCase();
                    const found = teachers.find(t => {
                      const nameMatch = t.name && t.name.trim().toLowerCase() === searchVal;
                      return nameMatch;
                    });
                    setFormData({
                      ...formData, 
                      teacher_search: val,
                      teacher_id: found ? found.id : ''
                    });
                  }}
                  className="searchable-input"
                />
                <datalist id="teachers-list">
                  {teachers.map(t => (
                    <option key={t.id} value={t.name} />
                  ))}
                </datalist>
              </div>
              <div className="form-row" style={{ marginTop: '1rem' }}>
                <div className="form-group">
                  <label>Room / Lab</label>
                  <input 
                    list="classrooms-list"
                    required 
                    placeholder="Type to search room..."
                    value={formData.classroom_search}
                    onChange={(e) => {
                      const val = e.target.value;
                      const searchVal = val.trim().toLowerCase();
                      const found = classrooms.find(c => c.name.toLowerCase() === searchVal);
                      
                      const cameras = found?.camera_url ? found.camera_url.split(',').map(s => s.trim()) : [];
                      
                      setFormData({
                        ...formData, 
                        classroom_search: val,
                        classroom_id: found ? found.id : '',
                        camera_id: cameras.length > 0 ? cameras[0] : ''
                      });
                    }}
                    className="searchable-input"
                  />
                  <datalist id="classrooms-list">
                    {classrooms.map(c => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>
                </div>
                <div className="form-group">
                  <label>Camera ID</label>
                  {(() => {
                    const selectedClassroom = classrooms.find(c => c.id.toString() === formData.classroom_id?.toString());
                    const cameras = selectedClassroom?.camera_url ? selectedClassroom.camera_url.split(',').map(s => s.trim()) : [];
                    
                    if (cameras.length > 0) {
                      return (
                        <select 
                          value={formData.camera_id}
                          onChange={(e) => setFormData({...formData, camera_id: e.target.value})}
                          required
                        >
                          {cameras.map((cam, i) => (
                            <option key={i} value={cam}>{cam}</option>
                          ))}
                        </select>
                      );
                    }
                    
                    return (
                      <input 
                        type="text" 
                        placeholder="Select a room first"
                        value={formData.camera_id}
                        disabled
                        required
                      />
                    );
                  })()}
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editScheduleId ? 'Update Slot' : 'Save Slot'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timetable;
