import React, { useState, useEffect } from 'react';
import { User, Mail, Shield, BookOpen, GraduationCap, Building, Award, Fingerprint, Calendar, Hash } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import './You.css';

const You = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        let response;
        if (user?.role === 'student') {
          response = await api.get('/students/me');
        } else if (user?.role === 'teacher') {
          response = await api.get('/teachers/me');
        } else {
          setProfileData({
            name: user?.name || 'Administrator',
            email: user?.email || 'admin@lecturelog.edu',
            role: user?.role || 'admin',
            college_id: 'ADMIN-001'
          });
          setLoading(false);
          return;
        }
        setProfileData(response.data);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile details.');
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchProfile();
  }, [user]);

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="profile-spinner"></div>
        <p>AUTHENTICATING DIGITAL IDENTITY...</p>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="profile-error">
        <Fingerprint size={48} />
        <h2>Identity Verification Failed</h2>
        <p>{error || 'Access denied to profile services.'}</p>
      </div>
    );
  }

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const imageUrl = user?.role === 'student'
    ? (profileData?.image_url || `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/public/students/${profileData?.id}.jpg`)
    : `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/public/teachers/${profileData?.id}.jpg`;

  return (
    <div className="you-premium-container">
      <div className="identity-card-wrapper animate-slide-up">
        
        {/* Cinematic Header Section */}
        <div className="identity-hero">
          <div className="hero-gradient-overlay"></div>
          <div className="identity-status-floating">
            <div className="status-dot-pulse"></div>
            <span>SECURE IDENTITY</span>
          </div>
          
          <div className="hero-avatar-container">
            <div className="premium-avatar-ring">
              <div className="profile-avatar-main">
                {!imageError ? (
                  <img 
                    src={imageUrl} 
                    alt={profileData.name} 
                    onError={() => setImageError(true)} 
                  />
                ) : (
                  <span className="initials-fallback">{getInitials(profileData.name)}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="identity-body">
          <div className="identity-core-info">
            <h1 className="id-display-name">{profileData.name}</h1>
            <div className="id-role-badge">
              <Shield size={12} />
              <span>{profileData.role || user?.role || 'Verified Member'}</span>
            </div>
          </div>

          <div className="info-grid-container">
            <div className="info-group">
              <h3 className="info-group-title">PRIMARY CREDENTIALS</h3>
              <div className="info-card-grid">
                <div className="premium-info-card">
                  <div className="card-icon-box"><Mail size={20} /></div>
                  <div className="card-text-box">
                    <label>EMAIL ADDRESS</label>
                    <p>{profileData.email}</p>
                  </div>
                </div>

                <div className="premium-info-card">
                  <div className="card-icon-box"><Hash size={20} /></div>
                  <div className="card-text-box">
                    <label>INSTITUTIONAL ID</label>
                    <p>{profileData.college_id}</p>
                  </div>
                </div>
              </div>
            </div>

            {(profileData.role === 'student' || user?.role === 'student') && (
              <div className="info-group">
                <h3 className="info-group-title">ACADEMIC PLACEMENT</h3>
                <div className="info-card-grid">
                  <div className="premium-info-card">
                    <div className="card-icon-box"><Calendar size={20} /></div>
                    <div className="card-text-box">
                      <label>ACADEMIC YEAR</label>
                      <p>Year {profileData.year}</p>
                    </div>
                  </div>

                  <div className="premium-info-card">
                    <div className="card-icon-box"><Building size={20} /></div>
                    <div className="card-text-box">
                      <label>STREAM / BRANCH</label>
                      <p>{profileData.stream}</p>
                    </div>
                  </div>

                  <div className="premium-info-card card-full-width">
                    <div className="card-icon-box"><Award size={20} /></div>
                    <div className="card-text-box">
                      <label>OFFICIAL ROLL NUMBER</label>
                      <p>{profileData.roll_number}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card Footer / Decorative */}
        <div className="identity-footer">
          <div className="id-watermark">
            <BookOpen size={14} />
            <span>LECTURELOG DIGITAL PASSPORT</span>
          </div>
          <div className="id-security-hash">
            {Math.random().toString(16).slice(2, 10).toUpperCase()}—SYSTEM_VERIFIED
          </div>
        </div>

      </div>
    </div>
  );
};

export default You;
