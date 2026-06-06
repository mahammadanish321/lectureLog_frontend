import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext();

// ── Secure Platform Detection (Refinement #10) ──────────────────
const isElectronEnv = () => !!(window.electronAPI && window.electronAPI.isElectron);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shouldShowTour, setShouldShowTour] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);

      // Sync tour state
      const tourKey = `merge_tour_v1_${parsed.id}`;
      if (!localStorage.getItem(tourKey)) {
        setShouldShowTour(true);
      }

      // Sync role to main process and start AI if admin on page reload
      if (isElectronEnv()) {
        window.electronAPI.setAuthRole(parsed.role);
        if (parsed.role === 'admin') {
          console.log('[AUTH] Reload detected for admin. Auto-starting local AI service...');
          window.electronAPI.startAI({ role: 'admin', organization_id: parsed.organization_id })
            .catch(err => console.warn('[AUTH] Auto-starting local AI failed:', err));
        }
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

    const tourKey = `merge_tour_v1_${user.id}`;
    if (!localStorage.getItem(tourKey)) {
      setShouldShowTour(true);
    }

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

    const tourKey = `merge_tour_v1_${user.id}`;
    if (!localStorage.getItem(tourKey)) {
      setShouldShowTour(true);
    }

    // ── Start AI service only for admin on desktop ──
    if (isElectronEnv()) {
      window.electronAPI.setAuthRole('admin');
      try {
        const result = await window.electronAPI.startAI({ role: 'admin', organization_id: user.organization_id });
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

    const tourKey = `merge_tour_v1_${user.id}`;
    if (!localStorage.getItem(tourKey)) {
      setShouldShowTour(true);
    }

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
    setShouldShowTour(false);
  };

  const markTourComplete = () => {
    if (user) {
      const tourKey = `merge_tour_v1_${user.id}`;
      localStorage.setItem(tourKey, 'true');
      setShouldShowTour(false);
    }
  };

  const restartTour = () => {
    setShouldShowTour(true);
  };

  return (
    <AuthContext.Provider value={{ user, login, adminLogin, studentLogin, logout, loading, isElectronEnv, shouldShowTour, markTourComplete, restartTour }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
