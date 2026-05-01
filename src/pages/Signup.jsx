import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { UserPlus, Mail, Lock, User, ShieldCheck, Loader2 } from 'lucide-react';
import './Login.css';

const Signup = () => {
  const [role, setRole] = useState('admin'); // Only Admin can use public signup
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/signup', { ...formData, role: 'admin' });
      navigate('/login', { state: { message: 'Admin account created successfully! Please log in.' } });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create admin account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box glass animate-fade-in">
        <div className="login-header">
          <div className="logo-icon-large">LL</div>
          <h1>Join LectureLog</h1>
          <p>Create an Admin Account</p>
        </div>

        {error && <div className="error-message badge-danger" style={{ padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <User size={18} className="input-icon" />
            <input 
              type="text" 
              name="name"
              placeholder="Full Name" 
              value={formData.name}
              onChange={handleChange}
              required 
            />
          </div>

          <div className="input-group">
            <Mail size={18} className="input-icon" />
            <input 
              type="email" 
              name="email"
              placeholder="Email address" 
              value={formData.email}
              onChange={handleChange}
              required 
            />
          </div>

          <div className="input-group">
            <Lock size={18} className="input-icon" />
            <input 
              type="password" 
              name="password"
              placeholder="Password (Min 8 chars)" 
              value={formData.password}
              onChange={handleChange}
              required 
            />
          </div>

          <button type="submit" className="btn btn-primary login-btn" disabled={loading} style={{ marginTop: '1rem' }}>
            {loading ? <Loader2 className="animate-spin" /> : <UserPlus size={20} />}
            <span>{loading ? 'Creating Admin...' : 'Sign Up as Admin'}</span>
          </button>
        </form>

        <div className="login-footer">
          <p>Already have an account? <Link to="/login" className="link">Sign In</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
