import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import api from '../api';
import {
  Users,
  Calendar,
  CheckCircle,
  TrendingUp,
  Clock,
  MapPin,
  User,
  Activity,
  AlertCircle,
  Power,
  Camera,
  Loader2,
  ChevronRight,
  Plus,
  MonitorPlay,
  Maximize2,
  Minimize2,
  Mail,
  X,
  ChevronLeft,
} from 'lucide-react';
import './Dashboard.css';

const AI_SERVICE_URL = 'http://127.0.0.1:8001';

const DEMO_STATS = {
  totalStudents: 142,
  presentToday: 87,
  avgAttendance: 92,
  activeSessions: 3
};

const DEMO_ACTIVE_SESSIONS = [
  {
    id: 1,
    subject_name: 'Machine Learning',
    teacher_name: 'Dr. Aris Thorne',
    classroom_name: 'Lab-01',
    camera_name: 'Front Cam',
    start_time: '09:00 AM',
    end_time: '11:00 AM',
    year: 'Year 3',
    stream: 'CSE'
  },
  {
    id: 2,
    subject_name: 'Database Systems',
    teacher_name: 'Prof. Sarah Jenkins',
    classroom_name: 'Hall-B',
    camera_name: 'Side Cam',
    start_time: '10:30 AM',
    end_time: '12:30 PM',
    year: 'Year 3',
    stream: 'CSE'
  },
  {
    id: 3,
    subject_name: 'Web Engineering',
    teacher_name: 'Mr. David Miller',
    classroom_name: 'Lab-03',
    camera_name: 'Main Cam',
    start_time: '11:00 AM',
    end_time: '01:00 PM',
    year: 'Year 2',
    stream: 'CSE'
  },
  {
    id: 4,
    subject_name: 'Cyber Security',
    teacher_name: 'Dr. Elena Vance',
    classroom_name: 'Hall-A',
    camera_name: '360 Cam',
    start_time: '09:30 AM',
    end_time: '11:30 AM',
    year: 'Year 4',
    stream: 'IT'
  },
  {
    id: 5,
    subject_name: 'Digital Electronics',
    teacher_name: 'Prof. Meera Sen',
    classroom_name: 'Lab-02',
    camera_name: 'Front Cam',
    start_time: '01:00 PM',
    end_time: '03:00 PM',
    year: 'Year 2',
    stream: 'ECE'
  },
  {
    id: 6,
    subject_name: 'AI Ethics',
    teacher_name: 'Dr. Kabir Rao',
    classroom_name: 'Studio-1',
    camera_name: 'Side Cam',
    start_time: '02:30 PM',
    end_time: '04:30 PM',
    year: 'Year 3',
    stream: 'CSE'
  },
  {
    id: 7,
    subject_name: 'Cloud Computing',
    teacher_name: 'Prof. Naina Shah',
    classroom_name: 'Hall-C',
    camera_name: 'Main Cam',
    start_time: '08:00 AM',
    end_time: '10:00 AM',
    year: 'Year 4',
    stream: 'IT'
  },
  {
    id: 8,
    subject_name: 'Mobile App Dev',
    teacher_name: 'Mr. Rohan Das',
    classroom_name: 'Lab-04',
    camera_name: 'Ceiling Cam',
    start_time: '12:00 PM',
    end_time: '02:00 PM',
    year: 'Year 3',
    stream: 'CSE'
  },
  {
    id: 9,
    subject_name: 'Discrete Math',
    teacher_name: 'Dr. Suman Roy',
    classroom_name: 'Hall-B',
    camera_name: 'Front Cam',
    start_time: '03:00 PM',
    end_time: '05:00 PM',
    year: 'Year 1',
    stream: 'CSE'
  },
  {
    id: 10,
    subject_name: 'Compiler Design',
    teacher_name: 'Prof. Asha Iyer',
    classroom_name: 'Lab-01',
    camera_name: 'Side Cam',
    start_time: '04:30 PM',
    end_time: '06:30 PM',
    year: 'Year 3',
    stream: 'CSE'
  }
];

