import React from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { NotificationProvider } from './context/NotificationContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import StudentDashboard from './pages/StudentDashboard';
import Sessions from './pages/Sessions';
import RegisterStudent from './pages/RegisterStudent';
import ScheduleManager from './pages/ScheduleManager';
import Timetable from './pages/Timetable';
import SubjectManager from './pages/SubjectManager';
import StudentList from './pages/StudentList';
import TeacherList from './pages/TeacherList';
import ClassroomManager from './pages/ClassroomManager';
import You from './pages/You';
import GetStarted from './pages/GetStarted';
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
  const Router = isElectron ? HashRouter : BrowserRouter;

  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
          <NotificationProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/get-started" element={<GetStarted />} />
            <Route path="/" element={<HomeOrLanding />} />
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
            <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </NotificationProvider>
        </Router>
      </AuthProvider>
    </ToastProvider>
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

  // If not logged in: Desktop goes to Login, Web goes to Landing Page
  if (!user) {
    return isElectron ? <Navigate to="/login" /> : <GetStarted />;
  }

  // Admin Web Restriction
  if (user.role === 'admin' && !isElectron) {
    return <Navigate to="/login" />;
  }
  
  return (
    <Layout>
      <HomeRedirect />
    </Layout>
  );
};

// Helper to decide where to go on home page
const HomeRedirect = () => {
  const { user } = useAuth();
  if (user?.role === 'student') return <StudentDashboard />;
  return <Dashboard />;
};

export default App;
