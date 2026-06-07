import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, Laptop, Award, Palette, MonitorPlay, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './Settings.css';

const Settings = () => {
  const { user, restartTour } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <div className="settings-container">
      <div className="settings-header animate-slide-down">
        <h1>Settings</h1>
        <p>Manage your application preferences and appearance.</p>
      </div>

      <div className="settings-content animate-slide-up">
        
        {/* Appearance Section */}
        <section className="settings-section">
          <h2 className="settings-section-title">
            <Palette size={20} className="text-primary" /> Appearance
          </h2>
          
          <div className="settings-row">
            <div className="settings-info">
              <h4>Theme Preference</h4>
              <p>Choose how Merge looks on this device.</p>
            </div>
            <div className="settings-action">
              <div className="theme-segmented-control">
                <button 
                  className={`theme-segment-btn ${theme === 'light' ? 'active' : ''}`} 
                  onClick={() => setTheme('light')}
                >
                  <Sun size={16} /> Light
                </button>
                <button 
                  className={`theme-segment-btn ${theme === 'dark' ? 'active' : ''}`} 
                  onClick={() => setTheme('dark')}
                >
                  <Moon size={16} /> Dark
                </button>
                <button 
                  className={`theme-segment-btn ${theme === 'system' ? 'active' : ''}`} 
                  onClick={() => setTheme('system')}
                >
                  <Laptop size={16} /> System
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* General Options Section */}
        <section className="settings-section">
          <h2 className="settings-section-title">
            <MonitorPlay size={20} className="text-primary" /> General Options
          </h2>
          
          <div className="settings-row">
            <div className="settings-info">
              <h4>Replay Guided Tour</h4>
              <p>Launch the interactive tutorial to learn the interface again.</p>
            </div>
            <div className="settings-action">
              <button
                className="settings-btn"
                onClick={() => {
                  restartTour();
                  navigate(user?.role === 'student' ? '/student/dashboard' : '/dashboard');
                }}
              >
                <Award size={16} /> Replay Tour
              </button>
            </div>
          </div>
          
          <div className="settings-row">
            <div className="settings-info">
              <h4>Compact Mode</h4>
              <p>Reduce padding and spacing to fit more content on screen.</p>
            </div>
            <div className="settings-action">
              <label className="toggle-switch">
                <input type="checkbox" className="toggle-input" />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

export default Settings;
