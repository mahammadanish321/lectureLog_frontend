import React, { useState, useEffect } from 'react';
import api from '../api';
import { BookOpen, Search, Trash2, Edit2, Check, X, Plus, Loader2, CheckCircle, Grid, List } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './SubjectManager.css';

const SubjectManager = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'bulk'

  // Modal & Form State (Single Add/Edit)
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentEditId, setCurrentEditId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({ code: '', name: '' });

  // Bulk Spreadsheet State
  const generateNewRow = () => ({ id: Date.now().toString() + Math.random(), code: '', name: '' });
  const [spreadsheetRows, setSpreadsheetRows] = useState([generateNewRow()]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

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

  useEffect(() => { fetchSubjects(); }, []);

  // -- Single Add / Edit Handlers --
  const handleEditClick = (subject) => {
    setFormData({ code: subject.code, name: subject.name });
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

  // -- Bulk Spreadsheet Handlers --
  const handleSpreadsheetChange = (id, field, value) => {
    setSpreadsheetRows(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const addSpreadsheetRow = () => {
    setSpreadsheetRows(prev => [...prev, generateNewRow()]);
  };

  const removeSpreadsheetRow = (id) => {
    setSpreadsheetRows(prev => prev.filter(row => row.id !== id));
  };

  const startBulkRegistration = async () => {
    const validRows = spreadsheetRows.filter(row => row.code.trim() !== '' && row.name.trim() !== '');
    if (validRows.length === 0) return alert('No valid rows found. Please ensure both Code and Name are provided for at least one row.');

    setBulkSubmitting(true);
    try {
      // Loop sequentially (could be parallel, but sequential avoids DB race conditions on unique constraints)
      for (const row of validRows) {
        await api.post('/subjects', { code: row.code, name: row.name });
      }
      setSpreadsheetRows([generateNewRow()]);
      setViewMode('list');
      fetchSubjects();
      alert(`Successfully added ${validRows.length} subject(s)!`);
    } catch (err) {
      alert('Bulk operation failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setBulkSubmitting(false);
    }
  };

  const filteredSubjects = subjects.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="subject-manager-container">
      <div className="management-header-row">
        <div className="title-section" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1>Subject Management</h1>
          <div className="management-context-pill" style={{ position: 'relative', left: 'auto', transform: 'none' }}>
            <span className="meta">Admin</span>
            <span className="title">Academic Curriculum</span>
          </div>
        </div>

        <div className="header-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {/* Mode Toggle */}
          <div className="registration-mode-toggle" style={{ margin: 0 }}>
            <button 
              className={`mode-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <List size={16}/> Directory
            </button>
            <button 
              className={`mode-btn ${viewMode === 'bulk' ? 'active' : ''}`}
              onClick={() => setViewMode('bulk')}
            >
              <Grid size={16}/> Bulk Spreadsheet
            </button>
          </div>

          <button className="action-btn-outline" onClick={fetchSubjects}>
            Refresh
          </button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="subject-table-card animate-fade-in">
          <div className="table-controls" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div className="search-box">
              <Search size={18} color="#94a3b8" />
              <input 
                type="text" 
                placeholder="Search by code or subject name..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {isAdmin && (
              <button className="action-btn-primary" onClick={() => setShowModal(true)}>
                <Plus size={16} style={{ marginRight: '8px' }} />
                Add Single Subject
              </button>
            )}
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
      ) : (
        /* Bulk Spreadsheet UI */
        <div className="spreadsheet-container animate-fade-in" style={{ margin: '1.5rem 2.5rem' }}>
          <div className="spreadsheet-header">
            <div>
              <h3>Bulk Spreadsheet Entry</h3>
              <p>Type in data rapidly like Excel. Fill out multiple subjects at once.</p>
            </div>
            <button className="start-bulk-btn" onClick={startBulkRegistration} disabled={bulkSubmitting}>
              {bulkSubmitting ? <Loader2 size={16} className="animate-spin"/> : <Check size={16}/>} 
              {bulkSubmitting ? 'Saving...' : 'Start Bulk Registration'}
            </button>
          </div>

          <div className="spreadsheet-table-wrapper" style={{ maxHeight: 'calc(100vh - 280px)' }}>
            <table className="spreadsheet-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th style={{ width: '30%' }}>Subject Code <span className="req">*</span></th>
                  <th>Subject Title <span className="req">*</span></th>
                  <th style={{ width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {spreadsheetRows.map((row, index) => {
                  const isReady = row.code && row.name;

                  return (
                    <tr key={row.id} className={isReady ? 'row-ready' : ''}>
                      <td className="row-index">{index + 1}</td>
                      <td>
                        <input type="text" value={row.code} placeholder="CS101" onChange={e => handleSpreadsheetChange(row.id, 'code', e.target.value)} />
                      </td>
                      <td>
                        <input type="text" value={row.name} placeholder="Data Structures" onChange={e => handleSpreadsheetChange(row.id, 'name', e.target.value)} />
                      </td>
                      <td>
                        <button className="spreadsheet-remove-btn" onClick={() => removeSpreadsheetRow(row.id)} title="Remove row">
                          <Trash2 size={16}/>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            
            <button className="add-row-btn" onClick={addSpreadsheetRow}>
              <Plus size={16}/> Add Blank Row
            </button>
          </div>
        </div>
      )}

      {/* SUBJECT INITIALIZATION MODAL (Single) */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-pop-in">
            <div className="modal-header">
              <h2>{isEditMode ? 'Update Subject' : 'Add Single Subject'}</h2>
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
