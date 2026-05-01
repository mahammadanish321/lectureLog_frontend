import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Calendar,
  CheckCircle,
  TrendingUp,
  LayoutDashboard,
  PlusCircle,
  FileText,
  Power,
  Activity,
  Clock,
  Square,
  MapPin,
  User,
  AlertCircle,
  Camera
} from 'lucide-react';
import './Dashboard.css';

const AI_SERVICE_URL = "http://127.0.0.1:8001";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeSessions: 0,
    presentToday: 0,
    avgAttendance: 0
  });
  const [liveAttendance, setLiveAttendance] = useState([]);
  const [isSystemActive, setIsSystemActive] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [activeSessions, setActiveSessions] = useState([]);
  const [nextClassInfo, setNextClassInfo] = useState(null);
  const [currentClassInfo, setCurrentClassInfo] = useState(null);
  const [hasCheckedClasses, setHasCheckedClasses] = useState(false);
  const [allStudents, setAllStudents] = useState([]);
  const [aiServiceError, setAiServiceError] = useState(null);
  const [selectedSessionId, setSelectedSessionId] = useState(null);

  const [selectedYear, setSelectedYear] = useState('All');
  const [classroomCameras, setClassroomCameras] = useState([]);
  const [selectedCameraIndex, setSelectedCameraIndex] = useState(null);

  useEffect(() => {
    if (!selectedSessionId) return;

    const fetchSessionAttendance = async () => {
      try {
        const res = await api.get(`/recognition/${selectedSessionId}`);
        setLiveAttendance(res.data);
      } catch (err) {
        console.error('Error fetching session attendance:', err);
      }
    };

    fetchSessionAttendance();
  }, [selectedSessionId]);

  useEffect(() => {
    if (authLoading) return;
    const fetchStats = async () => {
      try {
        let studentsRes, sessionsRes;
        try {
          const results = await Promise.all([
            api.get('/students'),
            api.get('/sessions')
          ]);
          studentsRes = results[0];
          sessionsRes = results[1];
        } catch (err) {
          console.error("Critical data failure:", err);
          return;
        }

        // Fetch AI status independently with a timeout
        try {
          const systemRes = await axios.get(`${AI_SERVICE_URL}/system/status`, { timeout: 2000 });
          setIsSystemActive(systemRes.data.active);
          setAiServiceError(null);
        } catch (err) {
          console.warn("AI Service status check failed or timed out");
          setIsSystemActive(false);
          setAiServiceError("AI Attendance Service is currently offline or unreachable.");
        }

        let schedulesData = [];
        const role = user?.role?.toLowerCase() || (localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user'))?.role?.toLowerCase() : null);
        if (role === 'teacher') {
          try {
            const schedRes = await api.get('/schedules/my');
            schedulesData = schedRes.data;
          } catch (e) {
            console.error(e);
          }
        }

        // Calculate today's present count from active sessions
        const todayActiveSessions = (sessionsRes.data || []).filter(s => s.status === 'active' || s.status === 'ended');
        let presentTodayCount = 0;
        try {
          const todaySessionIds = todayActiveSessions
            .filter(s => new Date(s.start_time).toDateString() === new Date().toDateString())
            .map(s => s.id);
          
          for (const sid of todaySessionIds) {
            const attRes = await api.get(`/attendance/session/${sid}`).catch(() => ({ data: [] }));
            presentTodayCount += (attRes.data || []).filter(a => a.status === 'present').length;
          }
        } catch (e) {
          console.warn('Could not calculate present today:', e);
        }

        const totalStudentsCount = studentsRes.data.length || 0;
        const activeSessionCount = (sessionsRes.data || []).filter(s => s.status === 'active').length;

        setStats({
          totalStudents: totalStudentsCount,
          activeSessions: activeSessionCount,
          presentToday: presentTodayCount,
          avgAttendance: totalStudentsCount > 0 && activeSessionCount > 0 
            ? Math.round((presentTodayCount / (totalStudentsCount * activeSessionCount)) * 100) 
            : 0
        });
        setAllStudents(studentsRes.data || []);

        if (role === 'teacher' && user?.id) {
          const activeSess = (sessionsRes.data || []).filter(s => s.status === 'active' && s.teacher_id === user.id);
          setActiveSessions(activeSess);

          // Calculate Next Class Today
          const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const todayDay = days[new Date().getDay()];
          const now = new Date();
          
          const todayRoutine = schedulesData.filter(s => s.day_of_week === todayDay);
          const todayCustom = (sessionsRes.data || []).filter(s => {
            if (!s.start_time) return false;
            const sessDate = new Date(s.start_time);
            return s.teacher_id === user.id && sessDate.toDateString() === now.toDateString() && s.status !== 'cancelled';
          }).map(s => {
            let st = '00:00';
            let et = '00:00';
            try {
              if (s.start_time) st = new Date(s.start_time).toTimeString().split(' ')[0];
              if (s.end_time) et = new Date(s.end_time).toTimeString().split(' ')[0];
            } catch (e) {
              console.error(e);
            }
            return {
              ...s,
              isCustom: s.is_custom === true,
              start_time: st,
              end_time: et
            };
          });

          const allTodayClasses = [...todayCustom, ...todayRoutine];
          
          let nextClass = null;
          let currentClass = null;
          let minDiffMs = Infinity;

          allTodayClasses.forEach(c => {
            if (!c || !c.start_time) return;
            const parts = c.start_time.split(':');
            if (parts.length < 2) return;
            
            const sh = parts[0];
            const sm = parts[1];
            const classStart = new Date();
            classStart.setHours(parseInt(sh, 10), parseInt(sm, 10), 0, 0);

            // Determine end time
            let eh = parseInt(sh, 10) + 1;
            let em = parseInt(sm, 10);
            if (c.end_time) {
              const eParts = c.end_time.split(':');
              if (eParts.length >= 2) {
                eh = parseInt(eParts[0], 10);
                em = parseInt(eParts[1], 10);
              }
            }
            const classEnd = new Date();
            classEnd.setHours(eh, em, 0, 0);

            if (now >= classStart && now <= classEnd) {
              currentClass = c;
            } else if (classStart > now) {
              const diffMs = classStart - now;
              if (diffMs < minDiffMs) {
                minDiffMs = diffMs;
                nextClass = {
                  ...c,
                  classStart,
                  diffMs
                };
              }
            }
          });

          setNextClassInfo(nextClass);
          setCurrentClassInfo(currentClass);
          setHasCheckedClasses(true);

          // Load persistent database records for initial load
          const targetSession = activeSess.length > 0 ? activeSess[0] : (currentClass && currentClass.isCustom ? currentClass : null);
          if (targetSession && targetSession.id) {
            try {
              const attRes = await api.get(`/attendance/session/${targetSession.id}`);
              if (attRes.data && Array.isArray(attRes.data)) {
                const formatted = attRes.data.map(item => ({
                  student_id: item.student_id,
                  student_name: item.student_name || 'Student',
                  session_id: item.session_id,
                  timestamp: item.created_at
                }));
                setLiveAttendance(formatted);
              }
            } catch (attErr) {
              console.error('Failed to pre-fetch session records:', attErr);
            }
          }
        } else {
          // Admin path
          const active = sessionsRes.data.filter(s => s.status === 'active');
      
          // De-duplicate active sessions by subject and class group
          const uniqueActive = [];
          const seenClasses = new Set();
          
          active.forEach(s => {
            const key = `${s.subject_id}-${s.year}-${s.stream}`;
            if (!seenClasses.has(key)) {
              uniqueActive.push(s);
              seenClasses.add(key);
            }
          });

          setActiveSessions(uniqueActive);
          
          // Auto-select session for both Admin and Teacher
          if (uniqueActive.length > 0 && !selectedSessionId) {
            if (role === 'teacher') {
              const myActive = uniqueActive.find(s => s.teacher_id === user.id);
              if (myActive) setSelectedSessionId(myActive.id);
              else setSelectedSessionId(uniqueActive[0].id);
            } else {
              setSelectedSessionId(uniqueActive[0].id);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      }
    };

    fetchStats();

    // Fetch classroom cameras for idle browsing
    const fetchCameras = async () => {
      try {
        const res = await axios.get(`${AI_SERVICE_URL}/cameras`, { timeout: 2000 });
        if (res.data && Array.isArray(res.data)) {
          setClassroomCameras(res.data);
          if (res.data.length > 0 && selectedCameraIndex === null) {
            setSelectedCameraIndex(res.data[0].camera_index);
          }
        }
      } catch (e) {
        console.warn('Could not fetch cameras list');
      }
    };
    fetchCameras();

    const socket = io('http://localhost:5000');
    
    socket.on('connect', () => console.log('✅ Socket connected:', socket.id));
    socket.on('connect_error', (err) => console.error('❌ Socket connection error:', err));

    socket.on('attendance_update', (data) => {
      console.log('🔔 Attendance Update Received:', data);
      
      // Update stats immediately regardless of filter
      setStats(prev => ({
        ...prev,
        presentToday: prev.presentToday + 1
      }));

      // Add to live feed
      setLiveAttendance(prev => [data, ...prev]);
    });

    socket.on('session_started', (newSession) => {
      console.log('[Socket] New session started:', newSession);
      // Refresh stats and sessions
      fetchStats();
      // If user is admin and no session selected, auto-select it
      if (user?.role?.toLowerCase() === 'admin' && !selectedSessionId) {
        setSelectedSessionId(newSession.id);
      }
    });

    socket.on('session_ended', (data) => {
      console.log('[Socket] Session ended:', data.id);
      fetchStats();
      if (selectedSessionId === data.id) {
        setSelectedSessionId(null);
        setLiveAttendance([]);
      }
    });

    socket.on('session_cancelled', (data) => {
      console.log('[Socket] Session cancelled:', data.id);
      fetchStats();
      if (selectedSessionId === data.id) {
        setSelectedSessionId(null);
        setLiveAttendance([]);
      }
    });

    return () => {
      socket.off('attendance_update');
      socket.off('session_started');
      socket.off('session_ended');
      socket.off('session_cancelled');
      socket.disconnect();
    };
  }, [user, selectedSessionId, authLoading]);

  if (authLoading) return <div className="loading-state" style={{ background: '#fdfcf7', color: '#1c1917', padding: '3rem', textAlign: 'center', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading dashboard...</div>;

  const handleEndSession = async (sessionId) => {
    try {
      await api.post('/sessions/end', { id: sessionId });
      setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
      alert('Session ended successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to end session');
    }
  };

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
      {user?.role?.toLowerCase() === 'teacher' && aiServiceError && (
        <div className="ai-error-banner animate-fade-in" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#991b1b' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '0.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Power size={20} />
          </div>
          <div>
            <span style={{ fontWeight: 700, fontSize: '0.95rem', display: 'block', marginBottom: '2px', color: '#7f1d1d' }}>System Error Detected</span>
            <span style={{ fontSize: '0.85rem' }}>{aiServiceError}</span>
          </div>
        </div>
      )}

      {user?.role?.toLowerCase() === 'admin' && (
        <>
          {/* Year Filter Tabs */}
          <div className="year-filter-tabs animate-fade-in" style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
            {['All', '1', '2', '3', '4'].map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                style={{
                  padding: '0.6rem 1.2rem',
                  borderRadius: '100px',
                  border: '1px solid',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  background: selectedYear === year ? 'var(--primary)' : 'rgba(28, 25, 23, 0.03)',
                  borderColor: selectedYear === year ? 'var(--primary)' : 'rgba(28, 25, 23, 0.1)',
                  color: selectedYear === year ? '#fff' : 'rgba(28, 25, 23, 0.6)',
                  boxShadow: selectedYear === year ? '0 4px 12px rgba(99, 102, 241, 0.2)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap'
                }}
              >
                {year === 'All' ? 'All Classes' : `${year}${year === '1' ? 'st' : year === '2' ? 'nd' : year === '3' ? 'rd' : 'th'} Year`}
                <span style={{ 
                  background: selectedYear === year ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)', 
                  padding: '2px 6px', 
                  borderRadius: '10px', 
                  fontSize: '0.7rem' 
                }}>
                  {year === 'All' 
                    ? activeSessions.length 
                    : activeSessions.filter(s => String(s.year) === year).length
                  }
                </span>
              </button>
            ))}
          </div>

          <div className="admin-status-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            {/* Summary Card */}
            <div 
              className="stat-card glass" 
              onClick={() => setSelectedSessionId(null)}
              style={{ 
                background: !selectedSessionId ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)' : 'white', 
                border: '1px solid rgba(99, 102, 241, 0.2)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                transform: !selectedSessionId ? 'translateY(-4px)' : 'none',
                boxShadow: !selectedSessionId ? '0 10px 25px -5px rgba(99, 102, 241, 0.2)' : 'none'
              }}
            >
              <div className="stat-header">
                <h4 style={{ color: 'var(--primary)', fontWeight: 700 }}>{selectedYear === 'All' ? 'LIVE SESSIONS' : `${selectedYear} YEAR`}</h4>
                <div className="icon-wrapper" style={{ background: 'rgba(99, 102, 241, 0.2)', color: 'var(--primary)' }}>
                  <Activity size={18} className="animate-pulse" />
                </div>
              </div>
              <div className="stat-details">
                <h3 style={{ fontSize: '2rem' }}>
                  {selectedYear === 'All' 
                    ? activeSessions.length 
                    : activeSessions.filter(s => String(s.year) === selectedYear).length
                  }
                </h3>
                <p style={{ color: 'var(--muted-foreground)' }}>Classes Currently Active</p>
                {!selectedSessionId && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700 }}>● VIEWING ALL CLASSES</span>
                  </div>
                )}
              </div>
            </div>

            {/* Active Session Cards as Buttons */}
            {activeSessions
              .filter(s => selectedYear === 'All' || String(s.year) === selectedYear)
              .map((sess, idx) => (
                <div 
                  key={idx} 
                  className={`stat-card glass animate-scale-in ${selectedSessionId === sess.id ? 'selected-session' : ''}`}
                  onClick={() => setSelectedSessionId(sess.id)}
                  style={{ 
                    borderLeft: selectedSessionId === sess.id ? '4px solid #6366f1' : '4px solid #22c55e', 
                    padding: '1.25rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: selectedSessionId === sess.id ? 'translateY(-4px)' : 'none',
                    boxShadow: selectedSessionId === sess.id ? '0 12px 24px -8px rgba(99, 102, 241, 0.4)' : 'none',
                    background: selectedSessionId === sess.id ? 'rgba(99, 102, 241, 0.05)' : undefined
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: selectedSessionId === sess.id ? '#6366f1' : '#22c55e', textTransform: 'uppercase' }}>
                          {selectedSessionId === sess.id ? 'Viewing Feed' : 'Active Now'}
                        </span>
                        <span style={{ fontSize: '0.75rem', background: selectedSessionId === sess.id ? 'rgba(99, 102, 241, 0.1)' : 'rgba(34, 197, 94, 0.1)', color: selectedSessionId === sess.id ? '#6366f1' : '#22c55e', padding: '2px 6px', borderRadius: '4px' }}>
                          Yr {sess.year}
                        </span>
                      </div>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1c1917', marginBottom: '4px' }}>{sess.subject_name}</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={12} /> {sess.classroom_name}
                      </p>
                    </div>
                    <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(0,0,0,0.05)', fontSize: '0.8rem', color: 'rgba(28, 25, 23, 0.6)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User size={12} /> {sess.teacher_name}
                    </div>
                  </div>
                </div>
              ))}

            {activeSessions.length === 0 && (
              <div className="stat-card glass" style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(28, 25, 23, 0.02)', border: '1px dashed rgba(28, 25, 23, 0.1)' }}>
                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem' }}>No active sessions at the moment.</p>
              </div>
            )}
          </div>
        </>
      )}

      {user?.role?.toLowerCase() === 'teacher' && (
        <div style={{ marginBottom: '2rem' }}>
          {/* Main Current Status Block */}
          {currentClassInfo ? (
            <div 
              className="current-session-banner glass animate-fade-in" 
              style={{ 
                padding: '2rem', 
                borderRadius: '12px', 
                background: currentClassInfo.isCustom ? 'rgba(234, 179, 8, 0.15)' : 'rgba(34, 197, 94, 0.15)', 
                border: currentClassInfo.isCustom ? '1px solid rgba(234, 179, 8, 0.4)' : '1px solid rgba(34, 197, 94, 0.4)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span 
                    style={{ 
                      fontSize: '0.8rem', 
                      textTransform: 'uppercase', 
                      color: currentClassInfo.isCustom ? '#eab308' : '#22c55e', 
                      fontWeight: 700, 
                      letterSpacing: '1px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem' 
                    }}
                  >
                    <Activity className="animate-pulse" size={16} /> Session is Started
                  </span>
                  <h2 style={{ fontSize: '1.85rem', fontWeight: 700, margin: '8px 0', color: '#1c1917' }}>{currentClassInfo.subject_name}</h2>
                  <p style={{ fontSize: '0.95rem', color: 'rgba(28, 25, 23, 0.8)', display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
                    <span><strong>Stream:</strong> {currentClassInfo.stream}</span>
                    <span><strong>Room:</strong> {currentClassInfo.classroom_name || 'Lab'}</span>
                    <span><strong>Time Slot:</strong> {currentClassInfo.start_time.substring(0, 5)} - {currentClassInfo.end_time ? currentClassInfo.end_time.substring(0, 5) : ''}</span>
                  </p>
                </div>
                <div style={{ 
                  padding: '0.65rem 1.25rem', 
                  background: currentClassInfo.isCustom ? 'rgba(234, 179, 8, 0.2)' : 'rgba(99, 102, 241, 0.15)', 
                  color: currentClassInfo.isCustom ? '#92400e' : '#6366f1', 
                  borderRadius: '100px', 
                  fontSize: '0.8rem', 
                  fontWeight: 700,
                  border: currentClassInfo.isCustom ? '1px solid rgba(234, 179, 8, 0.3)' : '1px solid rgba(99, 102, 241, 0.3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {currentClassInfo.isCustom ? 'Custom Class' : 'Regular Class'}
                </div>
              </div>
            </div>
          ) : (
            <div 
              className="no-session-banner glass animate-fade-in" 
              style={{ 
                padding: '2rem', 
                borderRadius: '12px', 
                background: 'rgba(28, 25, 23, 0.02)', 
                border: '1px solid rgba(28, 25, 23, 0.05)',
                textAlign: 'center'
              }}
            >
              {nextClassInfo ? (
                <div>
                  <Clock size={40} style={{ color: 'var(--primary)', marginBottom: '1rem', opacity: 0.8 }} />
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1c1917' }}>No Active Session Right Now</h3>
                  <p style={{ color: 'var(--muted-foreground)', marginTop: '0.5rem', fontSize: '1rem' }}>
                    Your next session is <strong style={{ color: '#1c1917' }}>{nextClassInfo.subject_name}</strong> in <strong style={{ color: '#1c1917' }}>{nextClassInfo.classroom_name || 'Lab'}</strong>.
                  </p>
                </div>
              ) : (
                <div>
                  <CheckCircle size={40} style={{ color: '#22c55e', marginBottom: '1rem', opacity: 0.8 }} />
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1c1917' }}>There are no more sessions today.</h3>
                  <p style={{ color: '#22c55e', marginTop: '0.5rem', fontSize: '1.1rem', fontWeight: 600 }}>Take a rest! ✨</p>
                </div>
              )}
            </div>
          )}

          {/* Small Corner Next Session Widget */}
          {currentClassInfo && nextClassInfo && (
            <div 
              className="next-session-widget glass animate-fade-in" 
              style={{ 
                position: 'fixed', 
                bottom: '2rem', 
                right: '2rem', 
                padding: '1rem 1.5rem', 
                background: 'rgba(99, 102, 241, 0.15)', 
                border: '1px solid rgba(99, 102, 241, 0.3)', 
                borderRadius: '12px', 
                zIndex: 1000,
                maxWidth: '300px'
              }}
            >
              <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Next Session</span>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#1c1917', margin: '4px 0' }}>{nextClassInfo.subject_name}</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>Room: {nextClassInfo.classroom_name || 'Lab'}</p>
            </div>
          )}
        </div>
      )}

      {/* Live Monitoring Section */}
      {(user?.role?.toLowerCase() === 'admin' || (user?.role?.toLowerCase() === 'teacher' && currentClassInfo)) && (
        <div className="dashboard-content" style={{ 
          display: 'grid', 
          gridTemplateColumns: user?.role?.toLowerCase() === 'admin' ? '2fr 1fr' : '1fr', 
          gap: '1.5rem' 
        }}>
          {/* CAMERA FEED - ADMIN ONLY */}
          {user?.role?.toLowerCase() === 'admin' && (
            <div className="live-feed card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                <h3>Live Attendance Monitor</h3>
                  <p>
                    {selectedSessionId 
                      ? `Monitoring: ${activeSessions.find(s => s.id === selectedSessionId)?.subject_name}` 
                      : activeSessions.length > 0 
                        ? 'Select a session card to view its camera'
                        : 'Idle Mode — Browse classroom cameras'}
                  </p>
                </div>
                <div className="status-controls" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <button
                    className={`system-toggle-mini ${isSystemActive ? 'active' : 'inactive'}`}
                    onClick={toggleSystem}
                    disabled={isToggling}
                    style={{ 
                      padding: '0.4rem 0.8rem', 
                      borderRadius: '8px', 
                      fontSize: '0.8rem', 
                      fontWeight: 600, 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      cursor: 'pointer',
                      border: '1px solid',
                      transition: 'all 0.2s',
                      background: isSystemActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                      borderColor: isSystemActive ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                      color: isSystemActive ? '#ef4444' : '#22c55e'
                    }}
                  >
                    <Power size={14} />
                    {isSystemActive ? 'Turn Off AI' : 'Turn On AI'}
                  </button>
                  <div className={`system-status-indicator ${isSystemActive ? 'active' : 'inactive'}`}>
                    <Activity size={16} />
                    <span>{isSystemActive ? 'Monitoring Active' : 'System Paused'}</span>
                  </div>
                </div>
              </div>

              {/* Camera Selector — shown when no active sessions */}
              {activeSessions.length === 0 && classroomCameras.length > 0 && (
                <div style={{ padding: '0.75rem 1.5rem', background: 'rgba(99, 102, 241, 0.04)', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Camera size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>Camera:</span>
                  <select
                    value={selectedCameraIndex ?? ''}
                    onChange={(e) => setSelectedCameraIndex(parseInt(e.target.value))}
                    style={{
                      flex: 1,
                      padding: '0.4rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(0,0,0,0.1)',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      background: '#fff',
                      color: '#1c1917',
                      cursor: 'pointer'
                    }}
                  >
                    {classroomCameras.map(c => (
                      <option key={c.classroom_id} value={c.camera_index}>
                        {c.classroom_name} (Camera {c.camera_index})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="video-stream-wrapper">
                <img 
                  key={selectedSessionId || `cam-${selectedCameraIndex}`}
                  src={selectedSessionId 
                    ? `http://127.0.0.1:8001/video_feed?v=${selectedSessionId}` 
                    : `http://127.0.0.1:8001/video_feed?cam=${selectedCameraIndex ?? 0}`
                  } 
                  alt="Live Camera Feed" 
                  className="live-video-feed"
                  style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
                  onLoad={(e) => {
                    console.log('✅ Video stream loaded');
                  }}
                  onError={(e) => {
                    console.error('❌ Video stream error');
                    e.target.style.display = 'none';
                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="video-placeholder" style={{ display: 'none' }}>
                  <div className="loader-container">
                    <div style={{ color: '#ef4444', marginBottom: '1rem' }}><AlertCircle size={48} /></div>
                    <p style={{ fontWeight: 600 }}>Stream Connection Failed</p>
                    <p style={{ fontSize: '0.8rem', opacity: 0.7, maxWidth: '80%', textAlign: 'center' }}>
                      Ensure the AI Service is running and your camera is not in use by another application.
                    </p>
                    <button 
                      onClick={() => window.location.reload()}
                      style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      Retry Connection
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
  
          {/* ATTENDANCE LIST */}
          <div className="live-attendance-side card" style={{ padding: '1.5rem', minHeight: user?.role?.toLowerCase() === 'teacher' ? '300px' : 'auto' }}>
          <div className="card-header" style={{ padding: 0, marginBottom: '1.5rem' }}>
            <h3>Class Attendance</h3>
            <p>
              {selectedSessionId 
                ? `Present in ${activeSessions.find(s => s.id === selectedSessionId)?.subject_name}` 
                : 'All students present today'}
            </p>
          </div>
          
          <div className="feed-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {liveAttendance
              .filter(item => !selectedSessionId || item.session_id == selectedSessionId)
              .length > 0 ? (
              liveAttendance
                .filter(item => !selectedSessionId || item.session_id == selectedSessionId)
                .map((item, i) => (
                  <div key={i} className="feed-item animate-fade-in" style={{ 
                    padding: '1rem 0', 
                    borderBottom: '1px solid rgba(0,0,0,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                  }}>
                    <div className="feed-avatar-container" style={{ position: 'relative' }}>
                      <img 
                        src={`http://localhost:5000/public/students/${item.student_id}.jpg`}
                        alt={item.student_name}
                        style={{ 
                          width: '44px', 
                          height: '44px', 
                          borderRadius: '12px', 
                          objectFit: 'cover',
                          border: '2px solid #fff',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div className="feed-avatar-fallback" style={{ 
                        display: 'none',
                        width: '44px', 
                        height: '44px', 
                        borderRadius: '12px', 
                        background: 'linear-gradient(135deg, var(--primary) 0%, #6366f1 100%)',
                        color: '#fff',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem',
                        fontWeight: 600,
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
                      }}>
                        {item.student_name ? item.student_name.charAt(0) : 'S'}
                      </div>
                      <div style={{ 
                        position: 'absolute', 
                        bottom: '-2px', 
                        right: '-2px', 
                        width: '12px', 
                        height: '12px', 
                        background: '#10b981', 
                        border: '2px solid #fff', 
                        borderRadius: '50%' 
                      }}></div>
                    </div>
                    <div className="feed-info" style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1c1917', margin: 0 }}>{item.student_name}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 500 }}>
                          ID: {item.roll_number || 'N/A'}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.65rem', color: 'var(--muted-foreground)' }}>
                            Yr {item.year} | {item.stream}
                          </span>
                          <span style={{ color: 'var(--muted-foreground)', opacity: 0.3 }}>•</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={10} style={{ color: 'var(--muted-foreground)' }} />
                            <span style={{ fontSize: '0.65rem', color: 'var(--muted-foreground)' }}>
                              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="status-badge" style={{ 
                      fontSize: '0.65rem', 
                      background: 'rgba(16, 185, 129, 0.1)', 
                      color: '#10b981', 
                      padding: '4px 8px', 
                      borderRadius: '6px',
                      fontWeight: 700,
                      textTransform: 'uppercase'
                    }}>Present</div>
                  </div>
                ))
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'rgba(28, 25, 23, 0.4)', border: '1px dashed rgba(0,0,0,0.1)', borderRadius: '12px' }}>
                <Users size={32} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                <p style={{ fontSize: '0.9rem', fontWeight: 500, margin: '0 0 8px 0' }}>No attendance recorded yet</p>
                <p style={{ fontSize: '0.75rem', maxWidth: '200px', margin: '0 auto' }}>
                  {selectedSessionId 
                    ? "Maybe no students from this group have arrived yet."
                    : "Recognition is active. Students will appear here as they are identified."}
                </p>
                {selectedSessionId && (
                  <button 
                    onClick={() => setSelectedSessionId(null)}
                    style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  >
                    View All Active Sessions
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {user?.role?.toLowerCase() === 'teacher' && activeSessions.length === 0 && !currentClassInfo && hasCheckedClasses && (
        <div className="next-session-banner glass" style={{ padding: '1.5rem', marginBottom: '1.5rem', borderRadius: '12px', background: 'rgba(28, 25, 23, 0.02)', border: '1px solid rgba(28, 25, 23, 0.05)' }}>
          {nextClassInfo ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', width: '48px', height: '48px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={24} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#3b82f6', fontWeight: 600 }}>Next Session Coming Up</p>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '1.15rem', color: '#1c1917', fontWeight: 600 }}>
                  After {(() => {
                    const diffHrs = Math.floor(nextClassInfo.diffMs / 3600000);
                    const diffMins = Math.floor((nextClassInfo.diffMs % 3600000) / 60000);
                    if (diffHrs > 0) return `${diffHrs} hour${diffHrs > 1 ? 's' : ''} later`;
                    return `${diffMins} minute${diffMins > 1 ? 's' : ''} later`;
                  })()} you have <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{nextClassInfo.subject_name}</span> class in Classroom <span style={{ color: '#1c1917', fontWeight: 700 }}>{nextClassInfo.classroom_name || 'Lab'}</span> at <span style={{ color: '#059669', fontWeight: 700 }}>{nextClassInfo.start_time.substring(0, 5)}</span>.
                </h3>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', width: '48px', height: '48px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={24} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#059669', fontWeight: 600 }}>Schedule Clear</p>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '1.1rem', color: '#1c1917', fontWeight: 500 }}>
                  Take a rest, there is no more classes for today.
                </h3>
              </div>
            </div>
          )}
        </div>
      )}


    </div>
  );
};

export default Dashboard;
