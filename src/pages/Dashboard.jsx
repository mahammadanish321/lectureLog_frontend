import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
  Users,
  Calendar,
  CheckCircle,
  TrendingUp,
  LayoutDashboard,
  PlusCircle,
  FileText,
  Power,
  Activity
} from 'lucide-react';
import './Dashboard.css';

const AI_SERVICE_URL = "http://127.0.0.1:8001";

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeSessions: 0,
    presentToday: 0,
    avgAttendance: 0
  });
  const [liveAttendance, setLiveAttendance] = useState([]);
  const [isSystemActive, setIsSystemActive] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [studentsRes, sessionsRes, systemRes] = await Promise.all([
          api.get('/students'),
          api.get('/sessions'),
          axios.get(`${AI_SERVICE_URL}/system/status`).catch(() => ({ data: { active: true } }))
        ]);

        setStats({
          totalStudents: studentsRes.data.length || 0,
          activeSessions: (sessionsRes.data || []).filter(s => s.status === 'active').length,
          presentToday: 0,
          avgAttendance: 85
        });
        setIsSystemActive(systemRes.data.active);
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      }
    };

    fetchStats();

    const socket = io('http://localhost:5000');
    socket.on('attendance_update', (data) => {
      setLiveAttendance(prev => [data, ...prev].slice(0, 5));
    });

    return () => socket.disconnect();
  }, []);

  const toggleSystem = async () => {
    setIsToggling(true);
    try {
      const res = await axios.post(`${AI_SERVICE_URL}/system/toggle`);
      setIsSystemActive(res.data.active);
    } catch (err) {
      alert('Failed to toggle AI system. Ensure AI service is running on port 8001.');
    } finally {
      setIsToggling(false);
    }
  };

  const statCards = [
    { label: 'Total Students', value: stats.totalStudents, icon: Users },
    { label: 'Active Sessions', value: stats.activeSessions, icon: Calendar },
    { label: 'Present Today', value: stats.presentToday, icon: CheckCircle },
    { label: 'Avg Attendance', value: `${stats.avgAttendance}%`, icon: TrendingUp },
  ];

  return (
    <div className="dashboard-container animate-fade-in">
      <div className="stats-grid">
        {statCards.map((card, i) => (
          <div key={i} className="stat-card">
            <div className="stat-header">
              <h4>{card.label}</h4>
              <div className="icon-wrapper">
                <card.icon size={18} />
              </div>
            </div>
            <div className="stat-details">
              <h3>{card.value}</h3>
              <p>+0% from last week</p>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-content">
        <div className="live-feed card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>Live Attendance Feed</h3>
              <p>Real-time face recognition events from active sessions</p>
            </div>
            <div className={`system-status-indicator ${isSystemActive ? 'active' : 'inactive'}`}>
              <Activity size={16} />
              <span>{isSystemActive ? 'Monitoring Active' : 'System Paused'}</span>
            </div>
          </div>
          
          <div className="video-stream-wrapper">
            <img 
              src="http://localhost:8001/video_feed" 
              alt="Live Camera Feed" 
              className="live-video-feed"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="video-placeholder" style={{ display: 'none' }}>
              <div className="loader-container">
                <p>Camera Offline or System Paused</p>
              </div>
            </div>
          </div>

          <div className="feed-list">
            {liveAttendance.length > 0 ? (
              liveAttendance.map((item, i) => (
                <div key={i} className="feed-item animate-fade-in">
                  <div className="feed-avatar">{item.student_name ? item.student_name.charAt(0) : 'S'}</div>
                  <div className="feed-info">
                    <p>{item.student_name} marked present</p>
                    <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="status-badge">Recognized</div>
                </div>
              ))
            ) : null}
          </div>
        </div>

        <div className="quick-actions card">
          <div className="card-header">
            <h3>System Control</h3>
            <p>Master switch for AI face recognition</p>
          </div>

          <div className="system-toggle-section" style={{ paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
            <button
              className={`btn ${isSystemActive ? 'btn-outline' : 'btn-primary'}`}
              style={{ width: '100%', gap: '1rem', height: '3.5rem' }}
              onClick={toggleSystem}
              disabled={isToggling}
            >
              <Power size={20} color={isSystemActive ? 'var(--destructive)' : 'currentColor'} />
              <span>{isSystemActive ? 'Turn Off AI Recognition' : 'Turn On AI Recognition'}</span>
            </button>
          </div>

          <div className="card-header" style={{ padding: 0, marginBottom: '1rem' }}>
            <h3>Quick Actions</h3>
          </div>
          <div className="action-btns">
            <button className="btn btn-primary" onClick={() => navigate('/sessions')}>
              <PlusCircle size={18} />
              <span>Start New Session</span>
            </button>
            <button className="btn btn-outline" onClick={() => navigate('/students/register')}>
              <Users size={18} />
              <span>Register Student</span>
            </button>
            <button className="btn btn-outline">
              <FileText size={18} />
              <span>Export Reports</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
