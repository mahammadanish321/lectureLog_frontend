import React from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { NotificationProvider } from './context/NotificationContext';
import { RegistrationQueueProvider } from './context/RegistrationQueueContext';
import { ThemeProvider } from './context/ThemeContext';
import RegistrationQueueUI from './components/RegistrationQueueUI';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import StudentDashboard from './pages/StudentDashboard';
import Sessions from './pages/Sessions';
import RegisterStudent from './pages/RegisterStudent';
import RegisterTeacher from './pages/RegisterTeacher';
import ScheduleManager from './pages/ScheduleManager';
import Timetable from './pages/Timetable';
import SubjectManager from './pages/SubjectManager';
import StudentList from './pages/StudentList';
import TeacherList from './pages/TeacherList';
import ClassroomManager from './pages/ClassroomManager';
import Requests from './pages/Requests';
import You from './pages/You';
import GetStarted from './pages/GetStarted';
import Settings from './pages/Settings';
import Bag from './pages/Bag';
import PadDashboard from './pages/PadDashboard';
import WritingPad from './pages/WritingPad';
import SharedPad from './pages/SharedPad';
import Chat from './pages/Chat';
import Drop from './pages/Drop';
import DropDetail from './pages/DropDetail';
// import AppUpdateBanner from './components/AppUpdateBanner';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const isElectron = !!(window.electronAPI?.isElectron);

  if (loading) return (
    <div className="loading-screen" style={{ background: '#fdfcf7', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1c1917' }}>
      <p>Loading Merge...</p>
    </div>
  );

  if (!user) return <Navigate to="/login" />;

  // Admin Web Restriction
  if (user.role === 'admin' && !isElectron) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" />;
  }

  return <Layout>{children}</Layout>;
};

function App() {
  const isElectron = !!(window.electronAPI?.isElectron);
  
  // Handle Desktop Hash links pasted into Web Browsers
  React.useEffect(() => {
    if (!isElectron && window.location.hash && window.location.hash.startsWith('#/')) {
      const cleanPath = window.location.hash.substring(1); // Removes the '#'
      window.location.replace(cleanPath);
    }
  }, [isElectron]);

  const Router = isElectron ? HashRouter : BrowserRouter;

  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
        <RegistrationQueueProvider>
          <Router>
            <NotificationProvider>
              {/* <AppUpdateBanner /> */}
              <RegistrationQueueUI />
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/activate" element={<Login initialView="verify-email" />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/get-started" element={<GetStarted />} />
                <Route path="/pad/shared/:id" element={<SharedPad />} />
                <Route path="/" element={<HomeOrLanding />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
            <Route
              path="/sessions"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <Sessions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/dashboard"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute allowedRoles={['teacher', 'student', 'admin']}>
                  <Chat />
                </ProtectedRoute>
              }
            />
              <Route
                path="/bag"
                element={
                  <ProtectedRoute allowedRoles={['teacher', 'student', 'admin']}>
                    <Bag />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pads"
                element={
                  <ProtectedRoute allowedRoles={['teacher', 'student', 'admin']}>
                    <PadDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pads/:id"
                element={
                  <ProtectedRoute allowedRoles={['teacher', 'student', 'admin']}>
                    <WritingPad />
                  </ProtectedRoute>
                }
              />
              <Route path="/drop" element={<ProtectedRoute allowedRoles={['teacher', 'student', 'admin']}><Drop /></ProtectedRoute>} />
              <Route path="/drop/:id" element={<ProtectedRoute allowedRoles={['teacher', 'student', 'admin']}><DropDetail /></ProtectedRoute>} />
              <Route
                path="/schedules"
              element={
                <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                  <ScheduleManager />
                </ProtectedRoute>
              }
            />
            <Route
              path="/students"
              element={
                <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                  <StudentList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/students/register"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <RegisterStudent />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teachers"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <TeacherList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teachers/register"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <RegisterTeacher />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subjects"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <SubjectManager />
                </ProtectedRoute>
              }
            />
            <Route
                path="/classrooms"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <ClassroomManager />
                  </ProtectedRoute>
                }
              />
            <Route
                path="/requests"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Requests />
                  </ProtectedRoute>
                }
              />
            <Route
                path="/routine"
              element={
                <ProtectedRoute allowedRoles={['teacher', 'admin', 'student']}>
                  <Timetable />
                </ProtectedRoute>
              }
            />
              <Route
                path="/you"
                element={
                  <ProtectedRoute allowedRoles={['teacher', 'admin', 'student']}>
                    <You />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute allowedRoles={['teacher', 'admin', 'student']}>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </NotificationProvider>
          </Router>
        </RegistrationQueueProvider>
      </AuthProvider>
    </ToastProvider>
    </ThemeProvider>
  );
}

// Decide whether to show Landing Page or Dashboard
const HomeOrLanding = () => {
  const { user, loading } = useAuth();
  const isElectron = !!(window.electronAPI?.isElectron);
  
  if (loading) return (
    <div className="loading-screen" style={{ background: '#fdfcf7', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1c1917' }}>
      <p>Loading Merge...</p>
    </div>
  );

  // Electron Desktop App Flow:
  if (isElectron) {
    if (!user) return <Navigate to="/login" />;
    if (user.role === 'admin') return <Navigate to="/login" />; // restricted to desktop login screen
    return (
      <Layout>
        <HomeRedirect />
      </Layout>
    );
  }

  // Web Browser Flow: Always show the Landing Page (GetStarted)
  return <GetStarted />;
};

// Helper to decide where to go on home page
const HomeRedirect = () => {
  const { user } = useAuth();
  if (user?.role === 'student') return <StudentDashboard />;
  return <Dashboard />;
};

export default App;
