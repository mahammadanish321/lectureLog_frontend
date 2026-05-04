import React, { useState, useEffect } from 'react';
import api from '../api';
import { BookOpen, Search, Trash2, Edit2, Check, X, Plus, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './SubjectManager.css';

const SubjectManager = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal & Form State
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentEditId, setCurrentEditId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: ''
  });

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const response = await api.get('/subjects');
      setSubjects(response.data);
    } catch (err) {
      console.error('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleEditClick = (subject) => {
    setFormData({
      code: subject.code,
      name: subject.name
    });
    setCurrentEditId(subject.id);
    setIsEditMode(true);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setIsEditMode(false);
    setCurrentEditId(null);
    setFormData({ code: '', name: '' });
    setSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isEditMode) {
        await api.put(`/subjects/${currentEditId}`, formData);
      } else {
        await api.post('/subjects', formData);
      }
      setSuccess(true);
      setTimeout(() => {
        closeModal();
        fetchSubjects();
      }, 1200);
    } catch (err) {
      alert('Operation Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this subject from the curriculum?')) return;
    try {
      await api.delete(`/subjects/${id}`);
      fetchSubjects();
    } catch (err) {
      alert('Delete failed.');
    }
  };

  const filteredSubjects = subjects.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="subject-manager-container">
      <div className="management-header-row">
        <div className="title-section">
          <h1>Subject Management</h1>
        </div>
        <div className="management-context-pill">
          <span className="meta">Admin</span>
          <span className="title">Academic Curriculum</span>
        </div>
        <div className="header-actions">
          <button className="action-btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} style={{ marginRight: '8px' }} />
            Initialize Subject
          </button>
          <button className="action-btn-outline" onClick={fetchSubjects}>
            Refresh Curriculum
          </button>
        </div>
      </div>

      <div className="subject-table-card">
        <div className="table-controls">
          <div className="search-box">
            <Search size={18} color="#94a3b8" />
            <input 
              type="text" 
              placeholder="Search by code or subject name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="subject-data-table-wrapper">
          <table className="subject-data-table">
            <thead>
              <tr><th>Code</th><th>Subject Title</th>{isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}</tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="3" className="loading-cell">Updating curriculum data...</td></tr>
              ) : filteredSubjects.length === 0 ? (
                <tr><td colSpan="3" className="empty-cell">No subjects found.</td></tr>
              ) : (
                filteredSubjects.map((subject) => (
                  <tr key={subject.id}>
                    <td><span className="subject-code-badge">{subject.code}</span></td>
                    <td><span className="subject-title">{subject.name}</span></td>
                    {isAdmin && (
                      <td style={{ textAlign: 'right' }}>
                        <div className="action-buttons" style={{ justifyContent: 'flex-end' }}>
                          <button className="btn-edit" onClick={() => handleEditClick(subject)}><Edit2 size={14} /></button>
                          <button className="btn-delete" onClick={() => handleDelete(subject.id)}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SUBJECT INITIALIZATION MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-pop-in">
            <div className="modal-header">
              <h2>{isEditMode ? 'Update Subject' : 'Initialize New Subject'}</h2>
              <p>{isEditMode ? 'Modify curriculum details.' : 'Define a new academic course entry.'}</p>
            </div>

            {success ? (
              <div className="success-card-inline">
                <CheckCircle size={48} color="#22c55e" />
                <h3>{isEditMode ? 'Subject Updated' : 'Subject Initialized'}</h3>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="subject-form">
                <div className="form-group">
                  <label>Subject Code</label>
                  <input 
                    type="text" 
                    placeholder="e.g. CS101" 
                    value={formData.code} 
                    onChange={e => setFormData({...formData, code: e.target.value})} 
                    required 
                  />
                </div>
                
                <div className="form-group">
                  <label>Subject Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Data Structures & Algorithms" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    required 
                  />
                </div>

                <div className="modal-actions-row">
                  <button type="button" className="btn-modal-cancel" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn-modal-submit" disabled={submitting}>
                    {submitting ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                    {submitting ? 'Processing...' : (isEditMode ? 'Update Entry' : 'Initialize Subject')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectManager;
