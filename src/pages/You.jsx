import React, { useState, useEffect } from 'react';
import { Mail, Phone, Building, Hash, QrCode, Fingerprint, AlertCircle, Shield, Calendar, Award, BookOpen } from 'lucide-react';
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
          setProfileData({
            name: user?.name || 'Administrator',
            email: user?.email || 'admin@lecturelog.com',
            role: 'admin',
            college_id: 'ADMIN-001',
            phone: '+91 98765 43210'
          });
          setLoading(false);
          return;
        }

        const endpoint = user?.role === 'student' ? '/students/me' : '/teachers/me';
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
    <div className="you-premium-container">
      <div className="profile-split-layout">
        
        {/* ================== LEFT COL (ID CARD) ================== */}
        <div className="profile-left-col animate-slide-up">
          <div className="id-card-wrapper">
            <div className="lanyard-container">
              <div className="lanyard-strap"></div>
              <svg width="40" height="60" viewBox="0 0 40 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginTop: '-4px' }}>
                <path d="M10 0 L30 0 L32 10 L8 10 Z" fill="#222" />
                <path d="M15 10 L25 10 L25 20 L15 20 Z" fill="#333" />
                <rect x="12" y="20" width="16" height="25" rx="4" fill="#111" />
                <path d="M16 45 C16 55, 24 55, 24 45" stroke="#111" strokeWidth="4" strokeLinecap="round" fill="none" />
                <circle cx="24" cy="45" r="3" fill="#111" />
              </svg>
            </div>

            <div className="id-card-main">
              <div className="id-card-hole"></div>

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

              <h1 className="id-name">{profileData.name}</h1>
              <div className="id-role">{profileData.role || user?.role || 'Verified Member'}</div>

              <div className="id-details-section">
                <div className="id-details-list">
                  <div className="id-detail-item">
                    <Mail size={16} />
                    <span style={{ fontSize: '0.75rem' }}>{profileData.email}</span>
                  </div>
                  {(profileData.phone || user?.role === 'admin') && (
                    <div className="id-detail-item">
                      <Phone size={16} />
                      <span style={{ fontSize: '0.75rem' }}>{profileData.phone || '+91 98765 43210'}</span>
                    </div>
                  )}
                  <div className="id-detail-item">
                    <Building size={16} />
                    <span style={{ fontSize: '0.75rem' }}>{profileData.college_name || 'anishcollege'}</span>
                  </div>
                  <div className="id-detail-item">
                    <Hash size={16} />
                    <span style={{ fontSize: '0.75rem' }}>ID: {profileData.roll_number || profileData.college_id}</span>
                  </div>
                </div>

                <div className="id-qr-section">
                  <div className="id-qr-box">
                    <QrCode size={32} />
                  </div>
                  <span className="id-qr-text">VERIFY</span>
                </div>
              </div>

              <div className="id-footer">
                <span>SECURED BY MERGE</span>
                <Fingerprint size={16} />
              </div>
            </div>
          </div>
        </div>

        {/* ================== RIGHT COL (INSTITUTIONAL SETTINGS) ================== */}
        <div className="profile-right-col animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="identity-card-wrapper" style={{ height: 'fit-content', display: 'flex', flexDirection: 'column' }}>
            
            {/* Clean Header instead of Avatar Hero */}
            <div className="institutional-header" style={{ padding: '40px 40px 0', borderBottom: 'none' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--foreground)', margin: 0 }}>Institutional Details</h2>
              <p style={{ color: 'var(--muted-foreground)', margin: '5px 0 0 0', fontSize: '0.9rem' }}>Official records and placement information</p>
            </div>

            {/* Content Section */}
            <div className="identity-body" style={{ padding: '30px 40px 40px', flex: 1 }}>
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
        
      </div>
    </div>
  );
};

export default You;
