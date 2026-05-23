import React, { useState } from 'react';
import { useRegistrationQueue } from '../context/RegistrationQueueContext';
import { Loader2 } from 'lucide-react';
import './RegistrationQueueUI.css';

const RegistrationQueueUI = () => {
  const { queue, activeTask, cancelTask, cancelAllTasks } = useRegistrationQueue();
  const [showStopModal, setShowStopModal] = useState(false);

  if (!activeTask && queue.length === 0) return null;

  const handleStopOnlyThis = () => {
    if (activeTask) cancelTask(activeTask.id);
    setShowStopModal(false);
  };

  const handleStopAll = () => {
    cancelAllTasks();
    setShowStopModal(false);
  };

  return (
    <>
      <div className="queue-ui-container animate-fade-in-up">
        {activeTask && (
          <div className="queue-ui-active">
            <div className="queue-header">
              <span className="queue-title">Registering: <strong>{activeTask.name}</strong></span>
              <button className="queue-stop-btn" onClick={() => setShowStopModal(true)}>
                Stop
              </button>
            </div>
            
            <div className="queue-progress-bar-container">
              <div 
                className="queue-progress-bar-fill" 
                style={{ width: `${activeTask.progress.steps.length > 0 ? (activeTask.progress.current / activeTask.progress.steps.length) * 100 : 0}%` }}
              />
            </div>
            
            <div className="queue-progress-label">
              {activeTask.progress.label.includes('❌') || activeTask.progress.label.includes('✅') 
                ? activeTask.progress.label 
                : <><Loader2 size={12} className="spinner" /> {activeTask.progress.label}</>}
            </div>
          </div>
        )}
        
        {queue.length > 0 && (
          <div className="queue-ui-pending">
            <span>{queue.length} more in queue...</span>
          </div>
        )}
      </div>

      {showStopModal && activeTask && (
        <div className="queue-modal-overlay">
          <div className="queue-modal animate-fade-in-up">
            <h3>Stop Registration</h3>
            <p>Do you want to stop the registration for <strong>{activeTask.name}</strong>, or stop all pending registrations?</p>
            <div className="queue-modal-actions">
              <button className="btn-outline" onClick={() => setShowStopModal(false)}>Cancel</button>
              <button className="btn-danger" onClick={handleStopOnlyThis}>Stop {activeTask.name}</button>
              {queue.length > 0 && (
                <button className="btn-danger-strong" onClick={handleStopAll}>Stop All</button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RegistrationQueueUI;
