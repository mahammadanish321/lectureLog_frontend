import React, { useState, useEffect, useRef } from 'react';
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
  const [stats] = useState(DEMO_STATS);
  const [activeSessions] = useState(DEMO_ACTIVE_SESSIONS);
  const [liveAttendance] = useState(DEMO_ATTENDANCE);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [showPresentStudentsModal, setShowPresentStudentsModal] = useState(false);
  const [presentStudents, setPresentStudents] = useState(DEMO_PRESENT_STUDENTS);
  const [presentStudentsLoading, setPresentStudentsLoading] = useState(false);
  const [presentStudentsError, setPresentStudentsError] = useState('');
  const [loading, setLoading] = useState(true);

  const scrollRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      // Allow a tiny buffer for pixel rounding
      setShowLeftArrow(scrollLeft > 8);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 8);
    }
  };

  useEffect(() => {
    // Initial check and clear loader
    const timer = setTimeout(() => {
      setLoading(false);
      checkScroll();
    }, 800);

    // Add resize listener
    window.addEventListener('resize', checkScroll);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkScroll);
    };
  }, [activeSessions]); // Re-check when sessions data changes


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
      setPresentStudents(DEMO_PRESENT_STUDENTS);
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
      setPresentStudents(DEMO_PRESENT_STUDENTS);
      setPresentStudentsError('Showing preview data while the attendance service is unavailable.');
    } finally {
      setPresentStudentsLoading(false);
    }
  };

  if (loading) return <div className="loader-container"><Loader2 className="animate-spin" size={40} color="var(--primary)" /></div>;


  const currentSession = activeSessions.find(s => s.id === selectedSessionId) || activeSessions[0];

  return (
    <div className="dashboard-container">
      <div className="dashboard-header-row">
        <div className="title-section">
          <h1>Dashboard</h1>
        </div>

        <div className="dashboard-context-header">
          <span className="context-meta">Year 2</span>
          <span className="context-meta">CS Stream</span>
          <span className="context-teacher">Dr. Sarah Johnson</span>
        </div>

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
              {activeSessions.map((session) => (
                <div key={session.id} className={`session-mini-card ${selectedSessionId === session.id ? 'active' : ''}`} onClick={() => setSelectedSessionId(session.id)}>
                  <div className="session-card-main">
                    <div className="subject">{session.subject_name}</div>
                    <div className="teacher">{session.teacher_name}</div>
                  </div>

                  <div className="session-card-context">
                    <div className="location-cam">{session.classroom_name} • {session.camera_name || 'Front Cam'}</div>
                    <div className="time-range">{session.start_time} – {session.end_time}</div>
                  </div>

                  <div className="session-card-meta">
                    {session.year} • {session.stream}
                  </div>
                </div>
              ))}
            </div>
            {showRightArrow && <button className="infobar-nav-btn right" onClick={() => scroll('right')}><ChevronRight size={20} /></button>}
          </div>

          <div className="stats-separator"></div>

          <div className="mini-stats-group">

            <div className="mini-stat-card animate-scale-in">
              <h4>TOTAL STUDENTS</h4>
              <div className="value">{stats.totalStudents}</div>
              <div className="stat-meta-tags">
                <span className="meta-tag">YEAR 2</span>
                <span className="meta-tag">CS STREAM</span>
              </div>
              <p className="footer">Registered in system</p>
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
              <div className="value">{stats.presentToday}</div>
              <p className="footer">Students identified</p>
            </div>

            <div
              className="mini-stat-card animate-scale-in attendance-progress-card"
              style={{
                background: `linear-gradient(90deg, ${stats.avgAttendance >= 80 ? '#d1fae5' : stats.avgAttendance >= 50 ? '#fef3c7' : '#fee2e2'} 0%, ${stats.avgAttendance >= 80 ? '#d1fae5' : stats.avgAttendance >= 50 ? '#fef3c7' : '#fee2e2'} ${stats.avgAttendance}%, rgba(234, 241, 247, 0.6) ${stats.avgAttendance}%, rgba(234, 241, 247, 0.6) 100%)`,
              }}
            >
              <h4>AVG. ATTENDANCE</h4>
              <div className="value">{stats.avgAttendance}%</div>
              <p className="footer">Overall performance</p>
            </div>
          </div>
        </div>

        {/* MONITORING VIEW */}
        <div className="analytics-section animate-fade-in">
          <div className="section-header-row">
            <div>
              <h3>Live Monitor</h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>Feed: Classroom Lab-01</p>
            </div>
            <div className={`status-badge-compact status-present`}><div className="dot busy"></div><span>Active</span></div>
          </div>

          <div className="video-stream-wrapper">
            <img src={`${AI_SERVICE_URL}/video_feed?v=${selectedSessionId || 'default'}`} alt="Live Feed" className="live-video-feed" />
          </div>
        </div>

        {/* RECENT ARRIVALS */}
        <div className="recent-arrivals-section animate-fade-in">
          <div className="section-header-row">
            <h3>Recent Arrivals</h3>
            <button className="btn-header-action"><Plus size={14} /><span>Directory</span></button>
          </div>

          <div className="arrivals-list">
            {liveAttendance.map((item, i) => (
              <div key={i} className="arrival-item animate-fade-in">
                <div className={`avatar-ring ring-${['pink', 'green', 'blue', 'yellow'][i % 4]}`}>
                  <img src={`https://ui-avatars.com/api/?name=${item.student_name}&background=random`} alt={item.student_name} />
                </div>
                <div className="arrival-info">
                  <h5>{item.student_name}</h5>
                  <p>Attended <strong>{item.subject_name}</strong></p>
                </div>
                <div className="status-badge-compact status-present">Present</div>
              </div>
            ))}
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
              {activeSessions.map((session) => (
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
                    <div className="detail-row" style={{ marginTop: '0.35rem', paddingTop: '0.35rem', borderTop: '1px solid #eef2f7' }}><span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>{session.year} • {session.stream}</span></div>
                  </div>

                  <div className="explorer-card-footer">
                    <div className="live-indicator"><div className="dot active animate-pulse"></div><span>Live Feed Active</span></div>
                  </div>
                </div>
              ))}
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

              {!presentStudentsLoading && presentStudents.length === 0 && (
                <div className="modal-state-message">No present students found for this session.</div>
              )}

              {!presentStudentsLoading && presentStudents.map((student, index) => {
                const studentName = getStudentName(student);
                const statusLabel = formatStatusLabel(student.status);

                return (
                  <div key={student.id || `${studentName}-${index}`} className="present-student-item animate-fade-in">
                    <div className={`avatar-ring ring-${['pink', 'green', 'blue', 'yellow'][index % 4]}`}>
                      <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=random`} alt={studentName} />
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
