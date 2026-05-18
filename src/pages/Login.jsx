import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Mail, Lock, Loader2, User, ShieldCheck, Eye, EyeOff, Sparkles, CheckCircle2, ChevronRight, AlertCircle, Monitor, MonitorPlay } from 'lucide-react';
import api from '../api';
import './Login.css';

/* ── Eye Components ────────────────────────────────────────── */

const Pupil = ({ size = 12, maxDistance = 5, pupilColor = "black", forceLookX, forceLookY, mouseX, mouseY }) => {
  const pupilRef = useRef(null);

  const calculatePupilPosition = () => {
    if (!pupilRef.current) return { x: 0, y: 0 };
    if (forceLookX !== undefined && forceLookY !== undefined) return { x: forceLookX, y: forceLookY };

    const pupil = pupilRef.current.getBoundingClientRect();
    const pupilCenterX = pupil.left + pupil.width / 2;
    const pupilCenterY = pupil.top + pupil.height / 2;

    const deltaX = mouseX - pupilCenterX;
    const deltaY = mouseY - pupilCenterY;
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);

    const angle = Math.atan2(deltaY, deltaX);
    return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance };
  };

  const pos = calculatePupilPosition();

  return (
    <div
      ref={pupilRef}
      className="pupil"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: pupilColor,
        transform: `translate(${pos.x}px, ${pos.y}px)`,
      }}
    />
  );
};

const EyeBall = ({ size = 48, pupilSize = 16, maxDistance = 10, eyeColor = "white", pupilColor = "black", isBlinking = false, forceLookX, forceLookY, mouseX, mouseY }) => {
  const eyeRef = useRef(null);

  const calculatePupilPosition = () => {
    if (!eyeRef.current) return { x: 0, y: 0 };
    if (forceLookX !== undefined && forceLookY !== undefined) return { x: forceLookX, y: forceLookY };

    const eye = eyeRef.current.getBoundingClientRect();
    const eyeCenterX = eye.left + eye.width / 2;
    const eyeCenterY = eye.top + eye.height / 2;

    const deltaX = mouseX - eyeCenterX;
    const deltaY = mouseY - eyeCenterY;
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);

    const angle = Math.atan2(deltaY, deltaX);
    return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance };
  };

  const pos = calculatePupilPosition();

  return (
    <div
      ref={eyeRef}
      className="eyeball"
      style={{
        width: `${size}px`,
        height: isBlinking ? '2px' : `${size}px`,
        backgroundColor: eyeColor,
      }}
    >
      {!isBlinking && (
        <div
          className="pupil"
          style={{
            width: `${pupilSize}px`,
            height: `${pupilSize}px`,
            backgroundColor: pupilColor,
            transform: `translate(${pos.x}px, ${pos.y}px)`,
          }}
        />
      )}
    </div>
  );
};

