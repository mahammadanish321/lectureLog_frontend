import React, { useState, useEffect } from 'react';
import api from '../api';
import { Calendar, Clock, Plus, Trash2, BookOpen, User, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import './Timetable.css';

const Timetable = () => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // Generate 50-minute slots from 10:15 AM to 05:45 PM
  const timeSlots = [];
  let startTime = new Date();
  startTime.setHours(10, 15, 0);

  for (let i = 0; i < 9; i++) {
    const end = new Date(startTime.getTime() + 50 * 60000);
    timeSlots.push({
      start: startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      end: end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      rawStart: startTime.toTimeString().split(' ')[0],
      rawEnd: end.toTimeString().split(' ')[0]
    });
    startTime = end;
  }

  const [schedules, setSchedules] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedYear, setSelectedYear] = useState('1');
  const [formData, setFormData] = useState({
    subject_id: '',
    teacher_id: '',
    classroom_id: '',
    camera_id: '0' // Default local camera
  });

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  const fetchData = async () => {
    try {
      const [schedRes, subRes, teacherRes, classRes] = await Promise.all([
        api.get(`/schedules?year=${selectedYear}`),
        api.get('/subjects'),
        api.get('/teachers'),
        api.get('/classrooms')
      ]);
      setSchedules(schedRes.data);
      setSubjects(subRes.data);
      setTeachers(teacherRes.data);
      setClassrooms(classRes.data);
    } catch (err) {
      console.error('Error fetching timetable data:', err);
    }
  };

  const handleCellClick = (day, slot) => {
    setSelectedSlot({ day, slot });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/schedules', {
        day_of_week: selectedSlot.day,
        start_time: selectedSlot.slot.rawStart,
        end_time: selectedSlot.slot.rawEnd,
        year: selectedYear,
        ...formData
      });
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      alert('Failed to add schedule: ' + err.message);
    }
  };

  const getScheduleForCell = (day, startTime) => {
    return schedules.find(s => s.day_of_week === day && s.start_time.startsWith(startTime.substring(0, 5)));
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
            >
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
            </select>
          </div>
        </div>
        <div className="legend">
          <span className="dot busy"></span> Occupied
          <span className="dot free"></span> Free Slot
        </div>
      </div>

      <div className="timetable-grid-wrapper glass">
        <table className="timetable-grid">
          <thead>
            <tr>
              <th className="sticky-col">Time / Day</th>
              {timeSlots.map((slot, index) => (
                <th key={index}>
                  <div className="time-header">
                    <span className="start">{slot.start}</span>
                    <span className="separator">-</span>
                    <span className="end">{slot.end}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day}>
                <td className="day-name sticky-col">{day}</td>
                {timeSlots.map((slot, index) => {
                  const schedule = getScheduleForCell(day, slot.rawStart);
                  return (
                    <td 
                      key={index} 
                      className={`slot-cell ${schedule ? 'occupied' : 'empty'}`}
                      onClick={() => !schedule && handleCellClick(day, slot)}
                    >
                      {schedule ? (
                        <div className="schedule-card animate-scale-in">
                          <span className="subject">{schedule.subject_name}</span>
                          <span className="teacher">
                            <User size={10} /> {schedule.teacher_name}
                          </span>
                          <button 
                            className="delete-btn" 
                            onClick={(e) => {
                              e.stopPropagation();
                              // Add delete logic here
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="add-indicator">
                          <Plus size={14} />
                        </div>
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
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content glass animate-scale-in">
            <h3>Assign Class</h3>
            <p className="slot-info">
              {selectedSlot.day} • {selectedSlot.slot.start} - {selectedSlot.slot.end}
            </p>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Subject</label>
                <select 
                  required 
                  value={formData.subject_id}
                  onChange={(e) => setFormData({...formData, subject_id: e.target.value})}
                >
                  <option value="">Select Subject</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Teacher</label>
                <select 
                  required 
                  value={formData.teacher_id}
                  onChange={(e) => setFormData({...formData, teacher_id: e.target.value})}
                >
                  <option value="">Select Teacher</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="form-row" style={{ marginTop: '1rem' }}>
                <div className="form-group">
                  <label>Room / Lab</label>
                  <select 
                    required 
                    value={formData.classroom_id}
                    onChange={(e) => setFormData({...formData, classroom_id: e.target.value})}
                  >
                    <option value="">Select Room</option>
                    {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Camera ID</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 0 or CAM_01"
                    value={formData.camera_id}
                    onChange={(e) => setFormData({...formData, camera_id: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Slot</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timetable;
