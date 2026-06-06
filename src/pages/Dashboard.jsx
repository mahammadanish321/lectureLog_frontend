import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import OnboardingTour from '../components/OnboardingTour/OnboardingTour';
import { adminTourSteps, teacherTourSteps } from '../config/tourSteps';
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
  RefreshCw,
} from 'lucide-react';
import './Dashboard.css';

const AI_SERVICE_URL = 'http://localhost:8001';
const CAMERA_BACKEND_URL = 'http://localhost:8002'; // Corrected to use the separate stream backend

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
  { student_name: 'Alex Rivera', roll_number: 'CSE-201', email: 'alex.rivera@Merge.edu', status: 'present', marked_at: '10:14 AM' },
  { student_name: 'Jordan Smith', roll_number: 'CSE-202', email: 'jordan.smith@Merge.edu', status: 'detected', marked_at: '10:12 AM' },
  { student_name: 'Elena Gilbert', roll_number: 'CSE-203', email: 'elena.gilbert@Merge.edu', status: 'present', marked_at: '10:10 AM' },
  { student_name: 'Stefan Salvatore', roll_number: 'CSE-204', email: 'stefan.salvatore@Merge.edu', status: 'processing', marked_at: '10:08 AM' },
  { student_name: 'Damon Salvatore', roll_number: 'CSE-205', email: 'damon.salvatore@Merge.edu', status: 'present', marked_at: '10:05 AM' },
  { student_name: 'Bonnie Bennett', roll_number: 'CSE-206', email: 'bonnie.bennett@Merge.edu', status: 'present', marked_at: '10:03 AM' },
  { student_name: 'Caroline Forbes', roll_number: 'CSE-207', email: 'caroline.forbes@Merge.edu', status: 'detected', marked_at: '10:01 AM' },
  { student_name: 'Tyler Lockwood', roll_number: 'CSE-208', email: 'tyler.lockwood@Merge.edu', status: 'present', marked_at: '09:58 AM' },
  { student_name: 'Matt Donovan', roll_number: 'CSE-209', email: 'matt.donovan@Merge.edu', status: 'present', marked_at: '09:55 AM' },
  { student_name: 'Lexi Branson', roll_number: 'CSE-210', email: 'lexi.branson@Merge.edu', status: 'present', marked_at: '09:52 AM' },
  { student_name: 'Jeremy Gilbert', roll_number: 'CSE-211', email: 'jeremy.gilbert@Merge.edu', status: 'detected', marked_at: '09:49 AM' },
  { student_name: 'Alaric Saltzman', roll_number: 'CSE-212', email: 'alaric.saltzman@Merge.edu', status: 'present', marked_at: '09:46 AM' }
];