const DEMO_ATTENDANCE = [
  { student_name: 'Alex Rivera', subject_name: 'Math', timestamp: '10:14 AM' },
  { student_name: 'Jordan Smith', subject_name: 'Digital Logic', timestamp: '10:12 AM' },
  { student_name: 'Elena Gilbert', subject_name: 'Math', timestamp: '10:10 AM' },
  { student_name: 'Stefan Salvatore', subject_name: 'Math', timestamp: '10:08 AM' },
  { student_name: 'Damon Salvatore', subject_name: 'Digital Logic', timestamp: '10:05 AM' }
];

const DEMO_PRESENT_STUDENTS = [
  { student_name: 'Alex Rivera', roll_number: 'CSE-201', email: 'alex.rivera@lecturelog.edu', status: 'present', marked_at: '10:14 AM' },
  { student_name: 'Jordan Smith', roll_number: 'CSE-202', email: 'jordan.smith@lecturelog.edu', status: 'detected', marked_at: '10:12 AM' },
  { student_name: 'Elena Gilbert', roll_number: 'CSE-203', email: 'elena.gilbert@lecturelog.edu', status: 'present', marked_at: '10:10 AM' },
  { student_name: 'Stefan Salvatore', roll_number: 'CSE-204', email: 'stefan.salvatore@lecturelog.edu', status: 'processing', marked_at: '10:08 AM' },
  { student_name: 'Damon Salvatore', roll_number: 'CSE-205', email: 'damon.salvatore@lecturelog.edu', status: 'present', marked_at: '10:05 AM' },
  { student_name: 'Bonnie Bennett', roll_number: 'CSE-206', email: 'bonnie.bennett@lecturelog.edu', status: 'present', marked_at: '10:03 AM' },
  { student_name: 'Caroline Forbes', roll_number: 'CSE-207', email: 'caroline.forbes@lecturelog.edu', status: 'detected', marked_at: '10:01 AM' },
  { student_name: 'Tyler Lockwood', roll_number: 'CSE-208', email: 'tyler.lockwood@lecturelog.edu', status: 'present', marked_at: '09:58 AM' },
  { student_name: 'Matt Donovan', roll_number: 'CSE-209', email: 'matt.donovan@lecturelog.edu', status: 'present', marked_at: '09:55 AM' },
  { student_name: 'Lexi Branson', roll_number: 'CSE-210', email: 'lexi.branson@lecturelog.edu', status: 'present', marked_at: '09:52 AM' },
  { student_name: 'Jeremy Gilbert', roll_number: 'CSE-211', email: 'jeremy.gilbert@lecturelog.edu', status: 'detected', marked_at: '09:49 AM' },
  { student_name: 'Alaric Saltzman', roll_number: 'CSE-212', email: 'alaric.saltzman@lecturelog.edu', status: 'present', marked_at: '09:46 AM' }
];

