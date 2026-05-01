import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Mail, Lock, Loader2, User, ShieldCheck } from 'lucide-react';
import './Login.css';

const Login = () => {
  const [loginMode, setLoginMode] = useState('teacher'); // 'teacher', 'admin', 'student'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, adminLogin, studentLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (loginMode === 'teacher') {
        await login(email, password);
      } else if (loginMode === 'admin') {
        await adminLogin(email, password);
      } else {
        await studentLogin(rollNumber, collegeId);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box glass animate-fade-in">
        <div className="login-header">
          <div className="logo-icon-large">LL</div>
          <h1>LectureLog</h1>
          <p>Choose your account type to continue</p>
        </div>

        <div className="login-tabs">
          <button 
            type="button"
            className={`tab-btn ${loginMode === 'teacher' ? 'active' : ''}`}
            onClick={() => setLoginMode('teacher')}
          >
            <User size={14} />
            <span>Teacher</span>
          </button>
          <button 
            type="button"
            className={`tab-btn ${loginMode === 'admin' ? 'active' : ''}`}
            onClick={() => setLoginMode('admin')}
          >
            <ShieldCheck size={14} />
            <span>Admin</span>
          </button>
          <button 
            type="button"
            className={`tab-btn ${loginMode === 'student' ? 'active' : ''}`}
            onClick={() => setLoginMode('student')}
          >
            <LogIn size={14} />
            <span>Student</span>
          </button>
        </div>

        {error && <div className="error-message badge-danger" style={{ padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          {loginMode !== 'student' ? (
            <>
              <div className="input-group">
                <Mail size={18} className="input-icon" />
                <input 
                  type="email" 
                  placeholder={`${loginMode === 'admin' ? 'Admin' : 'Teacher'} Email`} 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>

              <div className="input-group">
                <Lock size={18} className="input-icon" />
                <input 
                  type={loginMode === 'teacher' ? 'text' : 'password'} 
                  placeholder={loginMode === 'teacher' ? 'College ID' : 'Password'} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>
            </>
          ) : (
            <>
              <div className="input-group">
                <LogIn size={18} className="input-icon" />
                <input 
                  type="text" 
                  placeholder="Roll Number" 
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  required 
                />
              </div>

              <div className="input-group">
                <Lock size={18} className="input-icon" />
                <input 
                  type="text" 
                  placeholder="College ID" 
                  value={collegeId}
                  onChange={(e) => setCollegeId(e.target.value)}
                  required 
                />
              </div>
            </>
          )}

          <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <LogIn size={20} />}
            <span>{loading ? 'Logging in...' : `Sign In as ${loginMode.charAt(0).toUpperCase() + loginMode.slice(1)}`}</span>
          </button>
        </form>

        {loginMode === 'admin' && (
          <div className="login-footer">
            <p>Don't have an admin account? <Link to="/signup" className="link">Sign Up</Link></p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
