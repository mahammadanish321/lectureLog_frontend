/**
 * Secure Preload Bridge for Merge Admin Desktop
 * 
 * Exposes a minimal, safe API surface to the renderer process via contextBridge.
 * The renderer should NEVER access Electron internals directly.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // ── Platform Detection ──────────────────────────────────────
  isElectron: true,

  // ── AI Service Lifecycle ────────────────────────────────────
  // Renderer requests AI start (main process will verify role)
  startAI: (sessionInfo) => ipcRenderer.invoke('start-ai-service', sessionInfo),
  // Renderer requests AI stop — returns promise that resolves when AI is fully dead
  stopAI: () => ipcRenderer.invoke('stop-ai-service'),

  // ── Auth Session Sync ───────────────────────────────────────
  // Notify main process of the current authenticated role
  setAuthRole: (role) => ipcRenderer.send('set-auth-role', role),

  // ── AI Status Listeners ─────────────────────────────────────
  onAIStatusChange: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('ai-status-changed', handler);
    // Return cleanup function
    return () => ipcRenderer.removeListener('ai-status-changed', handler);
  },

  onAIProcessCrash: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('ai-process-crash', handler);
    return () => ipcRenderer.removeListener('ai-process-crash', handler);
  },

  onAILog: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('ai-log', handler);
    return () => ipcRenderer.removeListener('ai-log', handler);
  },

  getAILogs: () => ipcRenderer.invoke('get-ai-logs'),

  // ── Session Force-Logout ────────────────────────────────────
  onForceLogout: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('force-logout', handler);
    return () => ipcRenderer.removeListener('force-logout', handler);
  },

  // ── App Auto-Updater ─────────────────────────────────────────
  onUpdateAvailable: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('app-update-available', handler);
    return () => ipcRenderer.removeListener('app-update-available', handler);
  },
  onUpdateProgress: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('app-update-progress', handler);
    return () => ipcRenderer.removeListener('app-update-progress', handler);
  },
  onUpdateReady: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('app-update-ready', handler);
    return () => ipcRenderer.removeListener('app-update-ready', handler);
  },
  onUpdateError: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('app-update-error', handler);
    return () => ipcRenderer.removeListener('app-update-error', handler);
  },
  installUpdate: () => ipcRenderer.send('install-update-now'),
  
  // ── Native Theme Sync ───────────────────────────────────────
  setNativeTheme: (theme) => ipcRenderer.send('set-native-theme', theme),
});
