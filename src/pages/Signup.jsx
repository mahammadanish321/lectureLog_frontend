import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Loader2, User, Building2, ShieldCheck, Eye, EyeOff, CheckCircle2, ChevronRight, AlertCircle } from 'lucide-react';
import api from '../api';
import './Login.css'; // Reusing Login.css for identical styling

/* ── Eye Components (Shared with Login) ────────────────────── */

const Pupil = ({ size = 12, maxDistance = 5, pupilColor = "black", mouseX, mouseY }) => {
  const pupilRef = useRef(null);
  const calculatePupilPosition = () => {
    if (!pupilRef.current) return { x: 0, y: 0 };
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

const EyeBall = ({ size = 48, pupilSize = 16, maxDistance = 10, eyeColor = "white", pupilColor = "black", isBlinking = false, mouseX, mouseY }) => {
  const eyeRef = useRef(null);
  const calculatePupilPosition = () => {
    if (!eyeRef.current) return { x: 0, y: 0 };
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

export default function Signup() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    orgName: '',
    orgSlug: '',
    otp: '',
    password: '',
    confirmPassword: ''
  });

  // Mouse Tracking for Characters
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const [isBlinking1, setIsBlinking1] = useState(false);
  const [isBlinking2, setIsBlinking2] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const char1Ref = useRef(null);
  const char2Ref = useRef(null);
  const char3Ref = useRef(null);
  const char4Ref = useRef(null);

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

  const handleInitSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/register-init', {
        name: formData.name,
        email: formData.email,
        orgName: formData.orgName,
        orgSlug: formData.orgSlug
      });
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. This email or college ID might already be in use.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/register-verify', { email: formData.email, otp: formData.otp });
      setStep(3);
    } catch (err) {
      setError('Invalid verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/register-finalize', {
        email: formData.email,
        password: formData.password
      });
      setStep(4);
    } catch (err) {
      setError('Failed to finalize registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen-grid">
      {/* Left Column: Visuals (IDENTICAL TO LOGIN) */}
      <div className="login-visual-section">
        <div className="visual-header">
          <div className="brand-logo">
            <img src="/favicon.svg" alt="LectureLog" className="logo-img-small" />
            <span>LectureLog</span>
          </div>
          <h1>Bring your institution to the future.</h1>
          <p>The all-in-one AI platform for modern attendance and classroom management.</p>
        </div>

        <div className="characters-container">
          <div className="characters-stage">
            <div ref={char1Ref} className="character char-primary" style={{ height: isTyping ? '440px' : '400px', transform: `skewX(${pos1.bodySkew}deg) ${isTyping ? 'translateX(40px)' : ''}` }}>
              <div className="char-eyes" style={{ left: `${45 + pos1.faceX}px`, top: `${40 + pos1.faceY}px` }}>
                <EyeBall size={18} pupilSize={7} maxDistance={5} isBlinking={isBlinking1} mouseX={mouseX} mouseY={mouseY} />
                <EyeBall size={18} pupilSize={7} maxDistance={5} isBlinking={isBlinking1} mouseX={mouseX} mouseY={mouseY} />
              </div>
            </div>
            <div ref={char2Ref} className="character char-slate" style={{ transform: `skewX(${pos2.bodySkew * 1.5}deg) ${isTyping ? 'translateX(20px)' : ''}` }}>
              <div className="char-eyes" style={{ left: `${26 + pos2.faceX}px`, top: `${32 + pos2.faceY}px` }}>
                <EyeBall size={16} pupilSize={6} maxDistance={4} isBlinking={isBlinking2} mouseX={mouseX} mouseY={mouseY} />
                <EyeBall size={16} pupilSize={6} maxDistance={4} isBlinking={isBlinking2} mouseX={mouseX} mouseY={mouseY} />
              </div>
            </div>
            <div ref={char3Ref} className="character char-mint" style={{ transform: `skewX(${pos3.bodySkew}deg)` }}>
              <div className="char-eyes" style={{ left: `${82 + pos3.faceX}px`, top: `${90 + pos3.faceY}px` }}>
                <Pupil size={12} maxDistance={5} pupilColor="#111827" mouseX={mouseX} mouseY={mouseY} />
                <Pupil size={12} maxDistance={5} pupilColor="#111827" mouseX={mouseX} mouseY={mouseY} />
              </div>
            </div>
            <div ref={char4Ref} className="character char-gold" style={{ transform: `skewX(${pos4.bodySkew}deg)` }}>
              <div className="char-eyes" style={{ left: `${52 + pos4.faceX}px`, top: `${40 + pos4.faceY}px` }}>
                <Pupil size={12} maxDistance={5} pupilColor="#111827" mouseX={mouseX} mouseY={mouseY} />
                <Pupil size={12} maxDistance={5} pupilColor="#111827" mouseX={mouseX} mouseY={mouseY} />
              </div>
              <div className="char-mouth" style={{ left: `${40 + pos4.faceX}px`, top: `${88 + pos4.faceY}px` }} />
            </div>
          </div>
        </div>

        <div className="visual-footer">
          <span>&copy; 2026 LectureLog AI</span>
          <div className="footer-links">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Contact</a>
          </div>
        </div>
      </div>

      {/* Right Column: Form (IDENTICAL STYLING TO LOGIN) */}
      <div className="login-form-section">
        <div className="form-wrapper animate-fade-in">
          {step === 1 && (
            <>
              <div className="form-header">
                <h2 className="welcome-text">Register Your College</h2>
                <p className="subtitle">Start your journey with LectureLog in minutes.</p>
              </div>

              {error && <div className="error-box animate-shake"><AlertCircle size={18} /><span>{error}</span></div>}

              <form onSubmit={handleInitSignup} className="auth-form">
                <div className="field-group">
                  <label>Full Name</label>
                  <div className="input-with-icon">
                    <User size={18} />
                    <input
                      type="text" placeholder="Your name" required
                      value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                      onFocus={() => setIsTyping(true)} onBlur={() => setIsTyping(false)}
                    />
                  </div>
                </div>

                <div className="field-group">
                  <label>Institutional Email</label>
                  <div className="input-with-icon">
                    <Mail size={18} />
                    <input
                      type="email" placeholder="admin@college.edu" required
                      value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                      onFocus={() => setIsTyping(true)} onBlur={() => setIsTyping(false)}
                    />
                  </div>
                </div>

                <div className="field-group">
                  <label>College Full Name</label>
                  <div className="input-with-icon">
                    <Building2 size={18} />
                    <input
                      type="text" placeholder="e.g. Indian Institute of Technology" required
                      value={formData.orgName} onChange={e => setFormData({ ...formData, orgName: e.target.value })}
                      onFocus={() => setIsTyping(true)} onBlur={() => setIsTyping(false)}
                    />
                  </div>
                </div>

                <div className="field-group">
                  <label>Unique College ID / Slug</label>
                  <div className="input-with-icon">
                    <ShieldCheck size={18} />
                    <input
                      type="text" placeholder="e.g. iit-bombay" required
                      value={formData.orgSlug} onChange={e => setFormData({ ...formData, orgSlug: e.target.value })}
                      onFocus={() => setIsTyping(true)} onBlur={() => setIsTyping(false)}
                    />
                  </div>
                </div>

                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" /> : <span>Next: Verify Email</span>}
                  {!loading && <ChevronRight size={18} />}
                </button>
              </form>
            </>
          )}

          {step === 2 && (
            <>
              <div className="form-header">
                <h2 className="welcome-text">Verify Identity</h2>
                <p className="subtitle">Enter the 6-digit code sent to {formData.email}</p>
              </div>
              <form onSubmit={handleVerifyOtp} className="auth-form">
                <div className="field-group">
                  <div className="input-with-icon" style={{ justifyContent: 'center' }}>
                    <input
                      type="text" placeholder="000000" maxLength={6} required
                      value={formData.otp} onChange={e => setFormData({ ...formData, otp: e.target.value })}
                      style={{ textAlign: 'center', fontSize: '2rem', letterSpacing: '0.5rem', paddingLeft: '1rem' }}
                    />
                  </div>
                </div>
                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" /> : <span>Verify & Continue</span>}
                </button>
              </form>
            </>
          )}

          {step === 3 && (
            <>
              <div className="form-header">
                <h2 className="welcome-text">Set Password</h2>
                <p className="subtitle">Secure your institutional admin account.</p>
              </div>
              <form onSubmit={handleFinalize} className="auth-form">
                <div className="field-group">
                  <label>New Password</label>
                  <div className="input-with-icon">
                    <Lock size={18} />
                    <input
                      type={showPassword ? 'text' : 'password'} placeholder="••••••••" required
                      value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                    />
                    <button type="button" className="toggle-pass" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="field-group">
                  <label>Confirm Password</label>
                  <div className="input-with-icon">
                    <Lock size={18} />
                    <input
                      type="password" placeholder="••••••••" required
                      value={formData.confirmPassword} onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                    />
                  </div>
                </div>
                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" /> : <span>Create Institution</span>}
                </button>
              </form>
            </>
          )}

          {step === 4 && (
            <div className="animate-fade-in" style={{ textAlign: 'center' }}>
              <div style={{ width: '5rem', height: '5rem', backgroundColor: '#ecfdf5', color: '#105934', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', border: '2px solid #bbf7d0' }}>
                <CheckCircle2 size={48} />
              </div>
              <h2 className="welcome-text">Registration Complete!</h2>
              <p className="subtitle" style={{ marginBottom: '2.5rem' }}>Your institution has been created successfully. You can now log in to your admin dashboard.</p>
              <button onClick={() => navigate('/login')} className="submit-btn">Go to Login</button>
            </div>
          )}

          {step < 4 && (
            <div className="form-footer">
              Already registered? <Link to="/login">Sign In</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
