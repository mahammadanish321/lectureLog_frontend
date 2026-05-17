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
import { useNotifications } from '../context/NotificationContext';
import './Layout.css';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAllReadNotifications } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [filterTab, setFilterTab] = React.useState('all');

  const filteredNotifs = React.useMemo(() => {
    if (filterTab === 'unread') return notifications.filter(n => !n.is_read);
    return notifications;
  }, [notifications, filterTab]);

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

  const isElectron = window.navigator.userAgent.includes('Electron');

  return (
    <div className={`app-container ${isElectron ? 'is-electron' : ''}`}>
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''} ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <img src="https://res.cloudinary.com/dmi7vzu8w/image/upload/v1778328482/Picsart_26-05-07_07-29-20-114_v3en0e.jpg" alt="Merge Icon" style={{ width: '32px', height: '32px', minWidth: '32px', borderRadius: '8px' }} />
            {!isSidebarCollapsed && <span className="logo-text">Merge</span>}
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

            <div className={`top-navbar-right ${isElectron ? 'electron-controls-offset' : ''}`}>
              <button className="circle-btn" title="Notifications" onClick={() => setShowNotifications(true)}>
                <Bell size={18} />
                {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
              </button>
              <button className="circle-btn" title="Team">
                <Users size={18} />
              </button>
              <div className="user-profile-widget" onClick={() => setIsProfileOpen(!isProfileOpen)}>
                <div className="user-avatar-wrapper">
                  <img
                    src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=105934&color=fff&bold=true`}
                    alt="User"
                  />
                </div>
                <div className="user-info-text">
                  <span className="user-name">{user?.name}</span>
                  <span className="user-email">{user?.email}</span>
                </div>
                <ChevronRight size={18} className={`profile-chevron ${isProfileOpen ? 'open' : ''}`} />

                {isProfileOpen && (
                  <div className="profile-dropdown animate-fade-in">
                    <div className="dropdown-header mobile-only">
                      <strong>{user?.name}</strong>
                      <span>{user?.email}</span>
                    </div>
                    
                    <div className="dropdown-section">
                      <button className="dropdown-item" onClick={() => { setIsProfileOpen(false); navigate('/you'); }}>
                        <User size={16} />
                        <span>My Profile</span>
                      </button>
                      <button className="dropdown-item" onClick={() => { setIsProfileOpen(false); navigate('/settings'); }}>
                        <ShieldCheck size={16} />
                        <span>Security</span>
                      </button>
                    </div>

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
        <div className="notif-overlay" onClick={() => setShowNotifications(false)}>
          <div className="notif-modal animate-pop-in" onClick={e => e.stopPropagation()}>
            <div className="notif-header">
              <div className="header-content">
                <h2>System Notifications</h2>
                <p>Stay updated with the latest activity across Merge.</p>
              </div>
              <button className="notif-close-btn" onClick={() => setShowNotifications(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="notif-subbar">
              <div className="notif-tabs">
                <button 
                  className={`notif-tab-btn ${filterTab === 'all' ? 'active' : ''}`} 
                  onClick={() => setFilterTab('all')}
                >
                  All ({notifications.length})
                </button>
                <button 
                  className={`notif-tab-btn ${filterTab === 'unread' ? 'active' : ''}`} 
                  onClick={() => setFilterTab('unread')}
                >
                  Unread ({unreadCount})
                </button>
              </div>
              <div className="notif-actions">
                {unreadCount > 0 && (
                  <button className="notif-action-btn" onClick={markAllAsRead}>
                    <CheckCircle2 size={16} /> Mark all read
                  </button>
                )}
                {notifications.some(n => n.is_read) && (
                  <button className="notif-action-btn" onClick={clearAllReadNotifications} style={{ color: '#64748b' }}>
                    <X size={16} /> Clear read
                  </button>
                )}
              </div>
            </div>

            <div className="notif-body">
              <div className="notification-list">
                {filteredNotifs.length === 0 ? (
                  <div className="no-notifications-state">
                    <div className="empty-notif-circle">
                      <Bell size={40} />
                    </div>
                    <p>{filterTab === 'unread' ? 'No unread notifications' : 'No new notifications'}</p>
                  </div>
                ) : (
                  filteredNotifs.map((notif, index) => (
                    <div 
                      key={notif.id} 
                      className={`notification-item animate-fade-in ${!notif.is_read ? 'unread' : ''}`} 
                      style={{ animationDelay: `${index * 0.05}s`, cursor: notif.redirect_url ? 'pointer' : 'default' }}
                      onClick={() => {
                        if (!notif.is_read) markAsRead(notif.id);
                        if (notif.redirect_url) {
                          setShowNotifications(false);
                          navigate(notif.redirect_url);
                        }
                      }}
                    >
                      {notif.sender_image ? (
                        <img src={notif.sender_image} alt="Sender" style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div className={`notification-icon-wrapper ${notif.priority === 'critical' ? 'alert' : 'info'}`} style={{ width: '42px', height: '42px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: notif.priority === 'critical' ? '#fee2e2' : '#f1f5f9', color: notif.priority === 'critical' ? '#ef4444' : '#64748b', flexShrink: 0 }}>
                          {notif.priority === 'critical' ? <AlertCircle size={20} /> : <Info size={20} />}
                        </div>
                      )}
                      <div className="notification-content" style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                          <span className={`notif-priority-tag ${notif.priority || 'normal'}`}>
                            {notif.session_type || notif.priority || 'system'}
                          </span>
                          <div className="notification-time" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#94a3b8' }}>
                            <Clock size={12} />
                            <span>{new Date(notif.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                        {notif.title && <strong style={{ display: 'block', fontSize: '14px', color: '#1e293b', marginBottom: '2px' }}>{notif.title}</strong>}
                        <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: '1.4' }}>{notif.message}</p>
                      </div>
                      <button 
                        className="circle-btn" 
                        style={{ width: '28px', height: '28px', background: 'transparent', border: 'none', color: '#94a3b8', padding: 0 }} 
                        onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                        title="Delete notification"
                      >
                        <X size={16} />
                      </button>
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
