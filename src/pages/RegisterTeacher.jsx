import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { UserPlus, Upload, Loader2, CheckCircle, Users, Trash2, ArrowLeft, Plus, X, Camera, RotateCcw, List, Grid, AlertCircle } from 'lucide-react';
import { useRegistrationQueue } from '../context/RegistrationQueueContext';
import { useNavigate } from 'react-router-dom';
import WebcamModal from '../components/ui/WebcamModal';
import './RegisterTeacher.css';

const AI_SERVICE_URL = 'http://127.0.0.1:8001';

// Reusable SVG cartoon illustration for each angle
const AngleIllustration = ({ angle }) => {
  const images = {
    front: '/front-profile.png',
    left: '/left-profile.png',
    right: '/right-profile.png',
    down: '/front-up-profile.png',
  };
  return (
    <img 
      src={images[angle]} 
      alt={`${angle} angle illustration`} 
      className="angle-illustration-img" 
    />
  );
};

const ANGLES = [
  { key: 'front', label: 'Front', required: true,  tip: 'Look straight at the camera' },
  { key: 'left',  label: 'Left',  required: true,  tip: 'Turn your head to the left' },
  { key: 'right', label: 'Right', required: true,  tip: 'Turn your head to the right' },
  { key: 'down',  label: 'Down',  required: false, tip: 'Look slightly downward (recommended)' },
];

// Modal for adding angles to existing teachers
const AddAnglesModal = ({ teacher, onClose, onDone }) => {
  const [files, setFiles] = useState({ front: null, left: null, right: null, down: null });
  const [previews, setPreviews] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState({ step: 0, label: '' });
  const [webcamState, setWebcamState] = useState({ isOpen: false, angle: null });
  const isElectron = !!(window.electronAPI?.isElectron);

  const handleFile = (angle, file) => {
    if (!file) return;
    setFiles(f => ({ ...f, [angle]: file }));
    setPreviews(p => ({ ...p, [angle]: URL.createObjectURL(file) }));
  };

  const handleSubmit = async () => {
    const selected = ANGLES.filter(a => files[a.key]);
    if (selected.length === 0) return alert('Please upload at least one angle photo.');
    setSubmitting(true);
    try {
      if (isElectron) {
        setProgress({ step: 1, label: 'Generating embeddings locally...' });
        const embedTasks = selected.map(async a => {
          const fd = new FormData();
          fd.append('file', files[a.key]);
          const r = await fetch(`${AI_SERVICE_URL}/embed`, { method: 'POST', body: fd });
          const d = await r.json();
          return d.embedding;
        });
        const embeddings = (await Promise.all(embedTasks)).filter(Boolean);
        setProgress({ step: 2, label: 'Saving to server...' });
        const fd = new FormData();
        selected.forEach(a => fd.append('image_' + a.key, files[a.key]));
        fd.append('face_embeddings', JSON.stringify(embeddings));
        await api.patch(`/teachers/${teacher.id}/angles`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        setProgress({ step: 1, label: 'Uploading & processing...' });
        const fd = new FormData();
        selected.forEach(a => fd.append('image_' + a.key, files[a.key]));
        await api.patch(`/teachers/${teacher.id}/angles`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setProgress({ step: 3, label: 'Done!' });
      setTimeout(() => { onDone(); onClose(); }, 1000);
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.message || err.message));
      setSubmitting(false);
    }
  };

  return (
    <div className="angle-modal-overlay" onClick={onClose}>
      <div className="angle-modal" onClick={e => e.stopPropagation()}>
        <div className="angle-modal-header">
          <div>
            <h3>Add Face Angles</h3>
            <p>{teacher.name} — Add more angles to improve recognition accuracy</p>
          </div>
          <button className="modal-close-btn" onClick={onClose}><X size={18}/></button>
        </div>
        <div className="angle-grid">
          {ANGLES.map(a => (
            <div key={a.key} className="angle-card">
              <label className={`angle-slot ${files[a.key] ? 'filled' : ''} ${!a.required ? 'optional' : ''}`}>
                {!a.required && <span className="angle-badge recommended">Recommended</span>}
                {previews[a.key] ? (
                  <>
                    <img src={previews[a.key]} alt={a.label} className="angle-preview-img"/>
                    <div className="angle-check"><CheckCircle size={20}/></div>
                  </>
                ) : (
                  <>
                    <AngleIllustration angle={a.key}/>
                    <div className="angle-upload-hint"><Upload size={14}/></div>
                  </>
                )}
                <input type="file" accept="image/*" hidden onChange={e => handleFile(a.key, e.target.files[0])}/>
              </label>
              <button 
                type="button" 
                className="webcam-trigger-btn" 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setWebcamState({ isOpen: true, angle: a }); }}
                title="Take Photo"
              >
                <Camera size={16} />
              </button>
              <div className="angle-info">
                <span className="angle-label">{a.label}{a.required && <span className="req">*</span>}</span>
                <span className="angle-tip">{a.tip}</span>
              </div>
            </div>
          ))}
        </div>
        {submitting && (
          <div className="progress-bar-wrapper">
            <div className="progress-label">{progress.label}</div>
            <div className="progress-track">
              <div className="progress-fill indigo" style={{ width: `${(progress.step / 3) * 100}%` }}/>
            </div>
          </div>
        )}
        <div className="angle-modal-actions">
          <button className="action-btn-outline" onClick={onClose}>Cancel</button>
          <button className="submit-btn teacher-btn" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="animate-spin" size={16}/> : <Camera size={16}/>}
            <span>{submitting ? 'Processing...' : 'Save Angles'}</span>
          </button>
        </div>
      </div>
      <WebcamModal 
        isOpen={webcamState.isOpen} 
        onClose={() => setWebcamState({ isOpen: false, angle: null })} 
        onCapture={(blob) => handleFile(webcamState.angle.key, blob)} 
        angleLabel={webcamState.angle?.label} 
      />
    </div>
  );
};

