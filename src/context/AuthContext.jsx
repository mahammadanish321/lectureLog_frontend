import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext();

// ── Secure Platform Detection (Refinement #10) ──────────────────
const isElectronEnv = () => !!(window.electronAPI && window.electronAPI.isElectron);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);

      // Sync role to main process on page reload
      if (isElectronEnv()) {
        window.electronAPI.setAuthRole(parsed.role);
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password, role, organization_id) => {
    const response = await api.post('/auth/login', { email, password, role, organization_id });
    const { token, user } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);

    // Sync role to Electron main process
    if (isElectronEnv()) {
      window.electronAPI.setAuthRole(user.role);
    }
    return user;
  };

  const adminLogin = async (email, password) => {
    const response = await api.post('/auth/admin/login', { email, password });
    const { token, user } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);

    // ── Start AI service only for admin on desktop ──
    if (isElectronEnv()) {
      window.electronAPI.setAuthRole('admin');
      try {
        const result = await window.electronAPI.startAI({ role: 'admin' });
        console.log('[AUTH] AI start result:', result);
      } catch (err) {
        console.warn('[AUTH] Failed to start AI via IPC:', err);
      }
    }
    return user;
  };

  const studentLogin = async (email, password, organization_id) => {
    const response = await api.post('/auth/student/login', { email, password, organization_id });
    const { token, user } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);

    // Sync role — student never gets AI
    if (isElectronEnv()) {
      window.electronAPI.setAuthRole('student');
    }
    return user;
  };

  // ── Logout with full AI shutdown (Refinement #3) ────────────
  const logout = async () => {
    // Step 1: If on Electron, stop AI FIRST and WAIT for full shutdown
    if (isElectronEnv()) {
      try {
        console.log('[AUTH] Requesting AI shutdown before logout...');
        await window.electronAPI.stopAI(); // Returns only after AI process is dead
        console.log('[AUTH] ✅ AI shutdown confirmed.');
      } catch (err) {
        console.warn('[AUTH] AI shutdown error (proceeding with logout):', err);
      }
    }

    // Step 2: Clear all local state
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, adminLogin, studentLogin, logout, loading, isElectronEnv }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