const Dashboard = () => {
  const { user, shouldShowTour, markTourComplete } = useAuth();
  const tourSteps = user?.role === 'admin' ? adminTourSteps : teacherTourSteps;
  const [activeSessions, setActiveSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [liveAttendance, setLiveAttendance] = useState([]);
  const [activeArrivalsTab, setActiveArrivalsTab] = useState('recent'); // 'recent' or 'terminal'
  const [showFullTerminalModal, setShowFullTerminalModal] = useState(false);
  const [aiConsoleLogs, setAiConsoleLogs] = useState([
    { type: 'info', text: '[SYS] Initialize AI Face Recognition Service (Facenet512)...' },
    { type: 'info', text: '[SYS] Ready. Listening for stdout/stderr logs...' }
  ]);
  const [stats, setStats] = useState({ totalStudents: 0, presentToday: 0, avgAttendance: 0 });
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoContainerRef = useRef(null);
  const terminalModalBodyRef = useRef(null);
  const terminalEndRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const [showPresentStudentsModal, setShowPresentStudentsModal] = useState(false);
  const [presentStudents, setPresentStudents] = useState([]);
  const [presentStudentsLoading, setPresentStudentsLoading] = useState(false);
  const [presentStudentsError, setPresentStudentsError] = useState('');
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiStatus, setAiStatus] = useState({ online: false, displayStatus: 'Connecting...', isError: false });
  const selectedSessionIdRef = useRef(selectedSessionId);
  // Track whether the user has MANUALLY chosen a session — prevents auto-switching on 60s refresh
  const userManuallySelectedRef = useRef(false);
  // Multi-camera feed selection
  const [selectedClassroomId, setSelectedClassroomId] = useState(null);
  const [selectedCameraUrl, setSelectedCameraUrl] = useState(null);

  // Keep the ref in sync with the state
  useEffect(() => {
    selectedSessionIdRef.current = selectedSessionId;
    // Reset camera selections when session changes
    setSelectedClassroomId(null);
    setSelectedCameraUrl(null);
  }, [selectedSessionId]);

  const logQueueRef = useRef([]);
  const prevScrollHeightRef = useRef(0);
  const terminalInnerWrapperRef = useRef(null);



  // Fetch log history on full terminal modal open
  useEffect(() => {
    if (showFullTerminalModal && window.electronAPI?.getAILogs) {
      logQueueRef.current = []; // Clear queue to avoid duplicate history processing
      prevScrollHeightRef.current = 0; // Reset scroll height ref to prevent initial transition
      isAtBottomRef.current = true; // Always start at bottom on open
      window.electronAPI.getAILogs()
        .then(logs => {
          setAiConsoleLogs(logs.map(item => ({
            type: item.type === 'stderr' ? 'error' : 'log',
            text: item.text
          })));

          // Force scroll to bottom immediately after history loads
          setTimeout(() => {
            if (terminalModalBodyRef.current) {
              terminalModalBodyRef.current.scrollTo({
                top: terminalModalBodyRef.current.scrollHeight,
                behavior: 'auto'
              });
            }
          }, 100);
        })
        .catch(err => console.error('Failed to retrieve AI logs:', err));
    }
  }, [showFullTerminalModal]);

  // Auto-scroll FLIP animation for terminal modal when logs update
  useEffect(() => {
    if (!showFullTerminalModal) return;

    const container = terminalModalBodyRef.current;
    if (!container) return;

    const newScrollHeight = container.scrollHeight;
    const prevScrollHeight = prevScrollHeightRef.current;
    const diff = newScrollHeight - prevScrollHeight;

    if (diff > 0 && prevScrollHeight > 0 && isAtBottomRef.current) {
      const wrapper = terminalInnerWrapperRef.current;
      if (wrapper) {
        // 1. Instantly jump the scroll to the new bottom
        container.scrollTop = newScrollHeight - container.clientHeight;

        // 2. Invert: shift visual wrapper down by the height difference (no transition)
        wrapper.style.transition = 'none';
        wrapper.style.transform = `translateY(${diff}px)`;

        // Force a style recalculation (reflow) to flush styles immediately
        wrapper.offsetHeight;

        // 3. Play: smoothly slide the translation back to 0
        wrapper.style.transition = 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)'; // easeOutExpo
        wrapper.style.transform = 'translateY(0px)';
      }
    } else {
      // On initial load or if not at bottom, snap or maintain position
      if (isAtBottomRef.current) {
        container.scrollTop = newScrollHeight - container.clientHeight;
      }
    }

    prevScrollHeightRef.current = newScrollHeight;
  }, [aiConsoleLogs, showFullTerminalModal]);



  // Queue processor for incoming live logs (1-second cooldown)
  useEffect(() => {
    if (!showFullTerminalModal) {
      logQueueRef.current = [];
      return;
    }

    const intervalId = setInterval(() => {
      if (logQueueRef.current.length > 0) {
        const nextLog = logQueueRef.current.shift();
        setAiConsoleLogs(prev => [...prev, nextLog].slice(-150));
      }
    }, 1000); // Render one by one every 1 second

    return () => clearInterval(intervalId);
  }, [showFullTerminalModal]);

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

  const extractTimeForSort = (val) => {
    if (!val) return '23:59:59';
    const str = String(val);
    if (str.includes('Z')) {
      return new Date(str).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    if (str.includes('T')) {
      return str.split('T')[1].split('.')[0];
    }
    return str;
  };

  const formatTime = (time) => {
    if (!time) return '--:--';
    const timeStr = String(time);

    // 1. Real Timestamp (UTC) -> Convert to local
    if (timeStr.includes('Z')) {
      try {
        return new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch (e) { return timeStr; }
    }

    // 2. Wall Clock ISO or Raw Time
    let t = timeStr;
    if (timeStr.includes('T')) t = timeStr.split('T')[1].split('.')[0];

    if (t.includes(':')) {
      const parts = t.split(':');
      if (parts.length >= 2) {
        let hours = parseInt(parts[0]);
        const minutes = parts[1];
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${hours}:${minutes} ${ampm}`;
      }
    }
    return timeStr;
  };

  const getTimeRemaining = (startTime) => {
    if (!startTime) return null;
    const now = new Date();
    const timeOnly = extractTimeForSort(startTime);
    const [h, m] = timeOnly.split(':');
    const target = new Date();
    target.setHours(parseInt(h), parseInt(m), 0, 0);

    const diff = target - now;
    if (diff <= 0) return "Starting now";

    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `in ${mins} mins`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `in ${hours}h ${remMins}m`;
  };

  // Fetch initial data and setup socket
  const [currentTime, setCurrentTime] = useState(new Date());

  // 1. Heartbeat Timer: Update every 10 seconds to react to time changes (and testing)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const getSessionStatus = (session, now) => {
    const timeStr = now.toTimeString().split(' ')[0];
    if (timeStr >= session.start_time && timeStr < session.end_time) return 'active';
    if (timeStr < session.start_time) return 'upcoming';
    return 'ended';
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const response = await api.get('/sessions');
        const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        
        // Auto-cleanup: Identify and permanently delete "ghost" schedules (no teacher assigned)
        const ghostSchedules = response.data.filter(s => s.status === 'scheduled' && !s.teacher_name && String(s.id).startsWith('routine_'));
        for (const ghost of ghostSchedules) {
          try {
            const id = ghost.id.replace('routine_', '');
            await api.delete(`/schedules/${id}`);
            console.log(`Automatically deleted ghost schedule: ${id}`);
          } catch (e) { console.error('Failed to delete ghost schedule:', e); }
        }

        let allRelevantSessions = response.data.filter(s => {
          if (!s.teacher_name) return false; // Hide from UI immediately
          if (s.status === 'active') return true;
          if (s.status !== 'scheduled') return false;
          
          try {
            const sessionDateIST = new Date(s.start_time).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
            return sessionDateIST === todayIST;
          } catch (err) {
            return true;
          }
        });
        if (user?.role === 'teacher') {
          allRelevantSessions = allRelevantSessions.filter(s =>
            String(s.teacher_name).trim().toLowerCase() === String(user.name).trim().toLowerCase()
          );
        }

        // DEDUPLICATION SAFETY: Ensure unique IDs only
        const uniqueSessions = [];
        const seenIds = new Set();
        allRelevantSessions.forEach(s => {
          if (!seenIds.has(s.id)) {
            seenIds.add(s.id);
            uniqueSessions.push(s);
          }
        });

        // Sort sessions chronologically by start time, handling both ISO strings (custom) and HH:MM:SS (routine)
        uniqueSessions.sort((a, b) => extractTimeForSort(a.start_time).localeCompare(extractTimeForSort(b.start_time)));

        setActiveSessions(uniqueSessions);

        // Auto-select the first active session ONLY on initial load (not on 60s refresh if user has already picked one)
        const firstActive = uniqueSessions.find(s => s.status === 'active');
        if (firstActive && !userManuallySelectedRef.current && !selectedSessionIdRef.current) {
          setSelectedSessionId(firstActive.id);
        }
        // If the user had a session selected and it is still in the list, keep it selected
        if (userManuallySelectedRef.current && selectedSessionIdRef.current) {
          const stillExists = uniqueSessions.find(s => s.id === selectedSessionIdRef.current);
          if (!stillExists) {
            // Session was removed — reset to first active
            userManuallySelectedRef.current = false;
            setSelectedSessionId(firstActive?.id || null);
          }
        }

        // Also fetch total stats and all students
        try {
          const statsRes = await api.get('/students');
          setAllStudents(statsRes.data);

          let relevantStudents = statsRes.data;
          // For teachers, we might want to filter 'Total Students' to only show their current class size
          // but for now, we'll keep the global count or use the session-specific logic in the card.

          setStats(prev => ({
            ...prev,
            totalStudents: relevantStudents.length
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
    const newSocket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000');

    newSocket.on('connect', () => {
      if (user) {
        console.log('[Dashboard Socket] Connected. Authenticating user organization:', user.organization_id);
        newSocket.emit('authenticate', {
          id: user.id,
          role: user.role,
          organization_id: user.organization_id,
          year: user.year,
          stream: user.stream
        });
      }
    });

    newSocket.on('session_started', (newSession) => {
      console.log('Real-time: Session started', newSession.id);
      const sessionWithStatus = { ...newSession, status: 'active' };

      // Use the 'user' from the higher scope (captured by closure)
      const isForMe = !user || user.role === 'admin' ||
        String(newSession.teacher_name).trim().toLowerCase() === String(user.name).trim().toLowerCase();

      if (isForMe) {
        setActiveSessions(prev => {
          if (prev.find(s => s.id === newSession.id)) return prev;
          const updated = [...prev, sessionWithStatus];
          return updated.sort((a, b) => extractTimeForSort(a.start_time).localeCompare(extractTimeForSort(b.start_time)));
        });

        // For teachers, auto-switch only if they haven't manually picked a different one
        if (user?.role === 'teacher' && !userManuallySelectedRef.current) {
          setSelectedSessionId(newSession.id);
        }
      }
    });

    newSocket.on('session_ended', ({ id }) => {
      console.log('Real-time: Session ended', id);
      setActiveSessions(prev => prev.filter(s => s.id !== id));

      if (selectedSessionIdRef.current === id) {
        // The currently selected session ended — reset manual lock
        userManuallySelectedRef.current = false;
        setSelectedSessionId(null);
      }
    });

    newSocket.on('attendance_update', (data) => {
      // Safety isolation check: filter out data belonging to other organizations
      if (data.organization_id && user?.organization_id && String(data.organization_id) !== String(user.organization_id)) {
        console.log('[Dashboard Socket] Ignored attendance update from different organization:', data.organization_id);
        return;
      }

      // Update global stats
      setStats(prev => ({
        ...prev,
        presentToday: prev.presentToday + 1
      }));

      // Only handle if this update belongs to the current active/selected session
      if (selectedSessionIdRef.current === data.session_id) {
        // 1. Update the sidebar feed
        setLiveAttendance(prev => {
          if (prev.some(p => p.student_id === data.student_id)) return prev;
          return [
            {
              student_id: data.student_id,
              student_name: data.student_name,
              subject_name: data.subject_name || 'Class',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              status: 'present',
              confidence: data.confidence || null,
              threshold: data.threshold || 0.60
            },
            ...prev.slice(0, 9)
          ];
        });

        // 2. Update the present students list
        setPresentStudents(prev => {
          if (prev.some(p => p.student_id === data.student_id)) return prev;
          return [data, ...prev];
        });
      }
    });

    newSocket.on('ai_status_update', (data) => {
      console.log('AI Status Update (from Backend):', data.displayStatus);
      setAiStatus(data);
    });

    // ── AI Polling: ONLY for admin on desktop (Refinement #3, #7, #9, #10) ──
    const isDesktopAdmin = !!(window.electronAPI?.isElectron) && user?.role === 'admin';
    let aiPollingInterval = null;
    let aiCrashCleanup = null;
    let aiLogCleanup = null;

    if (isDesktopAdmin) {
      let failCount = 0;
      const pollLocalAI = async () => {
        try {
          const resp = await fetch(`${AI_SERVICE_URL}/system/status`);
          if (resp.ok) {
            const data = await resp.json();
            failCount = 0;
            setAiStatus({
              online: true,
              displayStatus: data.cameras_open.length > 0 ? 'AI Scanning Active' : 'AI Service Idle',
              isError: !!data.global_error,
              details: data
            });
          } else {
            throw new Error('Not OK');
          }
        } catch (err) {
          failCount++;
          if (failCount >= 3) {
            setAiStatus(prev => ({ ...prev, online: false, displayStatus: 'AI Service Offline' }));
          }
        }
      };

      aiPollingInterval = setInterval(pollLocalAI, 5000);

      // Listen for AI crash notifications from Electron main process
      if (window.electronAPI?.onAIProcessCrash) {
        aiCrashCleanup = window.electronAPI.onAIProcessCrash((data) => {
          console.warn('[Dashboard] AI process crashed:', data);
          setAiStatus({
            online: false,
            displayStatus: data.crashCount > 2 
              ? 'AI Crashed — Manual Restart Required' 
              : `AI Restarting (attempt ${data.crashCount}/2)...`,
            isError: true
          });
        });
      }

      if (window.electronAPI?.onAILog) {
        aiLogCleanup = window.electronAPI.onAILog((data) => {
          logQueueRef.current.push({
            type: data.type === 'stderr' ? 'error' : 'log', 
            text: data.text 
          });
        });
      }
    } else {
      // Non-admin or web: Fetch status from backend and poll it
      const fetchStatusFromBackend = async () => {
        try {
          const response = await api.get('/recognition/status');
          setAiStatus(response.data);
        } catch (err) {
          console.warn('Failed to fetch AI status from backend:', err.message);
        }
      };

      fetchStatusFromBackend();
      aiPollingInterval = setInterval(fetchStatusFromBackend, 10000);
    }

    // Refresh sessions every 60 seconds as a final automation guard
    const sessionRefreshInterval = setInterval(fetchInitialData, 60000);

    return () => {
      console.log('Cleaning up socket connection and all intervals...');
      clearInterval(sessionRefreshInterval);
      if (aiPollingInterval) clearInterval(aiPollingInterval);
      if (aiCrashCleanup) aiCrashCleanup(); // Remove Electron listener
      if (aiLogCleanup) aiLogCleanup(); // Remove Log listener
      newSocket.off('session_started');
      newSocket.off('session_ended');
      newSocket.off('attendance_update');
      newSocket.off('ai_status_update');
      newSocket.close();
    };
  }, []); // Run once on mount

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

  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return;

    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const refreshFeed = () => {
    const img = document.querySelector('.live-video-feed');
    if (img) {
      const currentSrc = img.src.split('&refresh=')[0];
      img.src = `${currentSrc}&refresh=${Date.now()}`;
    }
  };

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

  const handleTerminalScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const threshold = 15;
    const atBottom = scrollHeight - scrollTop - clientHeight <= threshold;
    isAtBottomRef.current = atBottom;
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

  const parseLogLine = (text) => {
    // 1. Primary format: [HH:MM:SS] icon [TAG] message
    const match = text.match(/^\[(\d{2}:\d{2}:\d{2})\]\s*(.*?)\s*\[(.*?)\]\s*(.*)$/);
    if (match) {
      const [_, timestamp, icon, tag, message] = match;
      
      let tagColor = '#38bdf8'; // default cyan
      if (tag === 'SYSTEM') tagColor = '#f43f5e'; // rose/red
      else if (tag === 'AI') tagColor = '#fb923c'; // orange
      else if (tag === 'SYNC') tagColor = '#60a5fa'; // blue
      else if (tag === 'CAMERA') tagColor = '#34d399'; // green
      
      return (
        <>
          <span style={{ color: '#64748b', marginRight: '0.5rem', fontFamily: 'monospace' }}>[{timestamp}]</span>
          {icon && <span style={{ marginRight: '0.5rem' }}>{icon}</span>}
          <span style={{ color: tagColor, fontWeight: 'bold', marginRight: '0.5rem', fontFamily: 'monospace' }}>[{tag}]</span>
          <span style={{ color: '#cbd5e1' }}>{message}</span>
        </>
      );
    }
    
    // 2. Secondary format: [TAG] message (e.g. [SYS] Initialize...)
    const secondaryMatch = text.match(/^\[(.*?)\]\s*(.*)$/);
    if (secondaryMatch) {
      const [_, tag, message] = secondaryMatch;
      let tagColor = '#94a3b8';
      if (tag === 'SYS') tagColor = '#a855f7'; // purple for system bootstrap
      return (
        <>
          <span style={{ color: tagColor, fontWeight: 'bold', marginRight: '0.5rem', fontFamily: 'monospace' }}>[{tag}]</span>
          <span style={{ color: '#cbd5e1' }}>{message}</span>
        </>
      );
    }
    
    // 3. Warning / Error fallback
    if (text.toLowerCase().includes('warning') || text.includes('deprecation')) {
      return <span style={{ color: '#fbbf24' }}>{text}</span>;
    }
    if (text.toLowerCase().includes('error') || text.toLowerCase().includes('failed')) {
      return <span style={{ color: '#f87171' }}>{text}</span>;
    }
    
    return <span>{text}</span>;
  };

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

  const activeSession = activeSessions.find(s => s.status === 'active');
  const upcomingSessions = activeSessions.filter(s => s.status === 'scheduled');
  const nextSession = upcomingSessions[0];

  const currentSession = selectedSessionId
    ? activeSessions.find(s => s.id === selectedSessionId)
    : activeSession || null; // Only auto-select if it's currently ACTIVE, require click for scheduled

  const sessionYear = currentSession ? String(currentSession.year || '').trim() : '';
  const sessionStream = currentSession ? String(currentSession.stream || '').trim().toLowerCase() : '';

  const currentSessionStudents = currentSession
    ? allStudents.filter(s => {
        const studentYear = String(s.year || '').trim();
        const studentStream = String(s.stream || '').trim().toLowerCase();
        return studentYear === sessionYear && studentStream === sessionStream;
      })
    : [];

  const getProcessLogs = () => {
    if (!currentSession) return [];

    const logs = [];
    const totalStudents = currentSessionStudents.length;

    // Enrich students with present/absent data
    const enriched = currentSessionStudents.map(student => {
      const presentRecord = presentStudents.find(p => p.student_id === student.id);
      return { ...student, presentRecord, isPresent: !!presentRecord };
    });

    const presentList = enriched
      .filter(s => s.isPresent)
      .sort((a, b) => new Date(a.presentRecord.marked_at || a.presentRecord.timestamp || 0) - new Date(b.presentRecord.marked_at || b.presentRecord.timestamp || 0));
    const absentList = enriched
      .filter(s => !s.isPresent)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    // 1. Session info
    logs.push({ type: 'info', text: `[SESSION] ${currentSession.subject_name} — Year ${currentSession.year || '?'}, ${(currentSession.stream || 'N/A').toUpperCase()}` });
    logs.push({ type: 'info', text: `[CLASS] ${totalStudents} student${totalStudents !== 1 ? 's' : ''} registered in this classroom` });
    logs.push({ type: 'divider' });

    // 2. Scanning phase
    logs.push({ type: 'system', text: `[SCAN] 📷 Scanning classroom for faces...` });

    if (presentList.length === 0) {
      logs.push({ type: 'warn', text: `[CAMERA] No face detected on screen — waiting for students...` });
    } else {
      logs.push({ type: 'camera', text: `[CAMERA] ${presentList.length} face${presentList.length !== 1 ? 's' : ''} detected on camera` });
    }
    logs.push({ type: 'divider' });

    // 3. Per-student recognition process (for each present student)
    presentList.forEach((student, idx) => {
      const timeStr = new Date(student.presentRecord.marked_at || student.presentRecord.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      const conf = student.presentRecord.confidence ? Number(student.presentRecord.confidence).toFixed(2) : '0.85';
      const thresh = student.presentRecord.threshold ? Number(student.presentRecord.threshold).toFixed(2) : '0.60';
      const roll = student.roll_number || student.college_id || 'N/A';
      const name = student.name || student.student_name || 'Unknown';

      logs.push({ type: 'ai', text: `[${timeStr}] [AI] Processing face ${idx + 1}/${presentList.length}...`, time: timeStr });
      logs.push({ type: 'match', text: `[${timeStr}] [MATCH] ✓ "${name}" identified (Roll: ${roll})`, time: timeStr });
      logs.push({ type: 'conf', text: `[${timeStr}] [CONF] Confidence: ${conf} | Threshold: ${thresh} ${Number(conf) >= Number(thresh) ? '✓ PASS' : '✗ LOW'}`, time: timeStr, pass: Number(conf) >= Number(thresh) });
      logs.push({ type: 'attend', text: `[${timeStr}] [ATTEND] ✅ Marked "${name}" as PRESENT`, time: timeStr });
      if (idx < presentList.length - 1 || absentList.length > 0) {
        logs.push({ type: 'divider' });
      }
    });

    // 4. Absent students — pending identification
    if (absentList.length > 0) {
      if (presentList.length > 0) {
        logs.push({ type: 'divider' });
      }
      absentList.forEach(student => {
        const roll = student.roll_number || student.college_id || 'N/A';
        const name = student.name || student.student_name || 'Unknown';
        logs.push({ type: 'pending', text: `[--:--:--] [PENDING] ⏳ "${name}" (Roll: ${roll}) — No face match yet` });
      });
    }

    // 5. Summary
    logs.push({ type: 'divider' });
    logs.push({ type: 'summary', text: `[SUMMARY] ${presentList.length}/${totalStudents} students identified | ${absentList.length} remaining` });

    return logs;
  };

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
          <button className="full-terminal-btn" onClick={() => setShowFullTerminalModal(true)}>Full Terminal</button>
          <button className="refresh-btn" onClick={() => window.location.reload()}>Refresh Data</button>
        </div>
      </div>

      <div className={`dashboard-grid-layout ${user?.role !== 'admin' ? 'teacher-layout' : ''}`}>
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
            {user?.role === 'teacher' ? (
              activeSession ? (
                <div className={`teacher-hero-card animate-scale-in ${activeSession.is_custom ? 'custom-hero' : ''}`} style={activeSession.is_custom ? { background: 'rgba(254, 252, 232, 0.4)' } : {}}>
                  {activeSession.is_custom && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(234, 179, 8, 0.15)', color: '#854d0e', borderRadius: '6px', padding: '0.2rem 0.6rem', fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.05em', marginBottom: '0.25rem', width: 'fit-content' }}>
                      ★ CUSTOM SESSION
                    </div>
                  )}
                  <div className="hero-main">
                    <div className="hero-subject-box">
                      <MonitorPlay size={24} color={activeSession.is_custom ? '#eab308' : 'var(--primary)'} />
                      <div>
                        <h3>{activeSession.subject_name}</h3>
                        <p>{activeSession.classroom_name} • {activeSession.camera_name || 'Camera'}</p>
                      </div>
                    </div>
                    <div className="hero-time-box">
                      <Clock size={18} />
                      <span>{formatTime(activeSession.start_time)} – {formatTime(activeSession.end_time)}</span>
                    </div>
                  </div>
                  <div className="hero-footer">
                    <div className="hero-tag">Year {activeSession.year}</div>
                    <div className="hero-tag">{activeSession.stream}</div>
                    <div className="hero-status-tag" style={activeSession.is_custom ? { color: '#854d0e' } : {}}>
                      <div className="dot animate-pulse" style={activeSession.is_custom ? { background: '#eab308' } : {}}></div>
                      {activeSession.is_custom ? 'CUSTOM LIVE' : 'LIVE MONITORING'}
                    </div>
                  </div>
                  {aiStatus && (
                    <div className={`hero-ai-status ${aiStatus.isError ? 'error' : 'active'}`}>
                      <Activity size={12} className={aiStatus.isError ? '' : 'animate-pulse'} />
                      <span>AI Scanner: {aiStatus.displayStatus}</span>
                    </div>
                  )}
                </div>
              ) : nextSession ? (
                <div className={`teacher-hero-card upcoming-hero animate-scale-in ${nextSession.is_custom ? 'custom-hero' : ''}`} style={nextSession.is_custom ? { background: 'rgba(254, 252, 232, 0.3)' } : {}}>
                  {nextSession.is_custom && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(234, 179, 8, 0.15)', color: '#854d0e', borderRadius: '6px', padding: '0.2rem 0.6rem', fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.05em', marginBottom: '0.25rem', width: 'fit-content' }}>
                      ★ CUSTOM SESSION
                    </div>
                  )}
                  <div className="hero-main">
                    <div className="hero-subject-box">
                      <Calendar size={24} color={nextSession.is_custom ? '#eab308' : '#3b82f6'} />
                      <div>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: nextSession.is_custom ? '#854d0e' : '#3b82f6', fontWeight: 800 }}>YOU HAVE NO CLASS RIGHT NOW</p>
                        <h3>Next: {nextSession.subject_name}</h3>
                        <p>{nextSession.classroom_name} • {getTimeRemaining(nextSession.start_time)}</p>
                      </div>
                    </div>
                    <div className={`hero-time-box ${nextSession.is_custom ? '' : 'upcoming'}`} style={nextSession.is_custom ? { background: 'rgba(234, 179, 8, 0.08)', color: '#854d0e' } : {}}>
                      <Clock size={18} />
                      <span>{formatTime(nextSession.start_time)} – {formatTime(nextSession.end_time)}</span>
                    </div>
                  </div>
                  <div className="hero-footer">
                    <div className="hero-tag">Year {nextSession.year}</div>
                    <div className="hero-tag">{nextSession.stream}</div>
                    <div className={`hero-status-tag ${nextSession.is_custom ? '' : 'upcoming'}`} style={nextSession.is_custom ? { color: '#854d0e' } : {}}>
                      <div className="dot" style={nextSession.is_custom ? { background: '#eab308' } : {}}></div>
                      {nextSession.is_custom ? 'CUSTOM UPCOMING' : 'UPCOMING CLASS'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="no-active-sessions">
                  <CheckCircle size={20} color="var(--primary)" />
                  <span>No more classes scheduled for today. Ready to relax!</span>
                </div>
              )
            ) : (
              <>
                {showLeftArrow && <button className="infobar-nav-btn left" onClick={() => scroll('left')}><ChevronLeft size={20} /></button>}
                <div className="active-sessions-infobar" ref={scrollRef} onScroll={checkScroll}>
                  {activeSessions.filter(s => s.status === 'active').length === 0 ? (
                    <div className="no-active-sessions">
                      {user?.role === 'teacher' ? 'Ready for your next session' : 'No active sessions currently being monitored'}
                    </div>
                  ) : (
                    activeSessions.filter(s => s.status === 'active').map((session) => (
                      <div
                        key={session.id}
                        className={`session-mini-card ${currentSession?.id === session.id ? 'active' : ''} ${session.is_custom ? 'custom-mini' : ''}`}
                        onClick={() => {
                          userManuallySelectedRef.current = true;
                          setSelectedSessionId(session.id);
                        }}
                      >
                        {session.is_custom && (
                          <div style={{ position: 'absolute', top: '0.6rem', right: '0.6rem', background: 'rgba(234,179,8,0.15)', color: '#92400e', borderRadius: '6px', padding: '0.1rem 0.4rem', fontSize: '0.5rem', fontWeight: 800, letterSpacing: '0.05em' }}>★ CUSTOM</div>
                        )}
                        <div className="session-card-main">
                          <div className="subject">{session.subject_name}</div>
                          <div className="teacher">{session.teacher_name}</div>
                        </div>

                        <div className="session-card-context">
                          <div className="location-cam">{session.classroom_name} • {session.camera_name || 'Camera'}</div>
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
              </>
            )}
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

        {/* MONITORING VIEW - ADMIN ONLY */}
        {user?.role === 'admin' && (
          <div className="analytics-section animate-fade-in">
            <div className="section-header-row">
              <div>
                <h3>Live Monitor</h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
                  {currentSession ? `Feed: ${currentSession.classroom_name}` : 'No active feed'}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {/* Multi-camera dropdowns */}
                {currentSession && currentSession.status === 'active' && currentSession.classrooms && currentSession.classrooms.length > 0 && (
                  <>
                    <select
                      value={selectedClassroomId || ''}
                      onChange={(e) => {
                        const crId = e.target.value ? parseInt(e.target.value) : null;
                        setSelectedClassroomId(crId);
                        // Auto-select first camera of the new classroom
                        if (crId) {
                          const cr = currentSession.classrooms.find(c => c.id === crId);
                          const cams = cr?.cameras || [];
                          setSelectedCameraUrl(cams.length > 0 ? cams[0].camera_url : (cr?.camera_url || null));
                        } else {
                          setSelectedCameraUrl(null);
                        }
                      }}
                      style={{
                        padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: '6px',
                        border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--card-bg, #fff)',
                        color: 'var(--text-primary, #1e293b)', cursor: 'pointer', minWidth: '120px'
                      }}
                    >
                      <option value="">All Rooms</option>
                      {currentSession.classrooms.map(cr => (
                        <option key={cr.id} value={cr.id}>{cr.name}</option>
                      ))}
                    </select>
                    {(() => {
                      const selCr = selectedClassroomId
                        ? currentSession.classrooms.find(c => c.id === selectedClassroomId)
                        : currentSession.classrooms[0];
                      const cameras = selCr?.cameras || [];
                      if (cameras.length <= 1) return null;
                      return (
                        <select
                          value={selectedCameraUrl || ''}
                          onChange={(e) => setSelectedCameraUrl(e.target.value || null)}
                          style={{
                            padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: '6px',
                            border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--card-bg, #fff)',
                            color: 'var(--text-primary, #1e293b)', cursor: 'pointer', minWidth: '120px'
                          }}
                        >
                          {cameras.map((cam, ci) => (
                            <option key={ci} value={cam.camera_url}>{cam.camera_name || `Camera ${ci + 1}`}</option>
                          ))}
                        </select>
                      );
                    })()}
                  </>
                )}
                <div className={`status-badge-compact ${currentSession ? (currentSession.status === 'scheduled' ? 'status-processing' : 'status-present') : 'status-processing'}`}>
                  <div className={`dot ${currentSession?.status === 'active' ? 'busy' : ''}`}></div>
                  <span>{currentSession ? (currentSession.status === 'scheduled' ? 'Scheduled' : 'Active') : 'Idle'}</span>
                </div>
              </div>
            </div>

            <div className="video-stream-wrapper">
              {currentSession ? (
                currentSession.status === 'scheduled' ? (
                  <div className="no-active-sessions" style={{ border: 'none', background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem' }}>
                    <Calendar size={48} color="#3b82f6" opacity={0.5} />
                    <span style={{ fontWeight: 600, color: '#475569' }}>Feed will go live at {formatTime(currentSession.start_time)}</span>
                  </div>
                ) : currentSession.status === 'active' ? (
                  <div className={`video-feed-container ${isFullscreen ? 'is-fullscreen' : ''}`} ref={videoContainerRef}>
                    <img
                      src={(() => {
                        // Determine camera URL for the feed
                        let feedCameraUrl = selectedCameraUrl;
                        if (!feedCameraUrl && currentSession.classrooms && currentSession.classrooms.length > 0) {
                          const firstCr = selectedClassroomId
                            ? currentSession.classrooms.find(c => c.id === selectedClassroomId)
                            : currentSession.classrooms[0];
                          const cams = firstCr?.cameras || [];
                          feedCameraUrl = cams.length > 0 ? cams[0].camera_url : (firstCr?.camera_url || currentSession.camera_url);
                        }
                        if (aiStatus.online) {
                          return feedCameraUrl
                            ? `${AI_SERVICE_URL}/video_feed?v=${currentSession.id}&camera_url=${encodeURIComponent(feedCameraUrl)}`
                            : `${AI_SERVICE_URL}/video_feed?v=${currentSession.id}`;
                        }
                        const fallbackUrl = feedCameraUrl || currentSession.camera_url || '0';
                        const fallbackName = (() => {
                          if (selectedCameraUrl && currentSession.classrooms) {
                            for (const cr of currentSession.classrooms) {
                              const cam = (cr.cameras || []).find(c => c.camera_url === selectedCameraUrl);
                              if (cam) return cam.camera_name || '';
                            }
                          }
                          return currentSession.camera_name || '';
                        })();
                        return `${CAMERA_BACKEND_URL}/video_feed/${fallbackUrl}?label=${encodeURIComponent(fallbackName)}`;
                      })()}
                      alt="Live Feed"
                      className="live-video-feed"
                      onError={(e) => {
                        const rawUrl = `${CAMERA_BACKEND_URL}/video_feed/${currentSession.camera_url || '0'}?label=${encodeURIComponent(currentSession.camera_name || '')}`;
                        if (e.target.src !== rawUrl) {
                           console.warn("AI Stream failed, falling back to Raw Feed");
                           e.target.src = rawUrl;
                           setAiStatus(prev => ({ ...prev, online: false, displayStatus: 'AI Service Error (Using Raw Feed)', isError: true }));
                        }
                      }}
                    />

                    <div className="video-controls-overlay">
                      <button className="control-btn" onClick={refreshFeed} title="Refresh Feed">
                        <RefreshCw size={14} />
                      </button>
                      <button className="control-btn" onClick={toggleFullscreen} title="Toggle Fullscreen">
                        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                      </button>
                    </div>

                    <div className={`ai-status-overlay ${aiStatus.isError || !aiStatus.online ? 'error' : 'active'}`}>
                      <div className={`status-dot ${aiStatus.isError || !aiStatus.online ? 'offline' : 'online animate-pulse'}`}></div>
                      <span>{aiStatus.displayStatus}</span>
                    </div>
                  </div>
                ) : (
                  <div className="no-active-sessions" style={{ border: 'none', background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem' }}>
                    <CheckCircle size={48} color="#10b981" opacity={0.5} />
                    <span style={{ fontWeight: 600, color: '#475569' }}>Session Concluded</span>
                    <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Live monitoring has stopped for this class.</p>
                  </div>
                )
              ) : (
                <div className="no-active-sessions" style={{ border: 'none', background: 'transparent' }}>
                  Select an active session to view live feed
                </div>
              )}
            </div>
          </div>
        )}

        {/* RECENT ARRIVALS */}
        <div className="recent-arrivals-section animate-fade-in">
          <div className="section-header-row">
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              <button 
                className={`btn-header-action recent-arrivals-btn ${activeArrivalsTab === 'recent' ? 'active' : ''}`}
                onClick={() => setActiveArrivalsTab('recent')}
              >
                Recent Arrivals
              </button>
              <button 
                className={`terminal btn-header-action ${activeArrivalsTab === 'terminal' ? 'active' : ''}`}
                onClick={() => setActiveArrivalsTab('terminal')}
              >
                Terminal
              </button>
            </div>
          </div>

          {activeArrivalsTab === 'recent' ? (
            <div className="arrivals-list">
              {currentSession ? (
                liveAttendance.length > 0 ? (
                  liveAttendance.map((item, i) => (
                    <div key={i} className="arrival-item animate-fade-in">
                      <div className={`avatar-ring ring-${['pink', 'green', 'blue', 'yellow'][i % 4]}`}>
                        <img
                          src={item.image_url || `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/public/students/${item.student_id || item.id}.jpg`}
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
          ) : (
            <div className="terminal-log-view">
              <div className="terminal-header">
                <span className="terminal-dot red"></span>
                <span className="terminal-dot yellow"></span>
                <span className="terminal-dot green"></span>
                <span className="terminal-title" style={{ fontFamily: 'Courier New, Courier, monospace', fontSize: '0.8rem', fontWeight: 700 }}>Merge Session Terminal</span>
              </div>
              <div className="terminal-body">
                  <div className="terminal-line command" style={{ fontFamily: 'Consolas, Monaco, monospace' }}>$ tail -f /var/log/attendance.log</div>
                  <div className="terminal-line info" style={{ fontFamily: 'Consolas, Monaco, monospace', color: '#38bdf8' }}>
                    [INFO] {new Date().toLocaleDateString()} — Monitoring session {currentSession ? `"${currentSession.subject_name}"` : 'Idle'}
                  </div>
                  {currentSession ? (
                    currentSessionStudents.length > 0 ? (
                      getProcessLogs().map((log, i) => {
                        if (log.type === 'divider') {
                          return <div key={i} style={{ borderBottom: '1px solid rgba(100, 116, 139, 0.2)', margin: '0.4rem 0' }} />;
                        }

                        const colorMap = {
                          info:    '#38bdf8', // cyan
                          system:  '#f59e0b', // amber
                          camera:  '#34d399', // emerald
                          warn:    '#fbbf24', // yellow
                          ai:      '#a78bfa', // violet
                          match:   '#22c55e', // green
                          conf:    '#60a5fa', // blue
                          attend:  '#4ade80', // bright green
                          pending: '#94a3b8', // slate
                          summary: '#e2e8f0', // light
                        };

                        const tagMatch = log.text.match(/^\[.*?\]\s*(\[.*?\])/);
                        const tag = tagMatch ? tagMatch[1] : '';
                        const afterTag = tagMatch ? log.text.slice(log.text.indexOf(tag) + tag.length) : log.text;
                        const timeMatch = log.text.match(/^\[([\d:]+|--:--:--)\]/);
                        const timeStr = timeMatch ? timeMatch[1] : null;
                        const restAfterTime = timeStr ? log.text.slice(log.text.indexOf(']') + 1).trim() : log.text;

                        return (
                          <div key={i} className="terminal-line log" style={{
                            fontFamily: 'Consolas, Monaco, monospace',
                            marginBottom: '0.2rem',
                            fontSize: '0.78rem',
                            lineHeight: '1.5',
                            color: colorMap[log.type] || '#cbd5e1',
                          }}>
                            {timeStr && (
                              <span style={{ color: '#64748b', marginRight: '0.4rem' }}>[{timeStr}]</span>
                            )}
                            {tag && (
                              <span style={{ color: colorMap[log.type] || '#cbd5e1', fontWeight: 700, marginRight: '0.4rem' }}>{tag}</span>
                            )}
                            <span style={{ color: log.type === 'attend' || log.type === 'match' ? '#f8fafc' : (colorMap[log.type] || '#cbd5e1') }}>
                              {timeStr ? afterTag.replace(tag, '').trim() : (tag ? afterTag.trim() : log.text)}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="terminal-line warning" style={{ fontFamily: 'Consolas, Monaco, monospace', color: '#fbbf24' }}>[WARN] No students registered in the group for "{currentSession.subject_name}".</div>
                    )
                  ) : (
                    <div className="terminal-line warning" style={{ fontFamily: 'Consolas, Monaco, monospace', color: '#fbbf24' }}>[WARN] System Idle. Select an active session to begin logging.</div>
                  )}
                  <div className="terminal-line cursor">_</div>
              </div>
            </div>
          )}
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
                  <div
                    key={session.id}
                    className={`explorer-card ${session.status === 'scheduled' ? 'upcoming' : ''} ${session.status === 'ended' ? 'is-ended' : ''} ${session.is_custom ? 'is-custom' : ''}`}
                    onClick={() => { setSelectedSessionId(session.id); setShowSessionsModal(false); }}
                    style={session.status === 'ended' ? { opacity: 0.8 } : {}}
                  >
                    <div className="explorer-card-header">
                      <div className="icon-box" style={{ background: session.status === 'scheduled' ? 'rgba(59, 130, 246, 0.1)' : session.status === 'ended' ? 'rgba(100, 116, 139, 0.1)' : 'rgba(16, 89, 52, 0.1)' }}>
                        <MonitorPlay size={20} color={session.status === 'scheduled' ? '#3b82f6' : session.status === 'ended' ? '#64748b' : 'var(--primary)'} />
                      </div>
                      <div className="header-info">
                        <div className="subject">{session.subject_name}</div>
                        <div className="room">{session.classroom_name}</div>
                      </div>
                    </div>

                    <div className="explorer-card-body">
                      <div className="detail-row"><User size={14} /><span>{session.teacher_name || 'Teacher'}</span></div>
                      <div className="detail-row"><Camera size={14} /><span>{session.camera_name || 'Camera'}</span></div>
                      <div className="detail-row"><Clock size={14} /><span>{formatTime(session.start_time)} - {formatTime(session.end_time)}</span></div>
                      <div className="detail-row" style={{ marginTop: '0.35rem', paddingTop: '0.35rem', borderTop: '1px solid #eef2f7' }}><span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Year {session.year} • {session.stream}</span></div>
                    </div>

                    <div className="explorer-card-footer">
                      {session.status === 'scheduled' ? (
                        <div className={`live-indicator scheduled ${session.is_custom ? 'custom-yellow' : ''}`}><div className="dot"></div><span>Scheduled Session</span></div>
                      ) : session.status === 'ended' ? (
                        <div className="live-indicator ended"><div className="dot" style={{ background: '#64748b' }}></div><span>Session Concluded</span></div>
                      ) : (
                        <div className={`live-indicator ${session.is_custom ? 'custom-yellow' : ''}`}><div className="dot active animate-pulse"></div><span>Live Feed Active</span></div>
                      )}
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
                        src={student.image_url || `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/public/students/${student.student_id || student.id}.jpg`}
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

      {/* FULL SYSTEM TERMINAL MODAL */}
      {showFullTerminalModal && (
        <div className="dashboard-modal-overlay animate-fade-in" onClick={() => setShowFullTerminalModal(false)}>
          <div className="dashboard-modal-container terminal-modal animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="dashboard-modal-header terminal-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span className="terminal-dot red"></span>
                <span className="terminal-dot yellow"></span>
                <span className="terminal-dot green"></span>
                <span className="terminal-title" style={{ marginLeft: '0.5rem', color: '#cbd5e1', fontSize: '1rem', fontWeight: 700, fontFamily: 'Courier New, Courier, monospace' }}>Merge Terminal</span>
              </div>
              <button className="dashboard-modal-close" onClick={() => setShowFullTerminalModal(false)} aria-label="Close terminal popup"><X size={16} /></button>
            </div>
            <div className="terminal-modal-body" ref={terminalModalBodyRef} onScroll={handleTerminalScroll} style={{ background: '#0f172a', padding: '1.5rem' }}>
              <div ref={terminalInnerWrapperRef} style={{ 
                padding: 0, 
                fontSize: '0.98rem', 
                lineHeight: '1.6',
                willChange: 'transform'
              }}>
                <div className="terminal-line command" style={{ marginBottom: '0.35rem', fontFamily: 'Consolas, Monaco, monospace' }}>$ journalctl -u merge-ai.service -n 50 -f</div>
                <div className="terminal-line" style={{ marginBottom: '0.35rem', fontFamily: 'Consolas, Monaco, monospace' }}>
                  {parseLogLine(`[SYS] Initialize AI Face Recognition Service (Facenet512)...`)}
                </div>
                <div className="terminal-line" style={{ marginBottom: '0.35rem', fontFamily: 'Consolas, Monaco, monospace' }}>
                  {parseLogLine(`[SYS] Model loaded successfully. Threshold=${aiStatus.details?.confidence_threshold || 0.28}`)}
                </div>
                <div className="terminal-line" style={{ marginBottom: '0.35rem', fontFamily: 'Consolas, Monaco, monospace' }}>
                  {parseLogLine(`[SYS] Connected to Backend: ${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}`)}
                </div>
                <div className="terminal-line" style={{ marginBottom: '0.35rem', fontFamily: 'Consolas, Monaco, monospace' }}>
                  {parseLogLine(`[SYS] Active Sessions: ${activeSessions.length} | Cached Students: ${allStudents.length}`)}
                </div>
                <div className="terminal-line" style={{ marginBottom: '0.35rem', fontFamily: 'Consolas, Monaco, monospace' }}>
                  {parseLogLine(`[SYS] Organization Isolation: ${user?.organization || 'N/A'} (ID: ${user?.organization_slug || user?.organization_id || 'N/A'})`)}
                </div>
                
                {aiConsoleLogs.map((logItem, i) => {
                  return (
                    <div key={i} className="terminal-line" style={{ marginBottom: '0.35rem', fontFamily: 'Consolas, Monaco, monospace' }}>
                      {parseLogLine(logItem.text)}
                    </div>
                  );
                })}
                <div className="terminal-line cursor">_</div>
                <div ref={terminalEndRef} />
              </div>
            </div>
          </div>
        </div>
      )}

      <OnboardingTour
        steps={tourSteps}
        isActive={shouldShowTour}
        onComplete={markTourComplete}
        onSkip={markTourComplete}
      />
    </div>
  );
};

export default Dashboard;

// export default Dashboard;
