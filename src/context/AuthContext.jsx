import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Development mode: bypass login if VITE_BYPASS_AUTH is set or localStorage flag exists
    const bypassAuth = localStorage.getItem('bypassAuth') === 'true';
    
    if (bypassAuth || import.meta.env.VITE_BYPASS_AUTH === 'true') {
      const mockUser = {
        id: 'dev-admin-001',
        email: 'admin@lectureLog.dev',
        name: 'Admin User',
        role: 'admin',
        verified: true
      };
      setUser(mockUser);
      localStorage.setItem('user', JSON.stringify(mockUser));
      setLoading(false);
      return;
    }

    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token, user } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    return user;
  };

  const adminLogin = async (email, password) => {
    const response = await api.post('/auth/admin/login', { email, password });
    const { token, user } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    return user;
  };

  const studentLogin = async (roll_number, college_id) => {
    const response = await api.post('/auth/student/login', { roll_number, college_id });
    const { token, user } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    localStorage.removeItem('bypassAuth');
  };

  const enableBypass = (role = 'admin') => {
    const mockUser = {
      id: `dev-${role}-${Date.now()}`,
      email: `${role}@lectureLog.dev`,
      name: `${role.charAt(0).toUpperCase() + role.slice(1)} User`,
      role,
      verified: true
    };
    setUser(mockUser);
    localStorage.setItem('user', JSON.stringify(mockUser));
    localStorage.setItem('bypassAuth', 'true');
  };

  return (
    <AuthContext.Provider value={{ user, login, adminLogin, studentLogin, logout, loading, enableBypass }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