const Login = () => {
  const isElectron = !!(window.electronAPI?.isElectron);
  const [loginMode, setLoginMode] = useState('teacher'); // 'teacher', 'admin', 'student'
  const [view, setView] = useState('login'); // 'login', 'verify-email', 'verify-otp', 'set-password', 'onboard'
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [collegeSlug, setCollegeSlug] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [masterList, setMasterList] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const [isBlinking1, setIsBlinking1] = useState(false);
  const [isBlinking2, setIsBlinking2] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const char1Ref = useRef(null);
  const char2Ref = useRef(null);
  const char3Ref = useRef(null);
  const char4Ref = useRef(null);

  const { login, adminLogin, studentLogin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch organizations
    const fetchOrgs = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/organizations`);
        const data = await response.json();
        setOrganizations(data);
      } catch (err) {
        console.error("Failed to fetch organizations", err);
      }
    };
    fetchOrgs();
  }, []);
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const scheduleBlink = (setter) => {
      const timeout = setTimeout(() => {
        setter(true);
        setTimeout(() => {
          setter(false);
          scheduleBlink(setter);
        }, 150);
      }, Math.random() * 4000 + 3000);
      return timeout;
    };
    const t1 = scheduleBlink(setIsBlinking1);
    const t2 = scheduleBlink(setIsBlinking2);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const calculatePosition = (ref) => {
    if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 };
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 3;
    const deltaX = mouseX - centerX;
    const deltaY = mouseY - centerY;
    const faceX = Math.max(-15, Math.min(15, deltaX / 20));
    const faceY = Math.max(-10, Math.min(10, deltaY / 30));
    const bodySkew = Math.max(-6, Math.min(6, -deltaX / 120));
    return { faceX, faceY, bodySkew };
  };

  const pos1 = calculatePosition(char1Ref);
  const pos2 = calculatePosition(char2Ref);
  const pos3 = calculatePosition(char3Ref);
  const pos4 = calculatePosition(char4Ref);

  const handleOnboard = async (uni) => {
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/organizations/onboard', {
        name: uni.name,
        domain: uni.domain,
        primary_color: '#105934'
      });
      setSuccess(`${uni.name} has been registered! You can now activate your admin account.`);

      // Update local organizations list
      setOrganizations(prev => [...prev, response.data]);

      // Move to activation flow
      setView('verify-email');
      setLoginMode('admin');
      setSelectedOrg(response.data.id);
    } catch (err) {
      setError('Failed to onboard institution. It might already be registered.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'onboard' && searchQuery.length > 2) {
      const delayDebounce = setTimeout(async () => {
        setIsSearching(true);
        setError('');
        try {
          const response = await api.get(`/organizations/master-list?name=${searchQuery}`);
          setMasterList(response.data);
        } catch (err) {
          console.error(err);
          setError('Search failed. The global database might be slow or offline. Try again in a moment.');
          setMasterList([]);
        } finally {
          setIsSearching(false);
        }
      }, 800);
      return () => clearTimeout(delayDebounce);
    }
  }, [searchQuery, view]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (loginMode === 'teacher') {
        await login(email, password, 'teacher', selectedOrg);
      } else if (loginMode === 'admin') {
        await adminLogin(email, password);
      } else {
        await studentLogin(email, password, selectedOrg);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleClaimAccount = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (view === 'verify-email') {
        // Step 1: Check email and send OTP
        await api.post('/auth/claim-init', {
          email,
          organization_id: selectedOrg,
          role: loginMode,
          orgName: loginMode === 'admin' ? collegeName : undefined,
          orgSlug: loginMode === 'admin' ? collegeSlug : undefined
        });
        setView('verify-otp');
        setSuccess('OTP sent to your institutional email.');
      } else if (view === 'verify-otp') {
        // Step 2: Verify OTP
        await api.post('/auth/claim-verify', { email, otp });
        setView('set-password');
        setSuccess('OTP verified! Now set your new password.');
      } else if (view === 'set-password') {
        if (newPassword !== confirmPassword) {
          setError('Passwords do not match. Please try again.');
          return;
        }
        // Step 3: Set Password
        await api.post('/auth/claim-finalize', { email, password: newPassword });
        setView('login');
        setSuccess('Account activated! You can now log in.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen-grid">
      {/* Left Column: Animated Characters */}
      <div className="login-visual-section">
        <div className="visual-header">
          <div className="brand-logo">
            <img src="https://res.cloudinary.com/dmi7vzu8w/image/upload/v1778328482/Picsart_26-05-07_07-29-20-114_v3en0e.jpg" alt="Merge" className="logo-img-small" style={{ borderRadius: '8px' }} />
            <span>Merge</span>
          </div>
          <h1>Intelligent Classroom Monitoring</h1>
          <p>Real-time AI attendance and session management for modern institutions.</p>
        </div>

        <div className="characters-container">
          <div className="characters-stage">
            {/* Character 1: Tall Green (Primary) */}
            <div
              ref={char1Ref}
              className="character char-primary"
              style={{
                height: isTyping ? '440px' : '400px',
                transform: `skewX(${pos1.bodySkew}deg) ${isTyping ? 'translateX(40px)' : ''}`,
              }}
            >
              <div className="char-eyes" style={{ left: `${45 + pos1.faceX}px`, top: `${40 + pos1.faceY}px` }}>
                <EyeBall size={18} pupilSize={7} maxDistance={5} isBlinking={isBlinking1} mouseX={mouseX} mouseY={mouseY} />
                <EyeBall size={18} pupilSize={7} maxDistance={5} isBlinking={isBlinking1} mouseX={mouseX} mouseY={mouseY} />
              </div>
            </div>

            {/* Character 2: Mid-height Slate */}
            <div
              ref={char2Ref}
              className="character char-slate"
              style={{
                transform: `skewX(${pos2.bodySkew * 1.5}deg) ${isTyping ? 'translateX(20px)' : ''}`,
              }}
            >
              <div className="char-eyes" style={{ left: `${26 + pos2.faceX}px`, top: `${32 + pos2.faceY}px` }}>
                <EyeBall size={16} pupilSize={6} maxDistance={4} isBlinking={isBlinking2} mouseX={mouseX} mouseY={mouseY} />
                <EyeBall size={16} pupilSize={6} maxDistance={4} isBlinking={isBlinking2} mouseX={mouseX} mouseY={mouseY} />
              </div>
            </div>

            {/* Character 3: Orange Semi-circle (Mint Green) */}
            <div
              ref={char3Ref}
              className="character char-mint"
              style={{
                transform: `skewX(${pos3.bodySkew}deg)`,
              }}
            >
              <div className="char-eyes" style={{ left: `${82 + pos3.faceX}px`, top: `${90 + pos3.faceY}px` }}>
                <Pupil size={12} maxDistance={5} pupilColor="#111827" mouseX={mouseX} mouseY={mouseY} />
                <Pupil size={12} maxDistance={5} pupilColor="#111827" mouseX={mouseX} mouseY={mouseY} />
              </div>
            </div>

            {/* Character 4: Yellow Rounded (Light Gold) */}
            <div
              ref={char4Ref}
              className="character char-gold"
              style={{
                transform: `skewX(${pos4.bodySkew}deg)`,
              }}
            >
              <div className="char-eyes" style={{ left: `${52 + pos4.faceX}px`, top: `${40 + pos4.faceY}px` }}>
                <Pupil size={12} maxDistance={5} pupilColor="#111827" mouseX={mouseX} mouseY={mouseY} />
                <Pupil size={12} maxDistance={5} pupilColor="#111827" mouseX={mouseX} mouseY={mouseY} />
              </div>
              <div className="char-mouth" style={{ left: `${40 + pos4.faceX}px`, top: `${88 + pos4.faceY}px` }} />
            </div>
          </div>
        </div>

        <div className="visual-footer">
          <span>&copy; 2026 Merge AI</span>
          <div className="footer-links">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Contact</a>
          </div>
        </div>
      </div>

      {/* Right Column: Login Form */}
      <div className="login-form-section" style={{ position: 'relative' }}>
        <div className="form-wrapper animate-fade-in">
          <div className="form-header">
            <h2 className="welcome-text">Welcome back!</h2>
            <p className="subtitle">Please enter your credentials to access your dashboard.</p>
          </div>

          <div className="login-tabs-unified">
            <button type="button" className={`mode-tab ${loginMode === 'teacher' ? 'active' : ''}`} onClick={() => { setLoginMode('teacher'); setView('login'); }}>Teacher</button>
            <button type="button" className={`mode-tab ${loginMode === 'student' ? 'active' : ''}`} onClick={() => { setLoginMode('student'); setView('login'); }}>Student</button>
            <button type="button" className={`mode-tab ${loginMode === 'admin' ? 'active' : ''}`} onClick={() => { setLoginMode('admin'); setView('login'); }}>Admin</button>
          </div>

          {error && (
            <div className="error-box animate-shake" style={{
              backgroundColor: '#fef2f2',
              color: '#991b1b',
              padding: '1rem',
              borderRadius: '12px',
              marginBottom: '1.5rem',
              fontSize: '0.875rem',
              border: '1px solid #fee2e2',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}
          {success && <div className="success-box" style={{ backgroundColor: '#f0fdf4', color: '#166534', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.875rem', border: '1px solid #bbf7d0' }}>{success}</div>}

          {view === 'login' ? (
            <form onSubmit={handleLogin} className="auth-form">
              {loginMode === 'admin' && !isElectron ? (
                <div className="admin-restriction-message" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                  <div className="restriction-icon" style={{ backgroundColor: '#fff7ed', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                    <MonitorPlay size={32} color="#f97316" />
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1c1917', marginBottom: '0.75rem' }}>Desktop App Required</h3>
                  <p style={{ fontSize: '0.875rem', color: '#44403c', lineHeight: 1.6, marginBottom: '2rem' }}>
                    Administrative tools are restricted to the <strong>Merge Desktop App</strong> for security and hardware integration.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button className="submit-btn" onClick={() => window.location.href = '#'}>Download Desktop App</button>
                    <button className="secondary-btn" onClick={() => setLoginMode('teacher')}>Login as Teacher</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="form-fields">
                    {loginMode !== 'student' ? (
                      <>
                        <div className="field-group">
                          <label>Email Address</label>
                          <div className="input-with-icon">
                            <Mail size={18} />
                            <input
                              type="email"
                              placeholder="e.g. professor@college.edu"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              onFocus={() => setIsTyping(true)}
                              onBlur={() => setIsTyping(false)}
                              required
                            />
                          </div>
                        </div>

                        <div className="field-group">
                          <label>{loginMode === 'teacher' ? 'Password / College ID' : 'Password'}</label>
                          <div className="input-with-icon">
                            <Lock size={18} />
                            <input
                              type={showPassword ? 'text' : 'password'}
                              placeholder="••••••••"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              onFocus={() => setIsTyping(true)}
                              onBlur={() => setIsTyping(false)}
                              required
                            />
                            <button type="button" className="toggle-pass" onClick={() => setShowPassword(!showPassword)}>
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="field-group">
                          <label>Institutional Email</label>
                          <div className="input-with-icon">
                            <Mail size={18} />
                            <input
                              type="email"
                              placeholder="e.g. student@college.edu"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              onFocus={() => setIsTyping(true)}
                              onBlur={() => setIsTyping(false)}
                              required
                            />
                          </div>
                        </div>

                        <div className="field-group">
                          <label>Password</label>
                          <div className="input-with-icon">
                            <Lock size={18} />
                            <input
                              type={showPassword ? 'text' : 'password'}
                              placeholder="••••••••"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              onFocus={() => setIsTyping(true)}
                              onBlur={() => setIsTyping(false)}
                              required
                            />
                            <button type="button" className="toggle-pass" onClick={() => setShowPassword(!showPassword)}>
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="form-utils">
                    <label className="remember-me">
                      <input type="checkbox" />
                      <span>Keep me logged in</span>
                    </label>
                    <a href="#" className="forgot-pass">Forgot Password?</a>
                  </div>

                  <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" /> : <span>Sign In to {loginMode}</span>}
                    {!loading && <ChevronRight size={18} />}
                  </button>

                  {loginMode !== 'admin' && (
                    <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                      <button type="button" onClick={() => setView('verify-email')} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem' }}>
                        First time logging in? Activate account
                      </button>
                    </div>
                  )}
                </>
              )}
            </form>
          ) : (
            <form onSubmit={handleClaimAccount} className="auth-form">
              <div className="form-fields">
                {view === 'verify-email' && (
                  <>
                    <div className="field-group" style={{ position: 'relative' }}>
                      <label>Search Your Institution</label>
                      <div className="input-with-icon">
                        <Sparkles size={18} />
                        <input
                          type="text"
                          placeholder="Search college name or ID..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onFocus={() => setShowSearchDropdown(true)}
                          onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                        />
                      </div>

                      {showSearchDropdown && (
                        <div className="search-dropdown animate-fade-in" style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          zIndex: 100,
                          background: 'white',
                          border: '1.5px solid #e2e8f0',
                          borderRadius: '12px',
                          marginTop: '0.5rem',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                          maxHeight: '200px',
                          overflowY: 'auto'
                        }}>
                          {organizations
                            .filter(org =>
                              searchQuery === ''
                                ? true // Show all if empty, we will slice later
                                : org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                org.slug.toLowerCase().includes(searchQuery.toLowerCase())
                            )
                            .sort((a, b) => b.id - a.id) // Sort by ID descending (latest first)
                            .slice(0, searchQuery === '' ? 2 : 10) // Show only 2 if empty, else show more
                            .map(org => (
                              <div
                                key={org.id}
                                onMouseDown={(e) => {
                                  e.preventDefault(); // Prevent input from blurring immediately
                                  setSelectedOrg(org.id);
                                  setSearchQuery(org.name);
                                  setShowSearchDropdown(false);
                                }}
                                style={{
                                  padding: '0.8rem 1rem',
                                  cursor: 'pointer',
                                  borderBottom: '1px solid #f3f4f6',
                                  background: selectedOrg === org.id ? '#f0fdf4' : 'white',
                                  fontWeight: selectedOrg === org.id ? '600' : '400',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}
                              >
                                <span>{org.name}</span>
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', backgroundColor: '#f8fafc', padding: '2px 6px', borderRadius: '6px' }}>{org.slug}</span>
                              </div>
                            ))
                          }
                          {organizations.filter(org =>
                            org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            org.slug.toLowerCase().includes(searchQuery.toLowerCase())
                          ).length === 0 && (
                              <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                                No institutions found
                              </div>
                            )}
                        </div>
                      )}
                    </div>

                    <div className="field-group">
                      <label>Institutional Email</label>
                      <div className="input-with-icon">
                        <Mail size={18} />
                        <input type="email" placeholder="e.g. name@college.edu" value={email} onChange={(e) => setEmail(e.target.value)} required />
                      </div>
                    </div>
                  </>
                )}

                {view === 'verify-otp' && (
                  <div className="field-group">
                    <label>Enter 6-Digit OTP</label>
                    <div className="input-with-icon">
                      <ShieldCheck size={18} />
                      <input type="text" placeholder="000000" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} required />
                    </div>
                  </div>
                )}

                {view === 'set-password' && (
                  <>
                    <div className="field-group">
                      <label>Create New Password</label>
                      <div className="input-with-icon">
                        <Lock size={18} />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Min 8 characters"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                        />
                        <button type="button" className="toggle-pass" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}>
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <div className="field-group">
                      <label>Confirm Password</label>
                      <div className="input-with-icon">
                        <Lock size={18} />
                        <input
                          type="password"
                          placeholder="Repeat your password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : (
                  <span>
                    {view === 'verify-email' ? 'Send Verification OTP' :
                      view === 'verify-otp' ? 'Verify Code' : 'Activate My Account'}
                  </span>
                )}
                {!loading && <ChevronRight size={18} />}
              </button>

              <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setView('login')} style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: '500', cursor: 'pointer', fontSize: '0.9rem' }}>
                  Back to Login
                </button>
              </div>
            </form>
          )}

          {loginMode === 'admin' && view === 'login' && (
            <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                Want to use Merge for your institution? <Link to="/signup" style={{ color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' }}>Register your college</Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
