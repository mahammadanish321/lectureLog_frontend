import React, { useState } from 'react';
import { useRegistrationQueue } from '../context/RegistrationQueueContext';
import { Loader2, AlertCircle } from 'lucide-react';
import './RegistrationQueueUI.css';

const RegistrationQueueUI = () => {
  const { queue, failedTasks, activeTask, cancelTask, cancelAllTasks, retryFailedTask, dismissFailedTask } = useRegistrationQueue();
  const [showStopModal, setShowStopModal] = useState(false);
  const [editModalTask, setEditModalTask] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  if (!activeTask && queue.length === 0 && failedTasks.length === 0) return null;

  const handleStopOnlyThis = () => {
    if (activeTask) cancelTask(activeTask.id);
    setShowStopModal(false);
  };

  const handleStopAll = () => {
    cancelAllTasks();
    setShowStopModal(false);
  };

  const openEditModal = (task) => {
    setEditModalTask(task);
    setEditFormData(task.data);
  };

  const handleEditRetry = () => {
    retryFailedTask(editModalTask.id, editFormData);
    setEditModalTask(null);
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

        {failedTasks.length > 0 && (
          <div className="queue-ui-failed animate-fade-in-up">
            <div className="queue-failed-header">
              <AlertCircle size={14} />
              <span>Failed ({failedTasks.length})</span>
            </div>
            {failedTasks.map(t => (
              <div key={t.id} className="queue-failed-item">
                <span className="queue-failed-title">{t.name}</span>
                <span className="queue-failed-error">{t.error}</span>
                <div className="queue-failed-actions">
                  <button className="btn-retry" onClick={() => openEditModal(t)}>Fix & Retry</button>
                  <button className="btn-dismiss" onClick={() => dismissFailedTask(t.id)}>Dismiss</button>
                </div>
              </div>
            ))}
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

      {editModalTask && (
        <div className="queue-modal-overlay">
          <div className="queue-modal animate-fade-in-up">
            <h3>Fix Registration Data</h3>
            <p>Correct the data below to retry registering <strong>{editModalTask.name}</strong>.</p>
            
            <div className="queue-edit-form">
              <div className="form-group">
                <label>Name</label>
                <input type="text" value={editFormData.name || ''} onChange={e => setEditFormData({...editFormData, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={editFormData.email || ''} onChange={e => setEditFormData({...editFormData, email: e.target.value})} />
              </div>
              
              {editModalTask.type === 'student' && (
                <>
                  <div className="form-group">
                    <label>Roll Number</label>
                    <input type="text" value={editFormData.roll_number || ''} onChange={e => setEditFormData({...editFormData, roll_number: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>College ID</label>
                    <input type="text" value={editFormData.college_id || ''} onChange={e => setEditFormData({...editFormData, college_id: e.target.value})} />
                  </div>
                </>
              )}
              {editModalTask.type === 'teacher' && (
                <div className="form-group">
                  <label>Faculty ID (College ID)</label>
                  <input type="text" value={editFormData.college_id || ''} onChange={e => setEditFormData({...editFormData, college_id: e.target.value})} />
                </div>
              )}
            </div>

            <div className="queue-modal-actions">
              <button className="btn-outline" onClick={() => setEditModalTask(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleEditRetry}>Save & Retry</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RegistrationQueueUI;