const Dashboard = () => {
  const [activeSessions, setActiveSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [liveAttendance, setLiveAttendance] = useState([]);
  const [stats, setStats] = useState({ totalStudents: 0, presentToday: 0, avgAttendance: 0 });
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [showPresentStudentsModal, setShowPresentStudentsModal] = useState(false);
  const [presentStudents, setPresentStudents] = useState([]);
  const [presentStudentsLoading, setPresentStudentsLoading] = useState(false);
  const [presentStudentsError, setPresentStudentsError] = useState('');
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const scrollRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 8);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 8);
    }
  };

  const handleEndSession = async (id) => {
    if (!window.confirm('Forcefully end this monitoring session?')) return;
    try {
      await api.post('/sessions/end', { id });
      setActiveSessions(prev => prev.filter(s => s.id !== id));
      if (selectedSessionId === id) setSelectedSessionId(null);
    } catch (err) {
      console.error('Failed to end session');
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return isoString;
    }
  };

  // Fetch initial data and setup socket
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const response = await api.get('/sessions');
        // Only show 'active' sessions in the horizontal bar
        const activeOnly = response.data.filter(s => s.status === 'active');
        setActiveSessions(activeOnly);
        
        // Also fetch total stats and all students
        try {
          const statsRes = await api.get('/students');
          setAllStudents(statsRes.data);
          setStats(prev => ({
            ...prev,
            totalStudents: statsRes.data.length
          }));
        } catch (e) { console.error("Stats fetch error", e); }
        
      } catch (err) {
        console.error('Failed to fetch sessions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

    // Initialize Socket
    const newSocket = io('http://localhost:5000');
    
    newSocket.on('session_started', (newSession) => {
      setActiveSessions(prev => [...prev, { ...newSession, status: 'active' }]);
    });

    newSocket.on('session_ended', ({ id }) => {
      setActiveSessions(prev => prev.filter(s => s.id !== id));
      if (selectedSessionId === id) setSelectedSessionId(null);
    });

    newSocket.on('attendance_update', (data) => {
      // 1. Update the sidebar feed
      setLiveAttendance(prev => [
        {
          student_name: data.student_name,
          subject_name: data.subject_name || 'Class',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'present'
        },
        ...prev.slice(0, 9) // Keep last 10
      ]);
      
      // 2. If this hit belongs to the selected session, update the modal list
      if (selectedSessionId === data.session_id) {
        setPresentStudents(prev => [data, ...prev]);
      }

      // 3. Update global stats instantly
      setStats(prev => {
        const newPresent = prev.presentToday + 1;
        // Simple avg recalculation (present / total registered for that class)
        // Note: For absolute accuracy, we'd use the group count we calculated in the card
        return { 
          ...prev, 
          presentToday: newPresent,
          avgAttendance: Math.round((newPresent / (prev.totalStudents || 1)) * 100) 
        };
      });
    });

    newSocket.on('student_registered', (newStudent) => {
      setAllStudents(prev => [...prev, newStudent]);
      setStats(prev => ({ ...prev, totalStudents: prev.totalStudents + 1 }));
    });

    return () => newSocket.close();
  }, [selectedSessionId]);

  // Live Attendance Sync for the selected session
  useEffect(() => {
    const syncAttendance = async () => {
      const sessionId = selectedSessionId || activeSessions[0]?.id;
      if (!sessionId) return;

      try {
        const response = await api.get(`/attendance/session/${sessionId}`);
        const students = (response.data || []).filter((item) => {
          const status = String(item.status || 'present').toLowerCase();
          return ['present', 'detected', 'processing'].includes(status);
        });
        
        setPresentStudents(students);
        // Also update Recent Arrivals list (limited to top 10 most recent)
        const sorted = [...students].sort((a, b) => 
          new Date(b.timestamp || b.marked_at) - new Date(a.timestamp || a.marked_at)
        );
        setLiveAttendance(sorted.slice(0, 10));
      } catch (err) {
        console.warn('Attendance sync error:', err.message);
      }
    };

    syncAttendance();
    // Refresh every 10 seconds for real-time monitoring
    const interval = setInterval(syncAttendance, 10000);
    return () => clearInterval(interval);
  }, [selectedSessionId, activeSessions]);

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [activeSessions]);


  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 400;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
      // checkScroll will be called by the onScroll event in JSX
    }
  };

  const formatStatusLabel = (status) => {
    if (!status) return 'Present';
    return String(status).replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const formatPresentTime = (value) => {
    if (!value) return 'Just now';
    const parsedDate = new Date(value);
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return value;
  };

  const getStudentName = (student) => student.student_name || student.name || 'Unknown Student';

  const openPresentStudentsModal = async () => {
    const sessionId = selectedSessionId || activeSessions[0]?.id;
    setShowPresentStudentsModal(true);
    setPresentStudentsError('');

    if (!sessionId) {
      setPresentStudents([]);
      return;
    }

    try {
      setPresentStudentsLoading(true);
      const response = await api.get(`/attendance/session/${sessionId}`);
      const students = (response.data || []).filter((item) => {
        const status = String(item.status || 'present').toLowerCase();
        return ['present', 'detected', 'processing'].includes(status);
      });
      setPresentStudents(students);
    } catch (err) {
      console.error('Failed to load present students:', err);
      setPresentStudents([]);
      setPresentStudentsError('Real-time attendance data is currently unavailable.');
    } finally {
      setPresentStudentsLoading(false);
    }
  };

  if (loading) return <div className="loader-container"><Loader2 className="animate-spin" size={40} color="var(--primary)" /></div>;

  const currentSession = selectedSessionId 
    ? activeSessions.find(s => s.id === selectedSessionId) 
    : null;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header-row">
        <div className="title-section">
          <h1>Dashboard</h1>
        </div>

        {currentSession && (
          <div className="dashboard-context-header">
            <span className="context-meta">Year {currentSession.year || 'N/A'}</span>
            <span className="context-meta">{currentSession.stream || 'Stream'}</span>
            <span className="context-teacher">{currentSession.teacher_name || 'Teacher'}</span>
          </div>
        )}

        <div className="header-actions">
          <button className="view-all-btn" onClick={() => setShowSessionsModal(true)}>View All Sessions</button>
          <button className="refresh-btn">Refresh Data</button>
        </div>
      </div>

      <div className="dashboard-grid-layout">
        {/* STATS ROW */}
        <div className="stats-row-container">
          <div className="featured-stat-card animate-scale-in" onClick={() => setShowSessionsModal(true)}>
            <div>
              <h4>ACTIVE SESSIONS</h4>
              <div className="value">{activeSessions.length}</div>
            </div>
            <div className="footer"><Activity size={14} className="animate-pulse" /><span>Currently being monitored</span></div>
          </div>

          <div className="infobar-container">
            {showLeftArrow && <button className="infobar-nav-btn left" onClick={() => scroll('left')}><ChevronLeft size={20} /></button>}
            <div className="active-sessions-infobar" ref={scrollRef} onScroll={checkScroll}>
              {activeSessions.length === 0 ? (
                <div className="no-active-sessions">
                  No active sessions found
                </div>
              ) : (
                activeSessions.map((session) => (
                  <div key={session.id} className={`session-mini-card ${selectedSessionId === session.id ? 'active' : ''}`} onClick={() => setSelectedSessionId(session.id)}>
                    <div className="session-card-main">
                      <div className="subject">{session.subject_name}</div>
                      <div className="teacher">{session.teacher_name}</div>
                    </div>

                    <div className="session-card-context">
                      <div className="location-cam">{session.classroom_name} • {session.camera_name || 'Front Cam'}</div>
                      <div className="time-range">{formatTime(session.start_time)} – {formatTime(session.end_time)}</div>
                    </div>

                    <div className="session-card-meta">
                      {session.year} • {session.stream}
                    </div>
                  </div>
                ))
              )}
            </div>
            {showRightArrow && <button className="infobar-nav-btn right" onClick={() => scroll('right')}><ChevronRight size={20} /></button>}
          </div>

          <div className="stats-separator"></div>

          <div className="mini-stats-group">

            <div className="mini-stat-card animate-scale-in">
              <h4>{currentSession ? 'STUDENTS IN CLASS' : 'TOTAL STUDENTS'}</h4>
              <div className="value">
                {currentSession 
                  ? allStudents.filter(s => {
                      const sessionYear = String(currentSession.year || '').trim();
                      const sessionStream = String(currentSession.stream || '').trim().toLowerCase();
                      const studentYear = String(s.year || '').trim();
                      const studentStream = String(s.stream || '').trim().toLowerCase();
                      
                      return studentYear === sessionYear && studentStream === sessionStream;
                    }).length
                  : 0
                }
              </div>
              <div className="stat-meta-tags">
                <span className="meta-tag">
                  {currentSession ? `YEAR ${currentSession.year}` : 'ALL YEARS'}
                </span>
                <span className="meta-tag">
                  {currentSession ? currentSession.stream : 'ALL STREAMS'}
                </span>
              </div>
              <p className="footer">
                {currentSession ? 'Registered for this group' : 'Registered in system'}
              </p>
            </div>

            <div
              className="mini-stat-card animate-scale-in grey-card clickable-stat-card"
              role="button"
              tabIndex={0}
              onClick={openPresentStudentsModal}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  openPresentStudentsModal();
                }
              }}
            >
              <h4>PRESENT TODAY</h4>
              <div className="value">
                {currentSession ? presentStudents.length : 0}
              </div>
              <p className="footer">Students identified</p>
            </div>

            <div
              className="mini-stat-card animate-scale-in attendance-progress-card"
              style={{
                background: (() => {
                  if (!currentSession) return 'rgba(234, 241, 247, 0.6)';
                  const groupTotal = allStudents.filter(s => 
                    String(s.year).trim() === String(currentSession.year).trim() && 
                    String(s.stream).trim().toLowerCase() === String(currentSession.stream).toLowerCase()
                  ).length;
                  const percent = groupTotal > 0 ? Math.round((presentStudents.length / groupTotal) * 100) : 0;
                  const color = percent >= 80 ? '#d1fae5' : percent >= 50 ? '#fef3c7' : '#fee2e2';
                  return `linear-gradient(90deg, ${color} 0%, ${color} ${percent}%, rgba(234, 241, 247, 0.6) ${percent}%, rgba(234, 241, 247, 0.6) 100%)`;
                })()
              }}
            >
              <h4>AVG. ATTENDANCE</h4>
              <div className="value">
                {(() => {
                  if (!currentSession) return '0%';
                  const groupTotal = allStudents.filter(s => 
                    String(s.year).trim() === String(currentSession.year).trim() && 
                    String(s.stream).trim().toLowerCase() === String(currentSession.stream).toLowerCase()
                  ).length;
                  return groupTotal > 0 ? `${Math.round((presentStudents.length / groupTotal) * 100)}%` : '0%';
                })()}
              </div>
              <p className="footer">Overall performance</p>
            </div>
          </div>
        </div>

        {/* MONITORING VIEW */}
        <div className="analytics-section animate-fade-in">
          <div className="section-header-row">
            <div>
              <h3>Live Monitor</h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
                {currentSession ? `Feed: ${currentSession.classroom_name}` : 'No active feed'}
              </p>
            </div>
            <div className={`status-badge-compact ${currentSession ? 'status-present' : 'status-processing'}`}>
              <div className={`dot ${currentSession ? 'busy' : ''}`}></div>
              <span>{currentSession ? 'Active' : 'Idle'}</span>
            </div>
          </div>

          <div className="video-stream-wrapper">
            {currentSession ? (
              <img 
                src={`${AI_SERVICE_URL}/video_feed?v=${selectedSessionId || currentSession.id}`} 
                alt="Live Feed" 
                className="live-video-feed" 
              />
            ) : (
              <div className="no-active-sessions" style={{ border: 'none', background: 'transparent' }}>
                Select an active session to view live feed
              </div>
            )}
          </div>
        </div>

        {/* RECENT ARRIVALS */}
        <div className="recent-arrivals-section animate-fade-in">
          <div className="section-header-row">
            <h3>Recent Arrivals</h3>
            <button className="btn-header-action"><Plus size={14} /><span>Directory</span></button>
          </div>

          <div className="arrivals-list">
            {currentSession ? (
              liveAttendance.length > 0 ? (
                liveAttendance.map((item, i) => (
                  <div key={i} className="arrival-item animate-fade-in">
                    <div className={`avatar-ring ring-${['pink', 'green', 'blue', 'yellow'][i % 4]}`}>
                      <img 
                        src={`http://localhost:5000/public/students/${item.student_id || item.id}.jpg`} 
                        alt={item.student_name}
                        onError={(e) => {
                          e.target.onerror = null; 
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.student_name)}&background=random`;
                        }}
                      />
                    </div>
                    <div className="arrival-info">
                      <h5>{item.student_name}</h5>
                      <p>Attended <strong>{item.subject_name}</strong></p>
                    </div>
                    <div className={`status-badge-compact ${item.status === 'detected' ? 'status-detected' : item.status === 'processing' ? 'status-processing' : 'status-present'}`}>
                      {item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : 'Present'}
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-active-sessions" style={{ border: 'none', background: 'transparent', textAlign: 'center', height: '100%', padding: '2rem' }}>
                  No detections yet for this session
                </div>
              )
            ) : (
              <div className="no-active-sessions" style={{ border: 'none', background: 'transparent', textAlign: 'center', height: '100%', padding: '2rem' }}>
                Select an active session to see real-time arrivals
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SESSIONS EXPLORER MODAL */}
      {showSessionsModal && (
        <div className="dashboard-modal-overlay animate-fade-in" onClick={() => setShowSessionsModal(false)}>
          <div className="dashboard-modal-container animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="dashboard-modal-header">
              <h3>Active Monitoring Sessions</h3>
              <button className="dashboard-modal-close" onClick={() => setShowSessionsModal(false)} aria-label="Close active sessions popup"><X size={20} /></button>
            </div>

            <div className="dashboard-modal-body explorer-grid">
              {activeSessions.length === 0 ? (
                <div className="no-active-sessions" style={{ gridColumn: '1 / -1', minHeight: '200px', margin: '2rem' }}>
                  No active sessions currently being monitored
                </div>
              ) : (
                activeSessions.map((session) => (
                  <div key={session.id} className="explorer-card" onClick={() => { setSelectedSessionId(session.id); setShowSessionsModal(false); }}>
                    <div className="explorer-card-header">
                      <div className="icon-box"><MonitorPlay size={20} color="var(--primary)" /></div>
                      <div className="header-info">
                        <div className="subject">{session.subject_name}</div>
                        <div className="room">{session.classroom_name}</div>
                      </div>
                    </div>

                    <div className="explorer-card-body">
                      <div className="detail-row"><User size={14} /><span>{session.teacher_name || 'Teacher'}</span></div>
                      <div className="detail-row"><Camera size={14} /><span>{session.camera_name || 'Front Cam'}</span></div>
                      <div className="detail-row"><Clock size={14} /><span>{session.start_time} - {session.end_time}</span></div>
                      <div className="detail-row" style={{ marginTop: '0.35rem', paddingTop: '0.35rem', borderTop: '1px solid #eef2f7' }}><span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Year {session.year} • {session.stream}</span></div>
                    </div>

                    <div className="explorer-card-footer">
                      <div className="live-indicator"><div className="dot active animate-pulse"></div><span>Live Feed Active</span></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TOTAL PRESENT STUDENTS MODAL */}
      {showPresentStudentsModal && (
        <div className="dashboard-modal-overlay animate-fade-in" onClick={() => setShowPresentStudentsModal(false)}>
          <div className="dashboard-modal-container present-students-modal animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="dashboard-modal-header">
              <div>
                <h3>Total Present Students</h3>
                <p>{currentSession?.subject_name || 'Current Session'} • {currentSession?.classroom_name || 'Classroom'}</p>
              </div>
              <button className="dashboard-modal-close" onClick={() => setShowPresentStudentsModal(false)} aria-label="Close present students popup"><X size={20} /></button>
            </div>

            <div className="dashboard-modal-body present-students-list">
              {presentStudentsLoading && (
                <div className="modal-state-message">
                  <Loader2 className="animate-spin" size={22} />
                  <span>Loading present students...</span>
                </div>
              )}

              {!presentStudentsLoading && presentStudentsError && (
                <div className="modal-inline-note">{presentStudentsError}</div>
              )}

              {!presentStudentsLoading && (!currentSession || presentStudents.length === 0) && (
                <div className="no-active-sessions" style={{ border: 'none', background: 'transparent', minHeight: '300px', gridColumn: '1 / -1' }}>
                  {!currentSession 
                    ? "Select an active session to see present students" 
                    : "No students have been identified for this session yet"}
                </div>
              )}

              {!presentStudentsLoading && currentSession && presentStudents.map((student, index) => {
                const studentName = getStudentName(student);
                const statusLabel = formatStatusLabel(student.status);

                return (
                  <div key={student.id || `${studentName}-${index}`} className="present-student-item animate-fade-in">
                    <div className={`avatar-ring ring-${['pink', 'green', 'blue', 'yellow'][index % 4]}`}>
                      <img 
                        src={`http://localhost:5000/public/students/${student.student_id || student.id}.jpg`} 
                        alt={studentName}
                        onError={(e) => {
                          e.target.onerror = null; 
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=random`;
                        }}
                      />
                    </div>

                    <div className="present-student-main">
                      <h5>{studentName}</h5>
                      <span>Roll No. {student.roll_number || student.rollNo || 'N/A'}</span>
                    </div>

                    <div className="present-student-email">
                      <Mail size={14} />
                      <span>{student.email || 'Email not available'}</span>
                    </div>

                    <div className="present-student-meta">
                      <div className={`status-badge-compact status-${String(student.status || 'present').toLowerCase()}`}>{statusLabel}</div>
                      <div className="present-time"><Clock size={13} />{formatPresentTime(student.marked_at || student.timestamp)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
