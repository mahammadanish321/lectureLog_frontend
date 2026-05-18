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

  // ── Session Force-Logout ────────────────────────────────────
  onForceLogout: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('force-logout', handler);
    return () => ipcRenderer.removeListener('force-logout', handler);
  },
});
