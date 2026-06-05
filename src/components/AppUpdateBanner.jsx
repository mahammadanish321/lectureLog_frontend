import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, RefreshCw, X, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

const MotionDiv = motion.div;

/**
 * AppUpdateBanner — shows in-app update notifications for the Electron desktop app.
 * Listens for IPC events from electron-main.cjs via window.electronAPI.
 *
 * States:
 *  - 'available'   → update found, downloading in background
 *  - 'downloading' → shows live download progress
 *  - 'ready'       → update downloaded, ask user to restart
 *  - 'error'       → update failed (user must download manually)
 */
export default function AppUpdateBanner() {
  const [state, setState] = useState(null); // null | 'available' | 'downloading' | 'ready' | 'error'
  const [version, setVersion] = useState('');
  const [progress, setProgress] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!window.electronAPI) return;

    const cleanups = [
      window.electronAPI.onUpdateAvailable((data) => {
        setVersion(data.version || '');
        setState('available');
        setDismissed(false);
      }),
      window.electronAPI.onUpdateProgress((data) => {
        setProgress(data.percent || 0);
        setState('downloading');
      }),
      window.electronAPI.onUpdateReady((data) => {
        setVersion((currentVersion) => data.version || currentVersion);
        setState('ready');
        setDismissed(false); // Always re-show when ready
      }),
      window.electronAPI.onUpdateError(() => {
        setState('error');
        setDismissed(false);
      }),
    ];

    return () => cleanups.forEach(fn => fn && fn());
  }, []);

  if (!state || dismissed) return null;

  // ── Visual config per state ──────────────────────────────
  const config = {
    available: {
      bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
      border: '#86efac',
      icon: <Loader2 size={18} className="spin-icon" style={{ color: '#16a34a' }} />,
      title: `Update v${version} found`,
      subtitle: 'Downloading in the background — you can keep working.',
      action: null,
    },
    downloading: {
      bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
      border: '#93c5fd',
      icon: <Download size={18} style={{ color: '#2563eb' }} />,
      title: `Downloading update… ${progress}%`,
      subtitle: 'The app will prompt you to restart when done.',
      action: null,
    },
    ready: {
      bg: 'linear-gradient(135deg, #105934 0%, #0d4a2c 100%)',
      border: '#064e3b',
      icon: <CheckCircle2 size={18} style={{ color: '#4ade80' }} />,
      title: `v${version} is ready to install`,
      subtitle: 'Restart now to get the latest features and fixes.',
      action: (
        <button
          onClick={() => window.electronAPI.installUpdate()}
          style={{
            background: 'white',
            color: '#105934',
            border: 'none',
            borderRadius: '10px',
            padding: '0.45rem 1.1rem',
            fontWeight: 800,
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexShrink: 0,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <RefreshCw size={14} /> Restart Now
        </button>
      ),
    },
    error: {
      bg: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
      border: '#fdba74',
      icon: <AlertTriangle size={18} style={{ color: '#ea580c' }} />,
      title: 'Auto-update failed',
      subtitle: 'Please download the latest version manually from GitHub.',
      action: (
        <a
          href="https://github.com/mahammadanish321/lectureLog_frontend/releases/latest"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: '#ea580c',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '10px',
            padding: '0.45rem 1.1rem',
            fontWeight: 800,
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexShrink: 0,
          }}
        >
          <Download size={14} /> Download Manually
        </a>
      ),
    },
  };

  const c = config[state];
  const isReady = state === 'ready';

  return (
    <>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin-icon { animation: spin 1.5s linear infinite; }
      `}</style>
      <AnimatePresence>
        <MotionDiv
          key={state}
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          style={{
            position: 'fixed',
            top: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 99999,
            background: c.bg,
            border: `1px solid ${c.border}`,
            borderRadius: '16px',
            padding: '0.65rem 1rem 0.65rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
            minWidth: '320px',
            maxWidth: '520px',
            backdropFilter: 'blur(8px)',
          }}
        >
          {/* Icon */}
          <div style={{ flexShrink: 0 }}>{c.icon}</div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '0.82rem',
              fontWeight: 800,
              color: isReady ? 'white' : '#1e293b',
              lineHeight: 1.3,
            }}>{c.title}</div>
            <div style={{
              fontSize: '0.72rem',
              color: isReady ? 'rgba(255,255,255,0.75)' : '#64748b',
              marginTop: '2px',
            }}>{c.subtitle}</div>

            {/* Progress bar for downloading state */}
            {state === 'downloading' && (
              <div style={{
                marginTop: '6px',
                height: '4px',
                background: '#bfdbfe',
                borderRadius: '99px',
                overflow: 'hidden',
              }}>
                <MotionDiv
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: 'linear' }}
                  style={{ height: '100%', background: '#2563eb', borderRadius: '99px' }}
                />
              </div>
            )}
          </div>

          {/* Action button */}
          {c.action}

          {/* Dismiss (not for ready state — user must restart or keep it) */}
          {state !== 'ready' && (
            <button
              onClick={() => setDismissed(true)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
                padding: '2px',
                display: 'flex',
                flexShrink: 0,
              }}
              title="Dismiss"
            >
              <X size={14} />
            </button>
          )}
        </MotionDiv>
      </AnimatePresence>
    </>
  );
}
