import React from 'react';
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
  X,
  PanelLeft,
  ChevronRight,
  AlertCircle,
  Info,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import './Layout.css';

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [notifications, setNotifications] = React.useState([]);

  // Socket for real-time notifications
  React.useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on('new_notification', (data) => {
      setNotifications(prev => [
        {
          id: Date.now(),
          message: data.message,
          type: data.type || 'info',
          time: 'Just now'
        },
        ...prev
      ]);
    });

    return () => socket.close();
  }, []);

  // Close mobile menu on route change
  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';

  // Group navigation items based on role
  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Routine', path: '/routine', icon: Calendar },
  ];

  if (isAdmin || isTeacher) {
    menuItems.push({ name: 'Students', path: '/students', icon: Users });
  }

  if (isAdmin) {
    menuItems.push({ name: 'Teachers', path: '/teachers', icon: ShieldCheck });
  }

  const generalItems = [];
  if (isAdmin) {
    generalItems.push({ name: 'Subjects', path: '/subjects', icon: BookOpen });
    generalItems.push({ name: 'Classrooms', path: '/classrooms', icon: MonitorPlay });
    generalItems.push({ name: 'Settings', path: '/settings', icon: ShieldCheck }); // Re-purposed
  }

  if (isTeacher) {
    generalItems.push({ name: 'Sessions', path: '/sessions', icon: Clock });
  }

  if (isTeacher || user?.role === 'student') {
    generalItems.push({ name: 'Profile', path: '/you', icon: User });
  }

  const allItems = [...menuItems, ...generalItems];
  const currentPage = allItems.find(item => item.path === location.pathname);

  return (
    <div className="app-container">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''} ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <img src="/favicon.svg" alt="LectureLog Icon" style={{ width: '32px', height: '32px', minWidth: '32px' }} />
            {!isSidebarCollapsed && <span className="logo-text">LectureLog</span>}
          </div>
          <button className="sidebar-toggle-btn desktop-only" onClick={toggleSidebar} title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
            <PanelLeft size={18} />
          </button>
          <button className="mobile-close-btn" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {!isSidebarCollapsed && <div className="nav-section-label">MENU</div>}
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              title={isSidebarCollapsed ? item.name : ''}
            >
              <item.icon size={18} />
              {!isSidebarCollapsed && <span>{item.name}</span>}
            </NavLink>
          ))}

          {!isSidebarCollapsed && <div className="nav-section-label" style={{ marginTop: '1.5rem' }}>GENERAL</div>}
          {generalItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              title={isSidebarCollapsed ? item.name : ''}
            >
              <item.icon size={18} />
              {!isSidebarCollapsed && <span>{item.name}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {/* Footer content removed for ultra-minimalist look */}
        </div>
      </aside>

      <main className="main-content">
        <header className="top-navbar-container">
          <div className="top-navbar-card">
            <div className="top-navbar-left">
              <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>
                <Menu size={24} color="var(--primary)" />
              </button>
              <div className="search-wrapper">
                <Search size={18} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search student, session or routine..."
                  className="top-search-input"
                />
                <div className="search-hint">
                  <span>⌘ F</span>
                </div>
              </div>
            </div>

            <div className="top-navbar-right">
              <button className="circle-btn" title="Notifications" onClick={() => setShowNotifications(true)}>
                <Bell size={18} />
              </button>
              <button className="circle-btn" title="Team">
                <Users size={18} />
              </button>
              <div className="user-profile-widget" onClick={() => setIsProfileOpen(!isProfileOpen)}>
                <div className="user-avatar-wrapper">
                  <img
                    src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name || 'Mahammad Anish'}&background=105934&color=fff&bold=true`}
                    alt="User"
                  />
                </div>
                <div className="user-info-text">
                  <span className="user-name">{user?.name || 'Mahammad Anish'}</span>
                  <span className="user-email">{user?.email || 'anish130905@gmail.com'}</span>
                </div>
                <ChevronRight size={18} className={`profile-chevron ${isProfileOpen ? 'open' : ''}`} />

                {isProfileOpen && (
                  <div className="profile-dropdown animate-fade-in">
                    <div className="dropdown-header mobile-only">
                      <strong>{user?.name}</strong>
                      <span>{user?.email}</span>
                    </div>
                    <button className="dropdown-item" onClick={() => navigate('/settings')}>
                      <User size={16} />
                      <span>My Profile</span>
                    </button>
                    <button className="dropdown-item" onClick={() => navigate('/settings')}>
                      <ShieldCheck size={16} />
                      <span>Security</span>
                    </button>
                    <div className="dropdown-divider"></div>
                    <button className="dropdown-item logout" onClick={handleLogout}>
                      <LogOut size={16} />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        <div className="content-area">
          {children}
        </div>
      </main>

      {/* ==========================================================================
         GLOBAL NOTIFICATIONS POPUP
         ========================================================================== */}
      {showNotifications && (
        <div className="modal-overlay" onClick={() => setShowNotifications(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>System Notifications</h2>
              <button className="modal-close-btn" onClick={() => setShowNotifications(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="notification-list">
                {notifications.length === 0 ? (
                  <div className="no-notifications-state">
                    <Bell size={40} className="empty-icon" />
                    <p>No new system notifications</p>
                  </div>
                ) : (
                  notifications.map((notif, index) => (
                    <div key={notif.id || index} className="notification-item animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                      <div className={`notification-icon-wrapper ${notif.type || 'info'}`}>
                        {notif.type === 'success' ? <CheckCircle2 size={20} /> : notif.type === 'alert' ? <AlertCircle size={20} /> : <Info size={20} />}
                      </div>
                      <div className="notification-content">
                        <p>{notif.message}</p>
                        <div className="notification-time">
                          <Clock size={12} />
                          <span>{notif.time}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
