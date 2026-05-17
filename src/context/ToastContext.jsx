import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback((msgOrObj, type = 'info', duration = 4000, priority = 'normal', onClick = null) => {
    const id = Date.now();
    let message = typeof msgOrObj === 'string' ? msgOrObj : msgOrObj.message;
    let title = typeof msgOrObj === 'object' ? msgOrObj.title : null;
    let image = typeof msgOrObj === 'object' ? msgOrObj.image : null;
    let finalType = typeof msgOrObj === 'object' ? (msgOrObj.type || type) : type;
    let finalPriority = typeof msgOrObj === 'object' ? (msgOrObj.priority || priority) : priority;
    let finalOnClick = typeof msgOrObj === 'object' ? (msgOrObj.onClick || onClick) : onClick;

    if (finalPriority === 'silent') return;

    setToasts(prev => [...prev, { id, title, message, image, type: finalType, priority: finalPriority, onClick: finalOnClick }]);

    if (finalPriority !== 'critical') {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="toast-container">
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            className={`toast-item ${toast.type} priority-${toast.priority} ${toast.onClick ? 'clickable' : ''}`}
            onClick={() => {
              if (toast.onClick) {
                toast.onClick();
                removeToast(toast.id);
              }
            }}
          >
            {toast.image ? (
              <img src={toast.image} alt="Sender" style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div className="toast-icon">
                {toast.type === 'success' && <CheckCircle2 size={20} />}
                {(toast.type === 'error' || toast.priority === 'critical') && <AlertCircle size={20} />}
                {toast.type !== 'success' && toast.type !== 'error' && toast.priority !== 'critical' && <Info size={20} />}
              </div>
            )}
            <div className="toast-content">
              {toast.title && <h6 style={{ margin: 0, marginBottom: '3px', fontSize: '14px', color: toast.priority === 'critical' ? '#ef4444' : 'var(--primary)' }}>{toast.title}</h6>}
              <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: '1.4' }}>{toast.message}</p>
            </div>
            <button className="toast-close" onClick={(e) => { e.stopPropagation(); removeToast(toast.id); }}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
