import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, Laptop, Award, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './You.css'; // Reusing You.css for the premium container styles

const Settings = () => {
  const { user, restartTour } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <div className="you-premium-container">
      <div className="identity-card-wrapper animate-slide-up">
        
        {/* Cinematic Header Section */}
        <div className="identity-hero" style={{ padding: '3rem 2rem', background: 'linear-gradient(to right, #0f172a, #1e293b)' }}>
          <div className="hero-gradient-overlay"></div>
          <div className="identity-status-floating">
            <div className="status-dot-pulse"></div>
            <span>PREFERENCES</span>
          </div>
          
          <div className="hero-avatar-container">
            <div className="premium-avatar-ring" style={{ background: 'transparent' }}>
              <div className="profile-avatar-main" style={{ background: '#105934', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <SettingsIcon size={48} color="#ffffff" />
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="identity-body">
          <div className="identity-core-info">
            <h1 className="id-display-name">Application Settings</h1>
            <div className="id-role-badge">
              <span>General Preferences & Appearance</span>
            </div>
          </div>

          {/* Theme Settings Section */}
          <div className="info-group" style={{ marginTop: '2.5rem' }}>
            <h3 className="info-group-title">APPEARANCE</h3>
            <div className="theme-toggle-container">
              <button 
                className={`theme-toggle-btn ${theme === 'light' ? 'active' : ''}`} 
                onClick={() => setTheme('light')}
              >
                <Sun size={18} />
                <span>Light</span>
              </button>
              <button 
                className={`theme-toggle-btn ${theme === 'dark' ? 'active' : ''}`} 
                onClick={() => setTheme('dark')}
              >
                <Moon size={18} />
                <span>Dark</span>
              </button>
              <button 
                className={`theme-toggle-btn ${theme === 'system' ? 'active' : ''}`} 
                onClick={() => setTheme('system')}
              >
                <Laptop size={18} />
                <span>System</span>
              </button>
            </div>
          </div>
          
          <div style={{ marginTop: '3.5rem', display: 'flex', justifyContent: 'center' }}>
            <button
              className="premium-tour-btn"
              onClick={() => {
                restartTour();
                navigate(user?.role === 'student' ? '/student/dashboard' : '/dashboard');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #105934, #15803d)',
                border: '1px solid rgba(74, 222, 128, 0.2)',
                color: '#ffffff',
                fontWeight: '700',
                fontSize: '0.9rem',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(16, 89, 52, 0.2)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 89, 52, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(16, 89, 52, 0.2)';
              }}
            >
              <Award size={16} />
              <span>Replay Guided Tour</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Settings;
