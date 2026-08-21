import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Mail, Lock, Loader2, User, ShieldCheck, Eye, EyeOff, Sparkles, CheckCircle2, ChevronRight, AlertCircle, Monitor, MonitorPlay } from 'lucide-react';
import { signInWithGooglePopup } from '../config/firebase.config';
import api from '../api';
import './Login.css';

/* ── Google Brand Icon ─────────────────────────────────────── */
const GoogleIcon = () => (
  <svg className="google-icon-svg" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

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

const Login = ({ initialView }) => {
  const isElectron = !!(window.electronAPI?.isElectron);
  const [loginMode, setLoginMode] = useState('teacher'); // 'teacher', 'admin', 'student'
  const [view, setView] = useState(initialView || 'login'); // 'login', 'check-email', 'select-org', 'verify-email', 'verify-otp', 'set-password', 'onboard'
  const [organizations, setOrganizations] = useState([]);
  const [pendingOrganizations, setPendingOrganizations] = useState([]);
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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [cachedGoogleToken, setCachedGoogleToken] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [emailCheckResult, setEmailCheckResult] = useState(null);
  const [emailChecked, setEmailChecked] = useState(false);
  const isForgotPasswordView = view === 'forgot-otp' || view === 'forgot-password';

  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const [isBlinking1, setIsBlinking1] = useState(false);
  const [isBlinking2, setIsBlinking2] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const char1Ref = useRef(null);
  const char2Ref = useRef(null);
  const char3Ref = useRef(null);
  const char4Ref = useRef(null);

  const { login, adminLogin, studentLogin, firebaseLogin, firebaseClaim } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (initialView) {
      setView(initialView);
    } else if (location.state?.initialView) {
      setView(location.state.initialView);
      if (location.state?.loginMode) {
        setLoginMode(location.state.loginMode);
      }
    } else {
      setView('login');
    }
  }, [initialView, location]);

  useEffect(() => {
    // Check for auth errors passed from api interceptor
    const authErrorMsg = localStorage.getItem('auth_error_msg');
    if (authErrorMsg) {
      setError(authErrorMsg);
      localStorage.removeItem('auth_error_msg');
    }

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

  // ── Firebase Google Login Handler ──
  const handleGoogleLogin = async () => {
    setError('');
    setSuccess('');
    setGoogleLoading(true);
    try {
      const { idToken } = await signInWithGooglePopup();
      setCachedGoogleToken(idToken);

      const res = await firebaseLogin(idToken, loginMode, selectedOrg);

      if (res && res.status === 'select_organization') {
        setPendingOrganizations(res.organizations);
        return;
      }

      if (loginMode === 'student') {
        navigate('/student/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('[AUTH] Google login error:', err);
      setError(err.response?.data?.message || err.message || 'Google authentication failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  // ── Firebase Google Multi-Org Select Handler (Direct password-free login) ──
  const handleGoogleOrgSelect = async (orgId) => {
    setSelectedOrg(orgId);
    setError('');
    setLoading(true);
    try {
      await firebaseLogin(cachedGoogleToken, loginMode, orgId);
      if (loginMode === 'student') {
        navigate('/student/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('[AUTH] Google Org Select error:', err);
      setError(err.response?.data?.message || err.message || 'Google login failed for the selected organization.');
    } finally {
      setLoading(false);
    }
  };

  // ── Firebase Google Account Activation Handler (Skips OTP) ──
  const handleGoogleActivate = async () => {
    setError('');
    setSuccess('');

    let targetOrgId = selectedOrg;
    if (!targetOrgId && searchQuery) {
      const matchedOrg = organizations.find(
        o => o.name.toLowerCase() === searchQuery.toLowerCase() || o.slug.toLowerCase() === searchQuery.toLowerCase()
      );
      if (matchedOrg) {
        targetOrgId = matchedOrg.id;
      }
    }

    if (!targetOrgId) {
      setError('Please search and select your institution before activating with Google.');
      return;
    }

    setGoogleLoading(true);
    try {
      const { idToken } = await signInWithGooglePopup();
      // Instantly verify with Google and claim account (skips OTP!)
      await firebaseClaim(idToken, loginMode, targetOrgId);

      setSuccess('Account successfully activated with Google! Redirecting...');
      setTimeout(() => {
        const searchParams = new URLSearchParams(location.search);
        const redirectParam = searchParams.get('redirect');
        if (redirectParam) {
          navigate(decodeURIComponent(redirectParam));
        } else if (loginMode === 'student') {
          navigate('/student/dashboard');
        } else {
          navigate('/dashboard');
        }
      }, 800);
    } catch (err) {
      console.error('[AUTH] Google activate error:', err);
      setError(err.response?.data?.message || err.message || 'Google account activation failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // If email not checked yet, do email check first
      if (!emailChecked) {
        // First, check if email+role combination exists and get org list
        const checkRes = await api.get('/auth/check-email', {
          params: { email, role: loginMode }
        });

        if (!checkRes.data.found) {
          setError(`No ${loginMode} account found with this email.`);
          setLoading(false);
          return;
        }

        setEmailCheckResult(checkRes.data);
        setEmailChecked(true);

        // If only 1 organization, auto-select and show password field
        if (checkRes.data.count === 1) {
          setSelectedOrg(checkRes.data.organizations[0].id);
          setLoading(false);
          return; // Show password field now
        } else if (checkRes.data.count > 1) {
          // Multiple orgs - show selector
          setPendingOrganizations(checkRes.data.organizations);
          setLoading(false);
          return;
        }
      } else if (emailChecked && !selectedOrg) {
        // Email checked but org not selected - skip for now
        setLoading(false);
        return;
      } else {
        // Email checked, org selected, password submitted - proceed with login
        const loginRes = await attemptLogin(email, password, loginMode, selectedOrg);
        if (loginRes.redirectTo) navigate(loginRes.redirectTo);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Email check failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const attemptLogin = async (emailVal, passwordVal, roleVal, orgId) => {
    try {
      let res;
      if (roleVal === 'teacher') {
        res = await login(emailVal, passwordVal, 'teacher', orgId);
      } else if (roleVal === 'admin') {
        res = await adminLogin(emailVal, passwordVal);
      } else {
        res = await studentLogin(emailVal, passwordVal, orgId);
      }

      const searchParams = new URLSearchParams(location.search);
      const redirectParam = searchParams.get('redirect');
      if (redirectParam) {
        return { redirectTo: decodeURIComponent(redirectParam) };
      }

      if (roleVal === 'student') {
        return { redirectTo: '/student/dashboard' };
      } else {
        return { redirectTo: '/dashboard' };
      }
    } catch (err) {
      throw err;
    }
  };

  const handleLoginWithOrgSelected = async (e) => {
    e?.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (!selectedOrg) {
        setError('Please select an organization.');
        setLoading(false);
        return;
      }

      if (cachedGoogleToken) {
        await firebaseLogin(cachedGoogleToken, loginMode, selectedOrg);
        if (loginMode === 'student') {
          navigate('/student/dashboard');
        } else {
          navigate('/dashboard');
        }
        return;
      }

      const loginRes = await attemptLogin(email, password, loginMode, selectedOrg);
      if (loginRes.redirectTo) navigate(loginRes.redirectTo);
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
        let targetOrgId = selectedOrg;
        let targetOrgName = loginMode === 'admin' ? collegeName : undefined;
        let targetOrgSlug = loginMode === 'admin' ? collegeSlug : undefined;

        if (!targetOrgId && searchQuery) {
          const matchedOrg = organizations.find(o => o.name.toLowerCase() === searchQuery.toLowerCase() || o.slug.toLowerCase() === searchQuery.toLowerCase());
          if (matchedOrg) {
            targetOrgId = matchedOrg.id;
          } else {
            setError('Please select a valid institution from the dropdown.');
            setLoading(false);
            return;
          }
        }

        // Step 1: Check email and send OTP
        await api.post('/auth/claim-init', {
          email,
          organization_id: targetOrgId,
          role: loginMode,
          orgName: targetOrgName,
          orgSlug: targetOrgSlug
        });
        setView('verify-otp');
        setSuccess('OTP sent to your institutional email.');
      } else if (view === 'verify-otp') {
        // Step 2: Verify OTP
        await api.post('/auth/claim-verify', {
          email,
          otp,
          organization_id: selectedOrg,
          role: loginMode
        });
        setView('set-password');
        setSuccess('OTP verified! Now set your new password.');
      } else if (view === 'set-password') {
        if (newPassword !== confirmPassword) {
          setError('Passwords do not match. Please try again.');
          return;
        }
        // Step 3: Set Password
        await api.post('/auth/claim-finalize', {
          email,
          password: newPassword,
          organization_id: selectedOrg,
          role: loginMode
        });
        setView('login');
        setSuccess('Account activated! You can now log in.');
      } else if (view === 'forgot-otp') {
        await api.post('/auth/forgot-password-verify', {
          email,
          otp,
          organization_id: selectedOrg,
          role: loginMode
        });
        setView('forgot-password');
        setSuccess('OTP verified. Set your new password.');
      } else if (view === 'forgot-password') {
        if (newPassword !== confirmPassword) {
          setError('Passwords do not match. Please try again.');
          return;
        }
        await api.post('/auth/forgot-password-finalize', {
          email,
          password: newPassword,
          organization_id: selectedOrg,
          role: loginMode
        });
        setView('login');
        setSuccess('Password reset successfully. You can now log in.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password-init', {
        email,
        organization_id: selectedOrg,
        role: loginMode
      });
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setView('forgot-otp');
      setSuccess('A password-reset OTP has been sent to your email.');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to start password reset. Please try again.');
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
            <h2 className="welcome-text">
              {view === 'login' ? 'Welcome back!' : isForgotPasswordView ? 'Reset Password' : 'Activate Account'}
            </h2>
            <p className="subtitle">
              {view === 'login'
                ? 'Please enter your credentials to access your dashboard.'
                : isForgotPasswordView
                  ? 'Verify your identity to choose a new password.'
                  : 'Claim your account using your institutional verification code.'}
            </p>
          </div>

          <div className="login-tabs-unified">
            <button
              type="button"
              className={`mode-tab ${loginMode === 'teacher' ? 'active' : ''}`}
              onClick={() => {
                setLoginMode('teacher');
                if (view !== 'login') setView('verify-email');
              }}
            >
              Teacher
            </button>
            <button
              type="button"
              className={`mode-tab ${loginMode === 'student' ? 'active' : ''}`}
              onClick={() => {
                setLoginMode('student');
                if (view !== 'login') setView('verify-email');
              }}
            >
              Student
            </button>
            {view === 'login' && (
              <button
                type="button"
                className={`mode-tab ${loginMode === 'admin' ? 'active' : ''}`}
                onClick={() => {
                  setLoginMode('admin');
                  setView('login');
                }}
              >
                Admin
              </button>
            )}
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
                    <button type="button" className="submit-btn" onClick={(e) => { e.preventDefault(); window.location.href = 'https://github.com/mahammadanish321/lectureLog_frontend/releases/latest/download/Merge.Admin.Setup.1.0.0.exe'; }}>Download Desktop App</button>
                  </div>
                </div>
              ) : cachedGoogleToken && pendingOrganizations.length > 1 ? (
                // Dedicated Google Multi-Org picker: 1-click on any institution signs in directly with NO password
                <div className="auth-form">
                  <div className="form-fields">
                    <div className="field-group">
                      <label>Select Your Institution</label>
                      <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1rem' }}>
                        Your Google account is registered with multiple institutions. Click your institution to enter:
                      </p>
                      <div className="org-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '300px', overflowY: 'auto' }}>
                        {pendingOrganizations.map(org => (
                          <div 
                            key={org.id}
                            onClick={() => !loading && handleGoogleOrgSelect(org.id)}
                            style={{
                              padding: '1rem',
                              border: '1.5px solid #e2e8f0',
                              borderRadius: '10px',
                              cursor: loading ? 'not-allowed' : 'pointer',
                              background: 'white',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.backgroundColor = '#f0fdf4'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.backgroundColor = 'white'; }}
                          >
                            <div>
                              <div style={{ fontWeight: '600', color: '#1e293b' }}>{org.name}</div>
                              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{org.slug}</div>
                            </div>
                            {loading && selectedOrg === org.id ? (
                              <Loader2 className="animate-spin" size={20} color="var(--primary)" />
                            ) : (
                              <ChevronRight size={18} color="var(--primary)" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                    <button 
                      type="button" 
                      onClick={() => { 
                        setSelectedOrg(''); 
                        setPendingOrganizations([]); 
                        setCachedGoogleToken(null); 
                        setError(''); 
                      }} 
                      style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: '500', cursor: 'pointer', fontSize: '0.9rem' }}
                    >
                      Back to Login
                    </button>
                  </div>
                </div>
              ) : emailChecked && pendingOrganizations.length > 1 && !selectedOrg ? (
                // Show org selector if email check found multiple orgs
                <div className="auth-form">
                  <div className="form-fields">
                    <div className="field-group">
                      <label>Select Your Organization</label>
                      <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1rem' }}>You're registered with multiple organizations. Please select one to continue.</p>
                      <div className="org-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                        {pendingOrganizations.map(org => (
                          <div 
                            key={org.id}
                            onClick={() => {
                              setSelectedOrg(org.id);
                              setError('');
                              setSuccess('');
                            }}
                            style={{
                              padding: '1rem',
                              border: `1.5px solid ${selectedOrg === org.id ? 'var(--primary)' : '#e2e8f0'}`,
                              borderRadius: '8px',
                              cursor: 'pointer',
                              background: selectedOrg === org.id ? '#f0fdf4' : 'white',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              transition: 'all 0.2s'
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: selectedOrg === org.id ? '600' : '500', color: '#1e293b' }}>{org.name}</div>
                              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{org.slug}</div>
                            </div>
                            {selectedOrg === org.id && <CheckCircle2 size={20} color="var(--primary)" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button 
                    type="button" 
                    className="submit-btn" 
                    onClick={handleLoginWithOrgSelected}
                    disabled={loading || !selectedOrg}
                    style={{ marginTop: '1.5rem' }}
                  >
                    {loading ? <Loader2 className="animate-spin" /> : <span>Sign In to {loginMode}</span>}
                    {!loading && <ChevronRight size={18} />}
                  </button>

                  <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                    <button type="button" onClick={() => { setView('login'); setSelectedOrg(''); setPendingOrganizations([]); setEmailChecked(false); setEmailCheckResult(null); setCachedGoogleToken(null); setError(''); }} style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: '500', cursor: 'pointer', fontSize: '0.9rem' }}>
                      Back
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Google Login Button */}
                  {!emailChecked && (
                    <>
                      <button
                        type="button"
                        className="google-auth-btn"
                        onClick={handleGoogleLogin}
                        disabled={loading || googleLoading}
                      >
                        {googleLoading ? <Loader2 className="animate-spin" size={18} /> : <GoogleIcon />}
                        <span>Continue with Google</span>
                      </button>

                      <div className="auth-divider">
                        <span>or continue with email</span>
                      </div>
                    </>
                  )}

                  <div className="form-fields">
                    {/* Email Field - Always visible initially */}
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
                              disabled={emailChecked}
                              required
                            />
                          </div>
                        </div>

                        {/* Password Field - Only shown after email check and org selection */}
                        {emailChecked && selectedOrg && (
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
                        )}
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
                              disabled={emailChecked}
                              required
                            />
                          </div>
                        </div>

                        {/* Password Field - Only shown after email check and org selection */}
                        {emailChecked && selectedOrg && (
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
                        )}
                      </>
                    )}
                  </div>

                  {/* Show org selector if multiple orgs found after email check */}
                  {emailChecked && pendingOrganizations.length > 1 && !selectedOrg && (
                    <div className="form-fields" style={{ marginTop: '1.5rem' }}>
                      <div className="field-group">
                        <label>Select Your Organization</label>
                        <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1rem' }}>You're registered with multiple organizations. Please select one to continue.</p>
                        <div className="org-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                          {pendingOrganizations.map(org => (
                            <div 
                              key={org.id}
                              onClick={() => setSelectedOrg(org.id)}
                              style={{
                                padding: '1rem',
                                border: `1.5px solid ${selectedOrg === org.id ? 'var(--primary)' : '#e2e8f0'}`,
                                borderRadius: '8px',
                                cursor: 'pointer',
                                background: selectedOrg === org.id ? '#f0fdf4' : 'white',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                transition: 'all 0.2s'
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: selectedOrg === org.id ? '600' : '500', color: '#1e293b' }}>{org.name}</div>
                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{org.slug}</div>
                              </div>
                              {selectedOrg === org.id && <CheckCircle2 size={20} color="var(--primary)" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Form Utils - Only show after password field is visible */}
                  {emailChecked && selectedOrg && (
                    <div className="form-utils">
                      <label className="remember-me">
                        <input type="checkbox" />
                        <span>Keep me logged in</span>
                      </label>
                      <a href="#" className="forgot-pass" onClick={handleForgotPassword}>Forgot Password?</a>
                    </div>
                  )}

                  {/* Submit Button - Changes based on state */}
                  <button 
                    type="submit" 
                    className="submit-btn" 
                    disabled={loading || (!emailChecked && !email) || (emailChecked && pendingOrganizations.length > 1 && !selectedOrg)}
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <span>
                        {!emailChecked ? `Check Email & Sign In to ${loginMode}` : `Sign In to ${loginMode}`}
                      </span>
                    )}
                    {!loading && <ChevronRight size={18} />}
                  </button>

                  {/* Back Button - Show if email checked */}
                  {emailChecked && (
                    <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                      <button 
                        type="button" 
                        onClick={() => { 
                          setEmailChecked(false); 
                          setSelectedOrg(''); 
                          setPendingOrganizations([]); 
                          setEmailCheckResult(null); 
                          setPassword('');
                          setCachedGoogleToken(null);
                          setError(''); 
                        }} 
                        style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: '500', cursor: 'pointer', fontSize: '0.9rem' }}
                      >
                        Back
                      </button>
                    </div>
                  )}

                  {loginMode !== 'admin' && !emailChecked && (
                    <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                      <button type="button" onClick={() => navigate('/activate')} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem' }}>
                        First time logging in? Activate account
                      </button>
                    </div>
                  )}
                </>
              )}
            </form>
          ) : view === 'select-org' ? (
            <div className="auth-form">
              <div className="form-fields">
                <div className="field-group">
                  <label>Select Organization</label>
                  <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1rem' }}>Your email is registered with multiple organizations. Please choose one to continue.</p>
                  <div className="org-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                    {pendingOrganizations.map(org => (
                      <div 
                        key={org.id}
                        onClick={() => setSelectedOrg(org.id)}
                        style={{
                          padding: '1rem',
                          border: `1.5px solid ${selectedOrg === org.id ? 'var(--primary)' : '#e2e8f0'}`,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          background: selectedOrg === org.id ? '#f0fdf4' : 'white',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: selectedOrg === org.id ? '600' : '500', color: '#1e293b' }}>{org.name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{org.slug}</div>
                        </div>
                        {selectedOrg === org.id && <CheckCircle2 size={20} color="var(--primary)" />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button 
                type="button" 
                className="submit-btn" 
                onClick={handleLoginWithOrgSelected} 
                disabled={loading || !selectedOrg}
                style={{ marginTop: '1.5rem' }}
              >
                {loading ? <Loader2 className="animate-spin" /> : <span>Continue to Dashboard</span>}
                {!loading && <ChevronRight size={18} />}
              </button>

              <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => { setView('login'); setSelectedOrg(''); setPendingOrganizations([]); setCachedGoogleToken(null); }} style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: '500', cursor: 'pointer', fontSize: '0.9rem' }}>
                  Back to Login
                </button>
              </div>
            </div>
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
                                ? true
                                : org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                org.slug.toLowerCase().includes(searchQuery.toLowerCase())
                            )
                            .sort((a, b) => b.id - a.id)
                            .slice(0, searchQuery === '' ? 2 : 10)
                            .map(org => (
                              <div
                                key={org.id}
                                onMouseDown={(e) => {
                                  e.preventDefault();
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

                    {/* Google 1-Click Activation Option */}
                    <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                      <button
                        type="button"
                        className="google-auth-btn"
                        onClick={handleGoogleActivate}
                        disabled={loading || googleLoading}
                      >
                        {googleLoading ? <Loader2 className="animate-spin" size={18} /> : <GoogleIcon />}
                        <span>Activate Account with Google (Skip OTP)</span>
                      </button>

                      <div className="auth-divider">
                        <span>or verify via email OTP</span>
                      </div>
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

                {(view === 'verify-otp' || view === 'forgot-otp') && (
                  <div className="field-group">
                    <label>Enter 6-Digit OTP</label>
                    <div className="input-with-icon">
                      <ShieldCheck size={18} />
                      <input type="text" placeholder="000000" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} required />
                    </div>
                  </div>
                )}

                {(view === 'set-password' || view === 'forgot-password') && (
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
                      view === 'verify-otp' || view === 'forgot-otp' ? 'Verify Code' :
                        view === 'forgot-password' ? 'Reset Password' : 'Activate My Account'}
                  </span>
                )}
                {!loading && <ChevronRight size={18} />}
              </button>

              <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: '500', cursor: 'pointer', fontSize: '0.9rem' }}>
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
