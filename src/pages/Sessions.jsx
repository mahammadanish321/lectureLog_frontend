import React, { useState, useEffect } from 'react';
import api from '../api';
import { 
  Plus, 
  Play, 
  Square, 
  Video,
  Loader2,
  X
} from 'lucide-react';
import './Sessions.css';

const Sessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    subject_id: '',
    classroom_id: '',
    duration: '60'
  });

  const fetchSessions = async () => {
    try {
      const response = await api.get('/sessions');
      setSessions(response.data);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleStartSession = async (e) => {
    e.preventDefault();
    try {
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + parseInt(formData.duration) * 60 * 1000);
      
      await api.post('/sessions/start', {
        subject_id: parseInt(formData.subject_id),
        classroom_id: parseInt(formData.classroom_id),
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString()
      });
      
      setShowModal(false);
      fetchSessions();
    } catch (err) {
      alert('Failed to start session: ' + err.message);
    }
  };

  const handleEndSession = async (id) => {
    try {
      await api.post('/sessions/end', { id });
      fetchSessions();
    } catch (err) {
      alert('Failed to end session');
    }
  };

  return (
    <div className="sessions-container animate-fade-in">
      <div className="page-header">
        <h2>Class Sessions</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} />
          <span>New Session</span>
        </button>
      </div>

      <div className="sessions-table">
        {loading ? (
          <div className="loader-container">
            <Loader2 className="animate-spin" size={40} />
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Camera / Room</th>
                <th>Time Range</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length > 0 ? (
                sessions.map((session) => (
                  <tr key={session.id}>
                    <td>
                      <div className="subject-name">{session.subject_name}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Video size={14} className="text-muted" />
                        <span>{session.camera_url || 'Default Lab'}</span>
                      </div>
                    </td>
                    <td>{new Date(session.start_time).toLocaleTimeString()} - {new Date(session.end_time).toLocaleTimeString()}</td>
                    <td>
                      <span className={`status-badge ${session.status}`}>
                        {session.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-btns">
                        {session.status === 'active' ? (
                          <button className="btn-icon danger" onClick={() => handleEndSession(session.id)} title="End Session">
                            <Square size={14} />
                          </button>
                        ) : (
                          <span className="text-muted" style={{ fontSize: '0.75rem' }}>Ended</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted-foreground)' }}>
                    No sessions found. Start a new one to track attendance.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3>Start New Session</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleStartSession}>
              <div className="form-group">
                <label>Subject ID</label>
                <input 
                  type="number" 
                  value={formData.subject_id}
                  onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                  placeholder="e.g. 1"
                  required 
                />
              </div>
              <div className="form-group">
                <label>Classroom ID</label>
                <input 
                  type="number" 
                  value={formData.classroom_id}
                  onChange={(e) => setFormData({ ...formData, classroom_id: e.target.value })}
                  placeholder="e.g. 1"
                  required 
                />
              </div>
              <div className="form-group">
                <label>Duration (minutes)</label>
                <input 
                  type="number" 
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  required 
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Start Session</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sessions;
