import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Trash2, Clock } from 'lucide-react';
import api from '../api';
import './WritingPad.css';
import { useToast } from '../context/ToastContext';

const PadDashboard = () => {
  const [pads, setPads] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => {
    fetchPads();
  }, []);

  const fetchPads = async () => {
    try {
      setLoading(true);
      const res = await api.get('/pads/user/all');
      setPads(res.data);
    } catch (error) {
      console.error('Failed to fetch pads:', error);
      addToast('Failed to load your pads', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = async () => {
    try {
      const res = await api.post('/pads', { title: 'Untitled Pad' });
      navigate(`/pads/${res.data.id}`);
    } catch (error) {
      console.error('Failed to create pad:', error);
      addToast(`Failed to create: ${error.message}`, 'error');
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this pad?')) return;
    
    try {
      await api.delete(`/pads/${id}`);
      setPads(pads.filter(p => p.id !== id));
      addToast('Pad deleted', 'success');
    } catch (error) {
      console.error('Failed to delete pad:', error);
      addToast('Failed to delete pad', 'error');
    }
  };

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="pad-dashboard-container animate-fade-in">
      <div className="pad-dashboard-header">
        <div>
          <h2>Writing Pads</h2>
          <p>Your distraction-free personal notes</p>
        </div>
        <button className="primary-btn" onClick={handleCreateNew}>
          <Plus size={18} /> New Pad
        </button>
      </div>

      {loading ? (
        <div className="pad-loading-state">
          <div className="spinner"></div>
          <p>Loading your pads...</p>
        </div>
      ) : pads.length === 0 ? (
        <div className="pad-empty-state">
          <FileText size={48} className="empty-icon" />
          <h3>No pads yet</h3>
          <p>Create your first writing pad to start taking notes.</p>
          <button className="primary-btn" onClick={handleCreateNew}>
            <Plus size={18} /> Create New Pad
          </button>
        </div>
      ) : (
        <div className="pad-grid">
          {pads.map(pad => (
            <div key={pad.id} className="pad-card" onClick={() => navigate(`/pads/${pad.id}`)}>
              <div className="pad-card-header">
                <FileText size={24} className="pad-icon" />
                <button className="pad-delete-btn" onClick={(e) => handleDelete(e, pad.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="pad-card-body">
                <h3>{pad.title || 'Untitled Pad'}</h3>
              </div>
              <div className="pad-card-footer">
                <Clock size={14} /> 
                <span>Updated {formatDate(pad.updated_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PadDashboard;
