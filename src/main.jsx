import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// --- ELECTRON NATIVE DIALOG FIX ---
// On Windows, returning from a native synchronous dialog (alert/confirm)
// often causes Chromium to lose pointer focus, making the UI feel frozen.
// This patch forces a layout hit-test recalculation when the dialog closes.
if (window.navigator.userAgent.includes('Electron')) {
  const _originalAlert = window.alert;
  window.alert = function (...args) {
    _originalAlert.apply(this, args);
    setTimeout(() => {
      window.focus();
      const originalEvents = document.body.style.pointerEvents;
      document.body.style.pointerEvents = 'none';
      window.requestAnimationFrame(() => {
        document.body.style.pointerEvents = originalEvents;
      });
    }, 10);
  };

  const _originalConfirm = window.confirm;
  window.confirm = function (...args) {
    const result = _originalConfirm.apply(this, args);
    setTimeout(() => {
      window.focus();
      const originalEvents = document.body.style.pointerEvents;
      document.body.style.pointerEvents = 'none';
      window.requestAnimationFrame(() => {
        document.body.style.pointerEvents = originalEvents;
      });
    }, 10);
    return result;
  };
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
