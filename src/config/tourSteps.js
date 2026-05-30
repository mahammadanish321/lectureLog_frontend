/**
 * Onboarding Tour Step Definitions
 * 
 * Each step defines:
 *  - target: CSS selector for the element to highlight (null = centered modal)
 *  - title: Step heading
 *  - description: Help text
 *  - placement: Tooltip position relative to target (center | top | bottom | left | right)
 *  - icon: Emoji icon for the step
 */

// ─── ADMIN TOUR (8 steps) ────────────────────────────────────────────────────
export const adminTourSteps = [
  {
    id: 'welcome',
    target: null,
    title: 'Welcome to Merge! 👋',
    description:
      'Let us show you around your institution management platform. This quick tour will help you get started in under a minute.',
    placement: 'center',
    icon: '👋',
  },
  {
    id: 'sidebar',
    target: '.sidebar-nav',
    title: 'Navigation Sidebar',
    description:
      'This is your main navigation hub. Access Dashboard, Routine, Students, Teachers, Subjects, and Classrooms — all from here.',
    placement: 'right',
    icon: '📍',
  },
  {
    id: 'dashboard-stats',
    target: '.stats-row-container',
    title: 'Dashboard Overview',
    description:
      'View real-time stats at a glance — active sessions, students present today, and your overall attendance performance.',
    placement: 'bottom',
    icon: '📊',
  },
  {
    id: 'live-monitor',
    target: '.analytics-section',
    title: 'Live Classroom Monitor',
    description:
      'When a session is active, the AI camera feed appears here. Watch face recognition mark attendance automatically in real-time.',
    placement: 'top',
    icon: '📹',
  },
  {
    id: 'sessions-btn',
    target: '.view-all-btn',
    title: 'Manage Sessions',
    description:
      'Click here to view, create, and manage all class sessions. Each session uses AI face recognition to track attendance.',
    placement: 'bottom',
    icon: '🎓',
  },
  {
    id: 'students-nav',
    target: '[href="#/students"], [href="/students"]',
    title: 'Register Students',
    description:
      'Add students to your institution and upload their photos so the AI can recognize them during attendance sessions.',
    placement: 'right',
    icon: '👥',
  },
  {
    id: 'subjects-nav',
    target: '[href="#/subjects"], [href="/subjects"]',
    title: 'Subjects & Classrooms',
    description:
      'Set up your subjects and classrooms before creating sessions. These organize your timetable and attendance records.',
    placement: 'right',
    icon: '📚',
  },
  {
    id: 'profile',
    target: '.user-profile-widget',
    title: 'Your Profile & Settings',
    description:
      'Access your profile, security settings, and institution info here. You can replay this tour anytime from your Profile page.',
    placement: 'bottom-end',
    icon: '⚙️',
  },
];

// ─── TEACHER TOUR (7 steps) ──────────────────────────────────────────────────
export const teacherTourSteps = [
  {
    id: 'welcome',
    target: null,
    title: 'Welcome to Merge! 👋',
    description:
      'Let us show you around your teaching dashboard. This quick tour will help you get started in under a minute.',
    placement: 'center',
    icon: '👋',
  },
  {
    id: 'sidebar',
    target: '.sidebar-nav',
    title: 'Navigation Sidebar',
    description:
      'Navigate between Dashboard, Sessions, Routine, Students, and your Profile from this sidebar.',
    placement: 'right',
    icon: '📍',
  },
  {
    id: 'teacher-stats',
    target: '.mini-stats-group',
    title: 'Your Stats at a Glance',
    description:
      'See the number of students in your class, who is present today, and your overall attendance rate — all updated in real-time.',
    placement: 'bottom',
    icon: '📊',
  },
  {
    id: 'hero-card',
    target: '.teacher-hero-card',
    title: 'Current & Next Session',
    description:
      'This card shows your currently active session and your upcoming class. Click on it to quickly jump into a session.',
    placement: 'bottom',
    icon: '🎯',
  },
  {
    id: 'sessions-nav',
    target: '[href="#/sessions"], [href="/sessions"]',
    title: 'Your Sessions',
    description:
      'Create and manage your class sessions here. Start a session to activate the AI-powered attendance system.',
    placement: 'right',
    icon: '🎓',
  },
  {
    id: 'routine-nav',
    target: '[href="#/routine"], [href="/routine"]',
    title: 'Class Routine',
    description:
      'View your weekly class schedule. The routine auto-generates sessions based on your timetable configuration.',
    placement: 'right',
    icon: '📅',
  },
  {
    id: 'profile',
    target: '.user-profile-widget',
    title: 'Your Profile',
    description:
      'Access your profile and settings here. You can replay this tour anytime from your Profile page.',
    placement: 'bottom-end',
    icon: '⚙️',
  },
];

// ─── STUDENT TOUR (6 steps) ──────────────────────────────────────────────────
export const studentTourSteps = [
  {
    id: 'welcome',
    target: null,
    title: 'Welcome to Merge! 👋',
    description:
      'Let us show you around your student dashboard. This quick tour will help you understand your attendance platform.',
    placement: 'center',
    icon: '👋',
  },
  {
    id: 'sidebar',
    target: '.sidebar-nav',
    title: 'Navigation Sidebar',
    description:
      'Use this sidebar to navigate between your Dashboard, Class Routine, and Profile.',
    placement: 'right',
    icon: '📍',
  },
  {
    id: 'student-stats',
    target: '.student-stats-row, .stats-row-container, .stu-stats-grid',
    title: 'Your Attendance Stats',
    description:
      'Track your attendance at a glance — total classes, present count, and your attendance percentage.',
    placement: 'bottom',
    icon: '📊',
  },
  {
    id: 'attendance-history',
    target: '.student-attendance-section, .stu-attendance-section, .attendance-history',
    title: 'Attendance History',
    description:
      'View your detailed attendance records. See which classes you attended and any sessions you missed.',
    placement: 'top',
    icon: '📋',
  },
  {
    id: 'routine-nav',
    target: '[href="#/routine"], [href="/routine"]',
    title: 'Class Routine',
    description:
      'Check your weekly class schedule here. Stay updated on upcoming classes and their timings.',
    placement: 'right',
    icon: '📅',
  },
  {
    id: 'profile',
    target: '.user-profile-widget',
    title: 'Your Profile',
    description:
      'Access your profile and update your information. You can replay this tour anytime from your Profile page.',
    placement: 'bottom-end',
    icon: '⚙️',
  },
];

/**
 * Returns the appropriate tour steps for a given user role
 */
export const getTourSteps = (role) => {
  switch (role) {
    case 'admin':
      return adminTourSteps;
    case 'teacher':
      return teacherTourSteps;
    case 'student':
      return studentTourSteps;
    default:
      return adminTourSteps;
  }
};
