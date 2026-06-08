import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import './Requests.css';

const Requests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/requests');
      setRequests(res.data);
    } catch (err) {
      console.error('Failed to fetch requests', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, status) => {
    setActionLoading(true);
    try {
      await api.post(`/requests/${id}/action`, { status });
      fetchRequests();
    } catch (err) {
      alert('Action failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="loading-screen"><Loader2 className="animate-spin" /></div>;

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const pastRequests = requests.filter(r => r.status !== 'pending');

  return (
    <div className="sub-mgr-container animate-fade-in">
      <div className="sub-mgr-header">
        <div>
          <h1 className="sub-mgr-title">Class Requests</h1>
          <p className="sub-mgr-subtitle">Approve or reject teacher cancellation/handover requests</p>
        </div>
      </div>

      <div className="sub-mgr-content">
        <h2>Pending Requests ({pendingRequests.length})</h2>
        <div className="sub-grid">
          {pendingRequests.map(req => (
            <div key={req.id} className="sub-card">
              <div className="sub-card-header">
                <h3>{req.request_type === 'cancel' ? 'Cancellation' : 'Handover'} Request</h3>
                <span className="sub-code" style={{ background: '#fef08a', color: '#854d0e' }}>Pending</span>
              </div>
              <div className="sub-card-body">
                <p><strong>From:</strong> {req.requester_name}</p>
                <p><strong>Date:</strong> {new Date(req.request_date).toLocaleDateString()}</p>
                {req.subject_name && <p><strong>Class:</strong> {req.subject_name} {req.classroom_name ? `(${req.classroom_name})` : ''}</p>}
                {req.start_time && <p><strong>Time:</strong> {req.start_time.substring(0,5)} - {req.end_time.substring(0,5)}</p>}
                {req.request_type === 'handover' && <p><strong>To:</strong> {req.target_teacher_name}</p>}
                <p><strong>Reason:</strong> {req.reason || 'No reason provided'}</p>
                <p className="request-time" style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>
                  Requested at: {new Date(req.created_at).toLocaleString()}
                </p>
              </div>
              <div className="sub-card-footer">
                <button
                  className="sub-btn-del"
                  style={{ background: '#ef4444', color: '#fff' }}
                  onClick={() => handleAction(req.id, 'rejected')}
                  disabled={actionLoading}
                >
                  <XCircle size={16} /> Reject
                </button>
                <button
                  className="sub-btn-edit"
                  style={{ background: '#22c55e', color: '#fff' }}
                  onClick={() => handleAction(req.id, 'approved')}
                  disabled={actionLoading}
                >
                  <CheckCircle2 size={16} /> Approve
                </button>
              </div>
            </div>
          ))}
          {pendingRequests.length === 0 && <p>No pending requests.</p>}
        </div>

        <h2>Request History</h2>
        <div className="sub-grid">
          {pastRequests.map(req => (
            <div key={req.id} className="sub-card history-card" style={{ opacity: 0.8 }}>
              <div className="sub-card-header">
                <h3>{req.request_type === 'cancel' ? 'Cancellation' : 'Handover'} Request</h3>
                <span className="sub-code" style={{ 
                  background: req.status === 'approved' ? '#dcfce7' : '#fee2e2', 
                  color: req.status === 'approved' ? '#166534' : '#991b1b' 
                }}>
                  {req.status.toUpperCase()}
                </span>
              </div>
              <div className="sub-card-body">
                <p><strong>From:</strong> {req.requester_name}</p>
                <p><strong>Date:</strong> {new Date(req.request_date).toLocaleDateString()}</p>
                {req.subject_name && <p><strong>Class:</strong> {req.subject_name} {req.classroom_name ? `(${req.classroom_name})` : ''}</p>}
                {req.start_time && <p><strong>Time:</strong> {req.start_time.substring(0,5)} - {req.end_time.substring(0,5)}</p>}
                {req.request_type === 'handover' && <p><strong>To:</strong> {req.target_teacher_name}</p>}
                <p><strong>Reason:</strong> {req.reason || 'No reason provided'}</p>
              </div>
            </div>
          ))}
          {pastRequests.length === 0 && <p>No past requests.</p>}
        </div>
      </div>
    </div>
  );
};

export default Requests;
