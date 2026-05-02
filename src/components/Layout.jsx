import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  UserPlus,
  LogOut,
  Bell,
  Search,
  ShieldCheck,
  User,
  Clock,
  BookOpen,
  Users,
  MonitorPlay,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';

  // Define navigation based on role
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Routine', path: '/routine', icon: Calendar },
  ];

  if (isAdmin || isTeacher) {
    navItems.push({ name: 'Students', path: '/students', icon: Users });
  }

  if (isAdmin) {
    navItems.push({ name: 'Subjects', path: '/subjects', icon: BookOpen });
    navItems.push({ name: 'Classrooms', path: '/classrooms', icon: MonitorPlay });
    navItems.push({ name: 'Register Student', path: '/students/register', icon: UserPlus });
    navItems.push({ name: 'Register Teacher', path: '/teachers/register', icon: ShieldCheck });
  }

  if (isTeacher) {
    navItems.push({ name: 'Sessions', path: '/sessions', icon: Clock });
  }

  if (isTeacher || user?.role === 'student') {
    navItems.push({ name: 'You', path: '/you', icon: User });
  }

  const currentPage = navItems.find(item => item.path === location.pathname);

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">LL</div>
            <span>LectureLog</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <item.icon size={18} />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', padding: '1rem 0' }}>
          <div className="user-profile card" style={{ padding: '0.75rem', border: 'none', background: 'rgba(28, 25, 23, 0.05)' }}>
            <div className="feed-avatar" style={{ background: isAdmin ? 'var(--primary)' : 'var(--secondary)' }}>
              {isAdmin ? <ShieldCheck size={18} /> : <User size={18} />}
            </div>
            <div className="user-details">
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)' }}>{user?.name || user?.roll_number}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {user?.role}
              </p>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout} style={{ width: '100%', marginTop: '1rem', justifyContent: 'center' }}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-navbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
              className="menu-toggle" 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ display: 'none' }}
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div className="page-title">
              <h2>{currentPage ? currentPage.name : 'Portal'}</h2>
            </div>
          </div>
          <div className="navbar-actions">
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', color: 'var(--muted-foreground)' }} />
              <input
                type="text"
                placeholder="Search..."
                className="top-search"
              />
            </div>
            <button className="btn-icon">
              <Bell size={18} />
            </button>
          </div>
        </header>
        <div className="content-area">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
