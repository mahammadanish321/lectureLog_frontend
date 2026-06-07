import React, { useState, useEffect } from 'react';
import { Mail, Phone, Building, Hash, QrCode, Fingerprint, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import './You.css';

const You = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (user?.role === 'admin') {
          // Dummy data for admin
          setProfileData({
            name: user?.name || 'Administrator',
            email: user?.email || 'admin@lecturelog.com',
            role: 'admin',
            college_id: 'ADMIN-001',
            phone: '+91 98765 43210' // Placeholder phone
          });
          setLoading(false);
          return;
        }

        const endpoint = user?.role === 'student' ? '/api/students/profile' : '/api/teachers/profile';
        const response = await api.get(endpoint);
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
        <AlertCircle size={48} />
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
    <div className="you-id-container">
      <div className="id-card-wrapper">
        
        {/* Lanyard and Clip Graphic */}
        <div className="lanyard-container">
          <div className="lanyard-strap"></div>
          {/* Custom SVG for the lanyard clip */}
          <svg width="40" height="60" viewBox="0 0 40 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginTop: '-4px' }}>
            {/* Top Connector */}
            <path d="M10 0 L30 0 L32 10 L8 10 Z" fill="#222" />
            <path d="M15 10 L25 10 L25 20 L15 20 Z" fill="#333" />
            {/* Main Clip Body */}
            <rect x="12" y="20" width="16" height="25" rx="4" fill="#111" />
            {/* Clip Hook */}
            <path d="M16 45 C16 55, 24 55, 24 45" stroke="#111" strokeWidth="4" strokeLinecap="round" fill="none" />
            {/* Hook tip */}
            <circle cx="24" cy="45" r="3" fill="#111" />
          </svg>
        </div>

        <div className="id-card-main">
          {/* Hole punch */}
          <div className="id-card-hole"></div>

          {/* Avatar */}
          <div className="id-avatar-container">
            {!imageError ? (
              <img 
                src={imageUrl} 
                alt={profileData.name} 
                className="id-avatar"
                onError={() => setImageError(true)} 
              />
            ) : (
              <div className="id-avatar-fallback">
                {getInitials(profileData.name)}
              </div>
            )}
          </div>

          {/* Name & Role */}
          <h1 className="id-name">{profileData.name}</h1>
          <div className="id-role">{profileData.role || user?.role || 'Verified Member'}</div>

          {/* Details & QR */}
          <div className="id-details-section">
            <div className="id-details-list">
              <div className="id-detail-item">
                <Mail size={16} />
                <span>{profileData.email}</span>
              </div>
              {(profileData.phone || user?.role === 'admin') && (
                <div className="id-detail-item">
                  <Phone size={16} />
                  <span>{profileData.phone || '+91 98765 43210'}</span>
                </div>
              )}
              <div className="id-detail-item">
                <Building size={16} />
                <span>{profileData.college_name || 'anishcollege'}</span>
              </div>
              <div className="id-detail-item">
                <Hash size={16} />
                <span>ID: {profileData.roll_number || profileData.college_id}</span>
              </div>
            </div>

            <div className="id-qr-section">
              <div className="id-qr-box">
                <QrCode size={40} />
              </div>
              <span className="id-qr-text">SCAN TO VERIFY</span>
            </div>
          </div>

          {/* Footer */}
          <div className="id-footer">
            <span>SECURED BY MERGE</span>
            <Fingerprint size={16} />
          </div>

        </div>
      </div>
    </div>
  );
};

export default You;
