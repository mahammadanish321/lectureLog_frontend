import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Edit2, Trash2, Clock, MapPin } from 'lucide-react';
import api from '../api';
import './ScheduleManager.css';

const ScheduleManager = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  
  const [formData, setFormData] = useState({
    subject_id: '',
    classroom_id: '',
    day_of_week: 'Monday',
    start_time: '',
    end_time: ''
  });

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const response = await api.get('/schedules/my');
      setSchedules(response.data);
    } catch (err) {
      console.error('Failed to fetch schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSchedule) {
        await api.put(`/schedules/${editingSchedule.id}`, formData);
      } else {
        await api.post('/schedules', formData);
      }
      setShowModal(false);
      setEditingSchedule(null);
      fetchSchedules();
    } catch (err) {
      alert('Failed to save schedule');
    }
  };

  return (
    <div className="schedule-manager animate-fade-in">
      <header className="section-header-row">
        <div>
          <h1>My Class Schedules</h1>
          <p>Manage your weekly class times and locations</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={20} />
          <span>Add Schedule</span>
        </button>
      </header>

      <div className="schedule-grid">
        {loading ? (
          <p>Loading schedules...</p>
        ) : schedules.length > 0 ? (
          schedules.map((schedule) => (
            <div key={schedule.id} className="schedule-card glass">
              <div className="schedule-card-header">
                <div className="subject-badge">{schedule.subject_name}</div>
                <button className="icon-btn" onClick={() => {
                  setEditingSchedule(schedule);
                  setFormData(schedule);
                  setShowModal(true);
                }}>
                  <Edit2 size={16} />
                </button>
              </div>
              
              <div className="schedule-details">
                <div className="detail-item">
                  <Calendar size={18} />
                  <span>{schedule.day_of_week}</span>
                </div>
                <div className="detail-item">
                  <Clock size={18} />
                  <span>{schedule.start_time} - {schedule.end_time}</span>
                </div>
                <div className="detail-item">
                  <MapPin size={18} />
                  <span>{schedule.classroom_name}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-schedules glass">
            <Calendar size={48} />
            <p>You haven't added any schedules yet.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content glass">
            <h2>{editingSchedule ? 'Edit Schedule' : 'Add New Schedule'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Subject ID</label>
                  <input 
                    type="number" 
                    value={formData.subject_id}
                    onChange={(e) => setFormData({...formData, subject_id: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Classroom ID</label>
                  <input 
                    type="number" 
                    value={formData.classroom_id}
                    onChange={(e) => setFormData({...formData, classroom_id: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Day of Week</label>
                  <select 
                    value={formData.day_of_week}
                    onChange={(e) => setFormData({...formData, day_of_week: e.target.value})}
                  >
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Start Time</label>
                  <input 
                    type="time" 
                    value={formData.start_time}
                    onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>End Time</label>
                  <input 
                    type="time" 
                    value={formData.end_time}
                    onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleManager;
