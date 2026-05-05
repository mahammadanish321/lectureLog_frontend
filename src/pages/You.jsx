import React, { useState, useEffect } from 'react';
import { User, Mail, Shield, BookOpen, GraduationCap, Building } from 'lucide-react';
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
          // Fallback if admin goes here somehow
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

    if (user) {
      fetchProfile();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="loading-screen" style={{ background: 'transparent', height: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
        <p>Loading your details...</p>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="error-screen" style={{ textAlign: 'center', padding: '3rem', color: 'var(--destructive)' }}>
        <p>{error || 'Something went wrong.'}</p>
      </div>
    );
  }

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const imageUrl = user?.role === 'student'
    ? (profileData?.image_url || `http://localhost:5000/public/students/${profileData?.id}.jpg`)
    : `http://localhost:5000/public/teachers/${profileData?.id}.jpg`;

  return (
    <div className="you-container">
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar" style={{ overflow: 'hidden' }}>
            {!imageError ? (
              <img 
                src={imageUrl} 
                alt={profileData.name} 
                onError={() => setImageError(true)} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              getInitials(profileData.name)
            )}
          </div>
          <h1 className="profile-name">{profileData.name}</h1>
          <span className="profile-role-badge">{profileData.role || user?.role}</span>
        </div>

        <div className="profile-content">
          <div className="profile-section">
            <h2 className="profile-section-title">
              <User size={18} />
              <span>Personal & Institutional Info</span>
            </h2>
            
            <div className="profile-grid">
              <div className="profile-info-item">
                <div className="profile-info-icon">
                  <Mail size={18} />
                </div>
                <div className="profile-info-details">
                  <span className="profile-info-label">Email Address</span>
                  <span className="profile-info-value">{profileData.email}</span>
                </div>
              </div>

              <div className="profile-info-item">
                <div className="profile-info-icon">
                  <Shield size={18} />
                </div>
                <div className="profile-info-details">
                  <span className="profile-info-label">College ID</span>
                  <span className="profile-info-value">{profileData.college_id}</span>
                </div>
              </div>

              {(profileData.role === 'student' || user?.role === 'student') && (
                <>
                  <div className="profile-info-item">
                    <div className="profile-info-icon">
                      <GraduationCap size={18} />
                    </div>
                    <div className="profile-info-details">
                      <span className="profile-info-label">Academic Year</span>
                      <span className="profile-info-value">Year {profileData.year}</span>
                    </div>
                  </div>

                  <div className="profile-info-item">
                    <div className="profile-info-icon">
                      <Building size={18} />
                    </div>
                    <div className="profile-info-details">
                      <span className="profile-info-label">Stream</span>
                      <span className="profile-info-value">{profileData.stream}</span>
                    </div>
                  </div>

                  <div className="profile-info-item">
                    <div className="profile-info-icon">
                      <BookOpen size={18} />
                    </div>
                    <div className="profile-info-details">
                      <span className="profile-info-label">Roll Number</span>
                      <span className="profile-info-value">{profileData.roll_number}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default You;
