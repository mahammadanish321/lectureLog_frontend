import axios from 'axios';

const getBaseURL = () => {
  return import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
});

// Add a request interceptor to include JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: catch session replacement / expiry ──
let isForceLoggingOut = false; // Prevent multiple simultaneous force-logouts

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const code = error.response?.data?.code;
    
    if ((code === 'SESSION_REPLACED' || code === 'SESSION_EXPIRED') && !isForceLoggingOut) {
      isForceLoggingOut = true;
      console.warn(`[API] ${code}: ${error.response.data.message}`);

      // Stop AI on Electron before clearing state
      if (window.electronAPI?.stopAI) {
        try { await window.electronAPI.stopAI(); } catch (e) {}
      }

      // Clear auth state
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Alert user and redirect
      const msg = code === 'SESSION_REPLACED'
        ? 'Your admin session was taken over by another device. You have been logged out.'
        : 'Your session expired due to inactivity. Please log in again.';
      
      alert(msg);
      window.location.href = window.electronAPI?.isElectron ? '#/login' : '/login';
      
      // Reset flag after a delay
      setTimeout(() => { isForceLoggingOut = false; }, 3000);
    }

    return Promise.reject(error);
  }
);

export default api;
