import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, BookOpen } from 'lucide-react';
import api from '../api';
import './StudentDashboard.css';

const StudentDashboard = () => {
  const [attendance, setAttendance] = useState([]);
  const [stats, setStats] = useState({ present: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [attRes, statsRes] = await Promise.all([
          api.get('/students/my-attendance'),
          api.get('/students/my-stats')
        ]);
        setAttendance(attRes.data);
        setStats(statsRes.data);
      } catch (err) {
        console.error('Failed to fetch student data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="loading-state">Loading your dashboard...</div>;

  const attendancePercentage = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

  return (
    <div className="student-dashboard animate-fade-in">
      <header className="dashboard-header">
        <h1>Welcome Back</h1>
        <p>Track your academic progress and attendance</p>
      </header>

      <div className="stats-grid">
        <div className="stat-card glass">
          <div className="stat-icon-wrapper blue">
            <CheckCircle size={24} />
          </div>
          <div className="stat-info">
            <h3>{stats.present}</h3>
            <p>Classes Present</p>
          </div>
        </div>

        <div className="stat-card glass">
          <div className="stat-icon-wrapper purple">
            <BookOpen size={24} />
          </div>
          <div className="stat-info">
            <h3>{stats.total}</h3>
            <p>Total Classes</p>
          </div>
        </div>

        <div className="stat-card glass">
          <div className="stat-icon-wrapper orange">
            <Clock size={24} />
          </div>
          <div className="stat-info">
            <h3>{attendancePercentage}%</h3>
            <p>Attendance Rate</p>
          </div>
          <div className="stat-progress">
            <div className="progress-bar" style={{ width: `${attendancePercentage}%` }}></div>
          </div>
        </div>
      </div>

      <div className="dashboard-sections">
        <section className="attendance-section glass">
          <div className="section-header">
            <Calendar size={20} />
            <h2>Recent Attendance History</h2>
          </div>
          
          <div className="attendance-list">
            {attendance.length > 0 ? (
              attendance.map((record, index) => (
                <div key={index} className="attendance-row">
                  <div className="subject-info">
                    <span className="subject-name">{record.subject_name}</span>
                    <span className="session-date">{new Date(record.start_time).toLocaleDateString()}</span>
                  </div>
                  <div className={`status-badge ${record.status}`}>
                    {record.status === 'present' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                    {record.status.toUpperCase()}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>No attendance records found.</p>
              </div>
            )}
          </div>
        </section>

        <section className="upcoming-section glass">
          <div className="section-header">
            <Clock size={20} />
            <h2>Scheduled Classes Today</h2>
          </div>
          <div className="upcoming-list">
             {/* Placeholder for schedules */}
             <div className="empty-state">
                <p>Check back later for your schedule.</p>
             </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default StudentDashboard;
