import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { UserPlus, Upload, Loader2, CheckCircle, Users, Trash2, ArrowLeft, Plus, X, Camera, RotateCcw, List, Grid, AlertCircle } from 'lucide-react';
import { useRegistrationQueue } from '../context/RegistrationQueueContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import WebcamModal from '../components/ui/WebcamModal';
import './RegisterStudent.css';

const AI_SERVICE_URL = 'http://127.0.0.1:8001';

// SVG cartoon illustrations for each angle
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
  { key: 'front', label: 'Front', required: true, tip: 'Look straight at the camera' },
  { key: 'left',  label: 'Left',  required: true, tip: 'Turn your head to the left' },
  { key: 'right', label: 'Right', required: true, tip: 'Turn your head to the right' },
  { key: 'down',  label: 'Down',  required: false, tip: 'Look slightly downward (recommended for CCTV)' },
];

// Modal for adding angles to existing students
const AddAnglesModal = ({ student, onClose, onDone }) => {
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
        // Generate embeddings locally in parallel
        setProgress({ step: 1, label: 'Generating embeddings locally...' });
        const failedAngles = [];
        const verifiedAngles = {};
        
        selected.forEach(a => {
          verifiedAngles[a.key] = true;
        });

        const embedTasks = selected.map(async (a) => {
          try {
            const fd = new FormData();
            fd.append('file', files[a.key]);
            const r = await fetch(`${AI_SERVICE_URL}/embed`, { method: 'POST', body: fd });
            const d = await r.json();
            if (!r.ok || d.error || d.face_detected === false || !d.embedding) {
              console.warn(`Face not detected for ${a.label}: ${d.error || 'No embedding returned'}`);
              verifiedAngles[a.key] = false;
              failedAngles.push(a.label);
              return null;
            }
            return d.embedding;
          } catch (e) {
            console.error('Embed error:', e);
            verifiedAngles[a.key] = false;
            failedAngles.push(a.label);
            return null;
          }
        });
        const embeddings = (await Promise.all(embedTasks)).filter(Boolean);
        
        if (failedAngles.length > 0) {
          alert(`⚠️ Face not detected in: ${failedAngles.join(', ')}. These specific photos will be marked as unverified.`);
        }

        setProgress({ step: 2, label: 'Saving to server...' });
        const fd = new FormData();
        selected.forEach(a => fd.append('image_' + a.key, files[a.key]));
        fd.append('face_embeddings', JSON.stringify(embeddings));
        fd.append('verified_angles', JSON.stringify(verifiedAngles));
        await api.patch(`/students/${student.id}/angles`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        // Web flow: send files directly to backend
        setProgress({ step: 1, label: 'Uploading & processing...' });
        const fd = new FormData();
        selected.forEach(a => fd.append('image_' + a.key, files[a.key]));
        await api.patch(`/students/${student.id}/angles`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
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
            <p>{student.name} — Upload additional angle photos to improve recognition</p>
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
              <div className="progress-fill" style={{ width: `${(progress.step / 3) * 100}%` }}/>
            </div>
          </div>
        )}

        <div className="angle-modal-actions">
          <button className="action-btn-outline" onClick={onClose}>Cancel</button>
          <button className="submit-btn" onClick={handleSubmit} disabled={submitting}>
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

const RegisterStudent = () => {
  const navigate = useNavigate();
  const [registrationMode, setRegistrationMode] = useState('single'); // 'single' | 'bulk'

  // Single Registration State
  const [formData, setFormData] = useState({ name: '', email: '', roll_number: '', college_id: '', year: '1', stream: 'CSE' });
  const [files, setFiles] = useState({ front: null, left: null, right: null, down: null });
  const [previews, setPreviews] = useState({});
  const [webcamState, setWebcamState] = useState({ isOpen: false, angle: null, rowId: null });

  // Bulk Spreadsheet Registration State
  const generateNewRow = () => ({ id: Date.now().toString() + Math.random(), name: '', email: '', roll_number: '', college_id: '', year: '1', stream: 'CSE', files: { front: null, left: null, right: null, down: null }, previews: {} });
  const [spreadsheetRows, setSpreadsheetRows] = useState([generateNewRow()]);
  const [bulkUploadModalRowId, setBulkUploadModalRowId] = useState(null); // the id of the row being uploaded in the modal

  const { addRegistration } = useRegistrationQueue();
  const [students, setStudents] = useState([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [filterYear, setFilterYear] = useState('all');
  const [anglesModal, setAnglesModal] = useState(null); // student object

  const fetchStudents = async () => {
    try {
      const r = await api.get('/students');
      setStudents(r.data);
    } catch (err) { console.error(err); }
    finally { setFetchLoading(false); }
  };

  useEffect(() => { fetchStudents(); }, []);

  const handleFileChange = (angle, file) => {
    if (!file) return;
    setFiles(f => ({ ...f, [angle]: file }));
    setPreviews(p => ({ ...p, [angle]: URL.createObjectURL(file) }));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this student?')) return;
    try { await api.delete(`/students/${id}`); fetchStudents(); }
    catch { alert('Delete failed'); }
  };

  // Handle Single Submission
  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    const requiredAngles = ANGLES.filter(a => a.required);
    const missingRequired = requiredAngles.filter(a => !files[a.key]);
    if (missingRequired.length > 0) {
      return alert(`Please upload: ${missingRequired.map(a => a.label).join(', ')} photo(s)`);
    }

    const selectedAngles = ANGLES.filter(a => files[a.key]);

    // Push directly to background queue
    addRegistration({
      type: 'student',
      data: { ...formData },
      files: { ...files },
      selectedAngles,
      name: formData.name
    });

    // Immediately free the form for the next student
    setFormData({ name: '', email: '', roll_number: '', college_id: '', year: '1', stream: 'CSE' });
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
      return row.name.trim() || row.email.trim() || row.roll_number.trim() || row.college_id.trim() || row.files.front || row.files.left || row.files.right || row.files.down;
    });

    if (activeRows.length === 0) {
      return alert('No data entered. Please fill out at least one row.');
    }

    activeRows.forEach((row, index) => {
      const missing = [];
      if (!row.name.trim()) missing.push('Full Name');
      if (!row.roll_number.trim()) missing.push('Roll Number');
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
        type: 'student',
        data: { name: row.name, email: row.email, roll_number: row.roll_number, college_id: row.college_id, year: row.year, stream: row.stream },
        files: row.files,
        selectedAngles,
        name: row.name
      });
    });

    setSpreadsheetRows([generateNewRow()]);
    alert(`Enqueued ${activeRows.length} student(s) for bulk processing! Check the queue panel.`);
    setRegistrationMode('single');
  };

  const handleMainWebcamCapture = (blob) => {
    if (webcamState.rowId) {
      handleBulkUploadPhoto(webcamState.angle.key, blob, webcamState.rowId);
    } else {
      handleFileChange(webcamState.angle.key, blob);
    }
  };

  const filteredStudents = filterYear === 'all' ? students : students.filter(s => s.year?.toString() === filterYear);
  const activeUploadRow = spreadsheetRows.find(r => r.id === bulkUploadModalRowId);

  return (
    <div className="register-container">
      <div className="management-header-row">
        <div className="title-section"><h1>Identity Registration</h1></div>
        <div className="management-context-pill">
          <span className="meta">Admin</span>
          <span className="title">Identity Console</span>
        </div>

        <div className="header-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {/* Mode Toggle */}
          <div className="registration-mode-toggle" style={{ margin: 0 }}>
            <button 
              className={`mode-btn ${registrationMode === 'single' ? 'active' : ''}`}
              onClick={() => setRegistrationMode('single')}
            >
              <UserPlus size={16}/> Single
            </button>
            <button 
              className={`mode-btn ${registrationMode === 'bulk' ? 'active' : ''}`}
              onClick={() => setRegistrationMode('bulk')}
            >
              <Grid size={16}/> Bulk Spreadsheet
            </button>
          </div>

          <button className="action-btn-outline" onClick={() => navigate('/students')}>
            <ArrowLeft size={16} style={{ marginRight: '8px' }}/>Back to Directory
          </button>
        </div>
      </div>

      {registrationMode === 'single' ? (
        <div className="register-grid">
          <div className="register-content animate-fade-in">
            <h3>Student Registration</h3>
            <p>Upload photos from multiple angles to maximize AI recognition accuracy in the classroom.</p>

            <form onSubmit={handleSingleSubmit} className="register-form">
              {/* Angle photo grid */}
              <div className="angle-grid-section">
                <div className="angle-grid-label">
                  <Camera size={14}/>
                  <span>Face Angle Photos <span className="soft-req">Front, Left, Right required</span></span>
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
                        <input type="file" accept="image/*" hidden onChange={e => handleFileChange(a.key, e.target.files[0])}/>
                      </label>
                      <button 
                        type="button" 
                        className="webcam-trigger-btn" 
                        onClick={(e) => { 
                          e.preventDefault(); 
                          e.stopPropagation(); 
                          setWebcamState({ isOpen: true, angle: a, rowId: null }); 
                        }}
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

              {/* Info fields */}
              <div className="info-section">
                <div className="form-group">
                  <label>Full Legal Name</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Mahammad Anish" required/>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Academic Year</label>
                    <select value={formData.year} onChange={e => setFormData({ ...formData, year: e.target.value })}>
                      <option value="1">1st Year</option><option value="2">2nd Year</option>
                      <option value="3">3rd Year</option><option value="4">4th Year</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Stream</label>
                    <select value={formData.stream} onChange={e => setFormData({ ...formData, stream: e.target.value })}>
                      <option value="CSE">CSE</option><option value="CSBS">CSBS</option>
                      <option value="ECE">ECE</option><option value="ME">ME</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>College ID</label>
                    <input type="text" value={formData.college_id} onChange={e => setFormData({ ...formData, college_id: e.target.value })} placeholder="gmit-30" required/>
                  </div>
                  <div className="form-group">
                    <label>Roll Number</label>
                    <input type="text" value={formData.roll_number} onChange={e => setFormData({ ...formData, roll_number: e.target.value })} placeholder="30" required/>
                  </div>
                </div>
                <div className="form-group">
                  <label>Institutional Email</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="anish@college.edu" required/>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="submit-btn">
                  <UserPlus size={18}/>
                  <span>Register Student</span>
                </button>
              </div>
            </form>
          </div>

          {/* Student roster panel */}
          <div className="student-list-panel card">
            <div className="card-header">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <h3>Identity Roster</h3>
                <Users size={18} color="#94a3b8"/>
              </div>
              <select 
                value={filterYear} 
                onChange={e => setFilterYear(e.target.value)}
                className="roster-filter-select"
              >
                <option value="all">All Academic Years</option>
                <option value="1">Year 1</option><option value="2">Year 2</option>
                <option value="3">Year 3</option><option value="4">Year 4</option>
              </select>
            </div>

            <div className="roster-list-container">
              {fetchLoading ? (
                <div className="roster-loading">
                  <Loader2 className="animate-spin" size={24} color="var(--primary)"/>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="roster-empty-state animate-fade-in">
                  <Users size={32} color="#cbd5e1" />
                  <p>No students found for this year.</p>
                </div>
              ) : filteredStudents.map(student => (
                <div key={student.id} className="student-item-mini animate-fade-in">
                  <div className="mini-image">
                    <img src={student.image_url || `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/public/students/${student.student_id || student.id}.jpg`}
                      alt={student.name} onError={e => { e.target.src = 'https://ui-avatars.com/api/?name=' + student.name; }}/>
                  </div>
                  <div className="mini-details">
                    <p className="name">{student.name}</p>
                    <p className="sub">#{student.roll_number} • {student.stream} • Year {student.year}</p>
                    <span className="angle-count-badge">
                      <Camera size={10}/> {student.angle_count || 1} angle{student.angle_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="mini-actions">
                    <button className="btn-add-angle" title="Add more face angles" onClick={() => setAnglesModal(student)}>
                      <Plus size={12}/> Angles
                    </button>
                    <button className="btn-delete-mini" onClick={() => handleDelete(student.id)}><Trash2 size={14}/></button>
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
            <button className="start-bulk-btn" onClick={startBulkRegistration}>
              <Upload size={16}/> Start Bulk Registration
            </button>
          </div>

          <div className="spreadsheet-table-wrapper">
            <table className="spreadsheet-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th>Full Name <span className="req">*</span></th>
                  <th>Roll <span className="req">*</span></th>
                  <th>College ID <span className="req">*</span></th>
                  <th>Email <span className="req">*</span></th>
                  <th style={{ width: '120px' }}>Year</th>
                  <th style={{ width: '120px' }}>Stream</th>
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
                        <input type="text" value={row.roll_number} placeholder="Roll" onChange={e => handleSpreadsheetChange(row.id, 'roll_number', e.target.value)} />
                      </td>
                      <td>
                        <input type="text" value={row.college_id} placeholder="ID" onChange={e => handleSpreadsheetChange(row.id, 'college_id', e.target.value)} />
                      </td>
                      <td>
                        <input type="email" value={row.email} placeholder="Email" onChange={e => handleSpreadsheetChange(row.id, 'email', e.target.value)} />
                      </td>
                      <td>
                        <select value={row.year} onChange={e => handleSpreadsheetChange(row.id, 'year', e.target.value)}>
                          <option value="1">1st Year</option><option value="2">2nd Year</option>
                          <option value="3">3rd Year</option><option value="4">4th Year</option>
                        </select>
                      </td>
                      <td>
                        <select value={row.stream} onChange={e => handleSpreadsheetChange(row.id, 'stream', e.target.value)}>
                          <option value="CSE">CSE</option><option value="CSBS">CSBS</option>
                          <option value="ECE">ECE</option><option value="ME">ME</option>
                        </select>
                      </td>
                      <td>
                        <button 
                          className={`spreadsheet-upload-btn ${uploadedCount >= 3 ? 'ready' : ''}`}
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
            
            <button className="add-row-btn" onClick={addSpreadsheetRow}>
              <Plus size={16}/> Add Blank Row
            </button>
          </div>
        </div>
      )}

      {anglesModal && (
        <AddAnglesModal student={anglesModal} onClose={() => setAnglesModal(null)} onDone={fetchStudents}/>
      )}

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
                  <label className={`angle-slot ${activeUploadRow.files[a.key] ? 'filled' : ''} ${!a.required ? 'optional' : ''}`}>
                    {!a.required && <span className="angle-badge recommended">Recommended</span>}
                    {activeUploadRow.previews[a.key] ? (
                      <>
                        <img src={activeUploadRow.previews[a.key]} alt={a.label} className="angle-preview-img"/>
                        <div className="angle-check"><CheckCircle size={20}/></div>
                      </>
                    ) : (
                      <>
                        <AngleIllustration angle={a.key}/>
                        <div className="angle-upload-hint"><Upload size={14}/></div>
                      </>
                    )}
                    <input type="file" accept="image/*" hidden onChange={e => handleBulkUploadPhoto(a.key, e.target.files[0], activeUploadRow.id)}/>
                  </label>
                  <button 
                    type="button" 
                    className="webcam-trigger-btn" 
                    onClick={(e) => { 
                      e.preventDefault(); 
                      e.stopPropagation(); 
                      setWebcamState({ isOpen: true, angle: a, rowId: activeUploadRow.id }); 
                    }}
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
              <button className="submit-btn" onClick={() => setBulkUploadModalRowId(null)}>
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
              Please provide the missing data for the following students to start bulk registration:
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

export default RegisterStudent;