const RegisterTeacher = () => {
  const navigate = useNavigate();
  const [registrationMode, setRegistrationMode] = useState('single'); // 'single' | 'bulk'

  // Single Registration State
  const [formData, setFormData] = useState({ name: '', email: '', college_id: '' });
  const [files, setFiles] = useState({ front: null, left: null, right: null, down: null });
  const [previews, setPreviews] = useState({});
  const [webcamState, setWebcamState] = useState({ isOpen: false, angle: null, rowId: null });

  // Bulk Spreadsheet Registration State
  const generateNewRow = () => ({ id: Date.now().toString() + Math.random(), name: '', email: '', college_id: '', files: { front: null, left: null, right: null, down: null }, previews: {} });
  const [spreadsheetRows, setSpreadsheetRows] = useState([generateNewRow()]);
  const [bulkUploadModalRowId, setBulkUploadModalRowId] = useState(null);

  const { addRegistration } = useRegistrationQueue();
  const [teachers, setTeachers] = useState([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [anglesModal, setAnglesModal] = useState(null);

  const fetchTeachers = async () => {
    try { const r = await api.get('/teachers'); setTeachers(r.data); }
    catch (err) { console.error(err); }
    finally { setFetchLoading(false); }
  };

  useEffect(() => { fetchTeachers(); }, []);

  const handleFileChange = (angle, file) => {
    if (!file) return;
    setFiles(f => ({ ...f, [angle]: file }));
    setPreviews(p => ({ ...p, [angle]: URL.createObjectURL(file) }));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this teacher?')) return;
    try { await api.delete(`/teachers/${id}`); fetchTeachers(); }
    catch { alert('Delete failed'); }
  };

  // Handle Single Submission
  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    const missingRequired = ANGLES.filter(a => a.required && !files[a.key]);
    if (missingRequired.length > 0) return alert(`Please upload: ${missingRequired.map(a => a.label).join(', ')} photo(s)`);

    const selectedAngles = ANGLES.filter(a => files[a.key]);

    // Push to background queue
    addRegistration({
      type: 'teacher',
      data: { ...formData },
      files: { ...files },
      selectedAngles,
      name: formData.name
    });

    // Immediately free the form for the next teacher
    setFormData({ name: '', email: '', college_id: '' });
    setFiles({ front: null, left: null, right: null, down: null });
    setPreviews({});
  };

  // Handle Bulk Spreadsheet Actions
  const handleSpreadsheetChange = (id, field, value) => {
    setSpreadsheetRows(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const addSpreadsheetRow = () => {
    setSpreadsheetRows(prev => [...prev, generateNewRow()]);
  };

  const removeSpreadsheetRow = (id) => {
    setSpreadsheetRows(prev => prev.filter(row => row.id !== id));
  };

  const handleBulkUploadPhoto = (angle, file, rowId) => {
    if (!file) return;
    setSpreadsheetRows(prev => prev.map(row => {
      if (row.id === rowId) {
        return {
          ...row,
          files: { ...row.files, [angle]: file },
          previews: { ...row.previews, [angle]: URL.createObjectURL(file) }
        };
      }
      return row;
    }));
  };

  const [bulkValidationErrors, setBulkValidationErrors] = useState(null);

  const startBulkRegistration = () => {
    const errors = [];
    
    // Check if the spreadsheet is completely empty
    const activeRows = spreadsheetRows.filter(row => {
      return row.name.trim() || row.email.trim() || row.college_id.trim() || row.files.front || row.files.left || row.files.right || row.files.down;
    });

    if (activeRows.length === 0) {
      return alert('No data entered. Please fill out at least one row.');
    }

    activeRows.forEach((row, index) => {
      const missing = [];
      if (!row.name.trim()) missing.push('Full Name');
      if (!row.college_id.trim()) missing.push('College ID');
      if (!row.email.trim()) missing.push('Email');
      
      const requiredAngles = ANGLES.filter(a => a.required);
      requiredAngles.forEach(a => {
        if (!row.files[a.key]) missing.push(`${a.label} Photo`);
      });

      if (missing.length > 0) {
        errors.push({
          rowIdentifier: row.name.trim() || `Row ${spreadsheetRows.indexOf(row) + 1}`,
          missing
        });
      }
    });

    if (errors.length > 0) {
      setBulkValidationErrors(errors);
      return;
    }

    activeRows.forEach(row => {
      const selectedAngles = ANGLES.filter(a => row.files[a.key]);
      addRegistration({
        type: 'teacher',
        data: { name: row.name, email: row.email, college_id: row.college_id },
        files: row.files,
        selectedAngles,
        name: row.name
      });
    });

    setSpreadsheetRows([generateNewRow()]);
    alert(`Enqueued ${activeRows.length} teacher(s) for bulk processing! Check the queue panel.`);
    setRegistrationMode('single');
  };

  const handleMainWebcamCapture = (blob) => {
    if (webcamState.rowId) {
      handleBulkUploadPhoto(webcamState.angle.key, blob, webcamState.rowId);
    } else {
      handleFileChange(webcamState.angle.key, blob);
    }
  };

  const activeUploadRow = spreadsheetRows.find(r => r.id === bulkUploadModalRowId);

  return (
    <div className="register-container">
      <div className="management-header-row">
        <div className="title-section"><h1>Faculty Registration</h1></div>
        <div className="management-context-pill">
          <span className="meta" style={{ color: '#6366f1' }}>Admin</span>
          <span className="title">Academic Staff</span>
        </div>

        <div className="header-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {/* Mode Toggle */}
          <div className="registration-mode-toggle" style={{ margin: 0 }}>
            <button 
              className={`mode-btn ${registrationMode === 'single' ? 'active indigo-active' : ''}`}
              onClick={() => setRegistrationMode('single')}
            >
              <UserPlus size={16}/> Single
            </button>
            <button 
              className={`mode-btn ${registrationMode === 'bulk' ? 'active indigo-active' : ''}`}
              onClick={() => setRegistrationMode('bulk')}
            >
              <Grid size={16}/> Bulk Spreadsheet
            </button>
          </div>

          <button className="action-btn-outline" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={16} style={{ marginRight:'8px' }}/>Back to Dashboard
          </button>
        </div>
      </div>

      {registrationMode === 'single' ? (
        <div className="register-grid">
          <div className="register-content animate-fade-in">
            <h3>Teacher Registration</h3>
            <p>Register a new faculty member with multi-angle photos for robust AI recognition.</p>

            <form onSubmit={handleSingleSubmit} className="register-form">
              <div className="angle-grid-section">
                <div className="angle-grid-label" style={{ color:'#6366f1' }}>
                  <Camera size={14}/>
                  <span>Face Angle Photos <span className="soft-req">Front, Left, Right required</span></span>
                </div>
                <div className="angle-grid">
                  {ANGLES.map(a => (
                    <div key={a.key} className="angle-card">
                      <label className={`angle-slot teacher-slot ${files[a.key] ? 'filled' : ''} ${!a.required ? 'optional' : ''}`}>
                        {!a.required && <span className="angle-badge recommended">Recommended</span>}
                        {previews[a.key] ? (
                          <>
                            <img src={previews[a.key]} alt={a.label} className="angle-preview-img"/>
                            <div className="angle-check teacher-check"><CheckCircle size={20}/></div>
                          </>
                        ) : (
                          <>
                            <AngleIllustration angle={a.key}/>
                            <div className="angle-upload-hint teacher-hint"><Upload size={14}/></div>
                          </>
                        )}
                        <input type="file" accept="image/*" hidden onChange={e => handleFileChange(a.key, e.target.files[0])}/>
                      </label>
                      <button 
                        type="button" 
                        className="webcam-trigger-btn" 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setWebcamState({ isOpen: true, angle: a, rowId: null }); }}
                        title="Take Photo"
                      >
                        <Camera size={16} />
                      </button>
                      <div className="angle-info">
                        <span className="angle-label">{a.label}{a.required && <span className="req">*</span>}</span>
                        <span className="angle-tip">{a.tip}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="info-section">
                <div className="form-group">
                  <label>Full Name & Title</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Dr. Sarah Connor" required/>
                </div>
                <div className="form-group">
                  <label>Institutional Email</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="sarah@college.edu" required/>
                </div>
                <div className="form-group">
                  <label>Faculty ID (Default Password)</label>
                  <input type="text" value={formData.college_id} onChange={e => setFormData({ ...formData, college_id: e.target.value })} placeholder="TCH-101" required/>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="submit-btn teacher-btn">
                  <UserPlus size={18}/>
                  <span>Register Faculty</span>
                </button>
              </div>
            </form>
          </div>

          <div className="student-list-panel card">
            <div className="card-header">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <h3>Faculty Roster</h3>
                <Users size={18} color="#94a3b8"/>
              </div>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'0 1.5rem 1.5rem' }}>
              {fetchLoading ? (
                <div style={{ display:'flex', justifyContent:'center', padding:'2rem' }}>
                  <Loader2 className="animate-spin" size={24} color="#6366f1"/>
                </div>
              ) : teachers.map(teacher => (
                <div key={teacher.id} className="student-item-mini">
                  <div className="mini-image">
                    <img src={teacher.image_url || `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/public/teachers/${teacher.teacher_id || teacher.id}.jpg`}
                      alt={teacher.name} onError={e => { e.target.src = 'https://ui-avatars.com/api/?name=' + teacher.name; }}/>
                  </div>
                  <div className="mini-details">
                    <p className="name">{teacher.name}</p>
                    <p className="sub">#{teacher.teacher_id}</p>
                    <span className="angle-count-badge teacher-badge">
                      <Camera size={10}/> {teacher.angle_count || 1} angle{teacher.angle_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="mini-actions">
                    <button className="btn-add-angle teacher-add" onClick={() => setAnglesModal(teacher)}>
                      <Plus size={12}/> Angles
                    </button>
                    <button className="btn-delete-mini" onClick={() => handleDelete(teacher.id)}><Trash2 size={14}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Bulk Spreadsheet UI */
        <div className="spreadsheet-container animate-fade-in">
          <div className="spreadsheet-header">
            <div>
              <h3>Bulk Spreadsheet Entry</h3>
              <p>Type in data rapidly like Excel. Click "Upload" on each row to add their angle photos.</p>
            </div>
            <button className="start-bulk-btn teacher-btn" onClick={startBulkRegistration}>
              <Upload size={16}/> Start Bulk Registration
            </button>
          </div>

          <div className="spreadsheet-table-wrapper">
            <table className="spreadsheet-table teacher-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th>Full Name <span className="req">*</span></th>
                  <th>Faculty ID <span className="req">*</span></th>
                  <th>Email <span className="req">*</span></th>
                  <th style={{ width: '150px' }}>Face Angles <span className="req">*</span></th>
                  <th style={{ width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {spreadsheetRows.map((row, index) => {
                  const uploadedCount = Object.values(row.files).filter(Boolean).length;
                  const isReady = row.name && row.files.front && row.files.left && row.files.right;

                  return (
                    <tr key={row.id} className={isReady ? 'row-ready' : ''}>
                      <td className="row-index">{index + 1}</td>
                      <td>
                        <input type="text" value={row.name} placeholder="Name" onChange={e => handleSpreadsheetChange(row.id, 'name', e.target.value)} />
                      </td>
                      <td>
                        <input type="text" value={row.college_id} placeholder="ID" onChange={e => handleSpreadsheetChange(row.id, 'college_id', e.target.value)} />
                      </td>
                      <td>
                        <input type="email" value={row.email} placeholder="Email" onChange={e => handleSpreadsheetChange(row.id, 'email', e.target.value)} />
                      </td>
                      <td>
                        <button 
                          className={`spreadsheet-upload-btn ${uploadedCount >= 3 ? 'ready teacher-ready' : ''}`}
                          onClick={() => setBulkUploadModalRowId(row.id)}
                        >
                          <Camera size={14}/> {uploadedCount}/4 Uploaded
                        </button>
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
            
            <button className="add-row-btn teacher-add-row" onClick={addSpreadsheetRow}>
              <Plus size={16}/> Add Blank Row
            </button>
          </div>
        </div>
      )}

      {anglesModal && <AddAnglesModal teacher={anglesModal} onClose={() => setAnglesModal(null)} onDone={fetchTeachers}/>}

      {/* Row-specific photo upload modal for Bulk mode */}
      {bulkUploadModalRowId && activeUploadRow && (
        <div className="angle-modal-overlay" onClick={() => setBulkUploadModalRowId(null)}>
          <div className="angle-modal" onClick={e => e.stopPropagation()}>
            <div className="angle-modal-header">
              <div>
                <h3>Row Photos</h3>
                <p>Upload photos for <strong>{activeUploadRow.name || `Row ${spreadsheetRows.findIndex(r => r.id === bulkUploadModalRowId) + 1}`}</strong></p>
              </div>
              <button className="modal-close-btn" onClick={() => setBulkUploadModalRowId(null)}><X size={18}/></button>
            </div>

            <div className="angle-grid">
              {ANGLES.map(a => (
                <div key={a.key} className="angle-card">
                  <label className={`angle-slot teacher-slot ${activeUploadRow.files[a.key] ? 'filled' : ''} ${!a.required ? 'optional' : ''}`}>
                    {!a.required && <span className="angle-badge recommended">Recommended</span>}
                    {activeUploadRow.previews[a.key] ? (
                      <>
                        <img src={activeUploadRow.previews[a.key]} alt={a.label} className="angle-preview-img"/>
                        <div className="angle-check teacher-check"><CheckCircle size={20}/></div>
                      </>
                    ) : (
                      <>
                        <AngleIllustration angle={a.key}/>
                        <div className="angle-upload-hint teacher-hint"><Upload size={14}/></div>
                      </>
                    )}
                    <input type="file" accept="image/*" hidden onChange={e => handleBulkUploadPhoto(a.key, e.target.files[0], activeUploadRow.id)}/>
                  </label>
                  <button 
                    type="button" 
                    className="webcam-trigger-btn" 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setWebcamState({ isOpen: true, angle: a, rowId: activeUploadRow.id }); }}
                    title="Take Photo"
                  >
                    <Camera size={16} />
                  </button>
                  <div className="angle-info">
                    <span className="angle-label">{a.label}{a.required && <span className="req">*</span>}</span>
                    <span className="angle-tip">{a.tip}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="angle-modal-actions">
              <button className="submit-btn teacher-btn" onClick={() => setBulkUploadModalRowId(null)}>
                <CheckCircle size={16}/> <span>Done</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkValidationErrors && (
        <div className="queue-modal-overlay">
          <div className="queue-modal animate-fade-in-up" style={{ width: '500px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={20} /> Missing Information
              </h3>
              <button type="button" onClick={() => setBulkValidationErrors(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>
            
            <p style={{ margin: '0 0 16px 0', color: '#475569', fontSize: '14px' }}>
              Please provide the missing data for the following teachers to start bulk registration:
            </p>

            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '8px', marginBottom: '16px' }}>
              {bulkValidationErrors.map((err, i) => (
                <div key={i} style={{ padding: '12px', background: '#fef2f2', borderRadius: '8px', marginBottom: '8px', borderLeft: '4px solid #ef4444' }}>
                  <div style={{ fontWeight: '600', color: '#1e293b', marginBottom: '4px', fontSize: '14px' }}>{err.rowIdentifier}</div>
                  <div style={{ fontSize: '13px', color: '#dc2626' }}>
                    Missing: {err.missing.join(', ')}
                  </div>
                </div>
              ))}
            </div>

            <div className="queue-modal-actions" style={{ marginTop: 'auto', justifyContent: 'flex-end', display: 'flex' }}>
              <button type="button" className="action-btn" onClick={() => setBulkValidationErrors(null)} style={{ backgroundColor: '#ef4444', color: 'white', padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
                Okay, I'll fix it
              </button>
            </div>
          </div>
        </div>
      )}

      <WebcamModal 
        isOpen={webcamState.isOpen} 
        onClose={() => setWebcamState({ isOpen: false, angle: null, rowId: null })} 
        onCapture={handleMainWebcamCapture} 
        angleLabel={webcamState.angle?.label} 
      />
    </div>
  );
};

export default RegisterTeacher;
