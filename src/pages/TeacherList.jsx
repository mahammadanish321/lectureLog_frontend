import React, { useState, useEffect } from 'react';
import api from '../api';
import { Users, Search, Trash2, Edit2, Check, X, UserPlus, Upload, Loader2, CheckCircle, ShieldCheck, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import WebcamModal from '../components/ui/WebcamModal';
import './TeacherList.css';
import './RegisterTeacher.css';

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
  { key: 'down',  label: 'Down',  required: false, tip: 'Look slightly downward' },
];


const TeacherList = () => {
  const { user, adminLogin } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const isAdmin = user?.role === 'admin';
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Secure Deletion State
  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    step: 1, // 1 = Warning, 2 = Password
    teacher: null,
    password: '',
    error: '',
    isDeleting: false
  });
  
  // Modal & Registration State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentEditId, setCurrentEditId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);
  const [files, setFiles] = useState({ front: null, left: null, right: null, down: null });
  const [previews, setPreviews] = useState({});
  const [webcamState, setWebcamState] = useState({ isOpen: false, angle: null });
  const [regData, setRegData] = useState({
    name: '', email: '', college_id: ''
  });

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/teachers');
      setTeachers(response.data);
      setError(null);
    } catch (err) {
      addToast('Could not load faculty directory. Please check your connection.', 'error');
      setError('Failed to load faculty directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleFile = (angle, file) => {
    if (!file) return;
    setFiles(f => ({ ...f, [angle]: file }));
    setPreviews(p => ({ ...p, [angle]: URL.createObjectURL(file) }));
  };

  const handleEditClick = (teacher) => {
    setRegData({
      name: teacher.name,
      email: teacher.email,
      college_id: teacher.college_id
    });
    let initPreviews = { front: teacher.image_url || `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/public/teachers/${teacher.id}.jpg` };
    if (teacher.angle_images) {
      const parsed = typeof teacher.angle_images === 'string' ? JSON.parse(teacher.angle_images) : teacher.angle_images;
      Object.keys(parsed).forEach(k => {
        if (parsed[k]?.url) initPreviews[k] = parsed[k].url;
      });
    }
    setPreviews(initPreviews);
    setCurrentEditId(teacher.id);
    setIsEditMode(true);
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setIsEditMode(false);
    setCurrentEditId(null);
    setRegData({ name: '', email: '', college_id: '' });
    setFiles({ front: null, left: null, right: null, down: null });
    setPreviews({});
    setRegSuccess(false);
  };

  const handleRegSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    const isElectron = !!(window.electronAPI?.isElectron);
    const AI_SERVICE_URL = 'http://127.0.0.1:8001';

    try {
      const selectedAngles = ANGLES.filter(a => files[a.key]);
      let embeddingsArray = null;

      // If in Electron, generate face embedding locally FIRST to avoid cloud-to-local mismatch
      if (isElectron && selectedAngles.length > 0) {
        console.log('[Electron] Generating local face embeddings for teacher...');
        try {
          embeddingsArray = [];
          for (let i = 0; i < selectedAngles.length; i++) {
            const a = selectedAngles[i];
            const fd = new FormData();
            fd.append('file', files[a.key]);
            const r = await fetch(`${AI_SERVICE_URL}/embed`, { method: 'POST', body: fd });
            const d = await r.json();
            
            if (!r.ok || d.error) {
              throw new Error(d.error || `AI Service Error (${r.status})`);
            }
            if (!d.embedding || !Array.isArray(d.embedding)) {
              throw new Error(`The AI could not extract a face signature from ${a.label} angle. Please try a clearer picture.`);
            }
            embeddingsArray.push(d.embedding);
          }
          console.log('[Electron] ✅ Local teacher embeddings generated successfully!');
        } catch (aiErr) {
          console.error('[Electron] ❌ Local AI Error:', aiErr.message);
          addToast(
            `Face Recognition Error: ${aiErr.message}. Please ensure the photos are clear and contain a single face.`, 
            'error'
          );
          setSubmitting(false);
          return;
        }
      }

      const data = new FormData();
      Object.keys(regData).forEach(key => data.append(key, regData[key]));
      
      if (embeddingsArray) data.append('face_embeddings', JSON.stringify(embeddingsArray));
      
      // CRITICAL: Append file LAST for proper Multer parsing
      if (files.front) data.append('image', files.front);
      selectedAngles.forEach(a => {
        if (a.key !== 'front') data.append('image_' + a.key, files[a.key]);
      });

      if (isEditMode) {
        await api.put(`/teachers/${currentEditId}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
        addToast('Faculty profile updated successfully!', 'success');
      } else {
        await api.post('/teachers', data, { headers: { 'Content-Type': 'multipart/form-data' } });
        addToast('New faculty member enrolled successfully!', 'success');
      }

      setRegSuccess(true);
      setTimeout(() => {
        closeModal();
        fetchTeachers();
      }, 1500);
    } catch (err) {
      console.error('[Registration Error] Full Details:', err.response?.data);
      const msg = err.response?.data?.message || 'We encountered an error while registering the teacher.';
      addToast(`${msg} ${err.response?.data?.error ? `(${err.response.data.error})` : ''}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (teacher) => {
    setDeleteModalState({
      isOpen: true,
      step: 1,
      teacher: teacher,
      password: '',
      error: '',
      isDeleting: false
    });
  };

  const closeDeleteModal = () => {
    setDeleteModalState(prev => ({ ...prev, isOpen: false }));
  };

  const confirmDelete = async () => {
    setDeleteModalState(prev => ({ ...prev, isDeleting: true, error: '' }));
    try {
      // 1. Verify Password by logging in again
      await adminLogin(user.email, deleteModalState.password);
      
      // 2. Delete Teacher
      await api.delete(`/teachers/${deleteModalState.teacher.id}`);
      fetchTeachers();
      addToast('Faculty profile deleted successfully.', 'success');
      
      // 3. Close Modal
      setDeleteModalState(prev => ({ ...prev, isOpen: false }));
    } catch (err) {
      setDeleteModalState(prev => ({ ...prev, isDeleting: false, error: 'Incorrect password or deletion failed.' }));
    }
  };

  const filteredTeachers = teachers.filter(t => {
    const searchLower = searchQuery.toLowerCase();
    return t.name.toLowerCase().includes(searchLower) || 
           (t.college_id && t.college_id.toLowerCase().includes(searchLower));
  });

  return (
    <div className="teacher-list-container">
      <div className="management-header-row">
        <div className="title-section">
          <h1>Faculty Management</h1>
        </div>
        <div className="management-context-pill">
          <span className="meta">Admin</span>
          <span className="title">Academic Staff</span>
        </div>
        <div className="header-actions">
          <button className="action-btn-primary" onClick={() => navigate('/teachers/register')}>
            <UserPlus size={16} style={{ marginRight: '8px' }} />
            Add Teacher
          </button>
          <button className="action-btn-outline" onClick={fetchTeachers}>
            Refresh List
          </button>
        </div>
      </div>

      <div className="teacher-table-card">
        <div className="table-controls">
          <div className="search-box">
            <Search size={18} color="#94a3b8" />
            <input type="text" placeholder="Search faculty by name or ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>

        <div className="teacher-data-table-wrapper">
          <table className="teacher-data-table">
            <thead>
              <tr><th>Profile</th><th>Faculty Details</th><th>Identifiers</th>{isAdmin && <th>Actions</th>}</tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" className="loading-cell">Synchronizing staff data...</td></tr>
              ) : filteredTeachers.map((teacher) => (
                <tr key={teacher.id}>
                  <td>
                    <div className="teacher-avatar-large">
                      <img src={teacher.image_url || `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/public/teachers/${teacher.id}.jpg`} alt={teacher.name} onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=' + teacher.name; }} />
                    </div>
                  </td>
                  <td>
                    <div className="info-cell"><span className="teacher-name">{teacher.name}</span><span className="teacher-email">{teacher.email}</span></div>
                  </td>
                  <td>
                    <div className="teacher-id-badge">ID: {teacher.college_id}</div>
                  </td>
                  {isAdmin && (
                    <td>
                      <div className="action-buttons">
                        <button className="btn-edit" onClick={() => handleEditClick(teacher)}><Edit2 size={14} /></button>
                        <button className="btn-delete" onClick={() => handleDeleteClick(teacher)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* TEACHER ENROLLMENT MODAL */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-pop-in">
            <div className="modal-header">
              <div className="modal-header-copy">
                <h2>Update Faculty Profile</h2>
                <p>Modify existing staff metadata.</p>
              </div>
              <button type="button" className="modal-close-btn" onClick={closeModal} aria-label="Close faculty enrollment popup">
                <X size={20} />
              </button>
            </div>

            {regSuccess ? (
              <div className="success-card-inline">
                <CheckCircle size={48} color="#22c55e" />
                <h3>Update Successful</h3>
              </div>
            ) : (
              <form onSubmit={handleRegSubmit}>
                <div className="enrollment-form-grid">
                  {/* LEFT: MULTI-ANGLE IMAGE GRID */}
                  <div className="angle-grid-section" style={{ paddingRight: '20px' }}>
                    <div className="angle-grid-label" style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
                      <Camera size={14}/>
                      <span>Face Angle Photos <span className="req" style={{ color: '#ef4444', marginLeft: '6px', fontSize: '0.7rem' }}>* Front, Left, Right required</span></span>
                    </div>
                    <div className="angle-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      {ANGLES.map(a => (
                        <div key={a.key} className="angle-card" style={{ position: 'relative' }}>
                          <label className={`angle-slot ${files[a.key] ? 'filled' : ''} ${!a.required ? 'optional' : ''}`}>
                            {!a.required && <span className="angle-badge recommended">Recommended</span>}
                            {previews[a.key] ? (
                              <div className="angle-preview-wrap">
                                <img src={previews[a.key]} alt={a.label} className="angle-preview-img"/>
                                <div className="angle-check"><CheckCircle size={20}/></div>
                              </div>
                            ) : (
                              <div className="angle-illustration">
                                <AngleIllustration angle={a.key}/>
                                <div className="angle-upload-hint"><Upload size={12}/></div>
                              </div>
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
                            <span className="angle-tip" style={{ fontSize: '0.65rem' }}>{a.tip}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* RIGHT: FIELDS */}
                  <div className="fields-column">
                    <div className="form-group">
                      <label>Full Name & Title</label>
                      <input type="text" placeholder="e.g. Dr. Sarah Connor" value={regData.name} onChange={e => setRegData({...regData, name: e.target.value})} required />
                    </div>
                    
                    <div className="form-group">
                      <label>Faculty ID (College ID)</label>
                      <input type="text" placeholder="TCH-101" value={regData.college_id} onChange={e => setRegData({...regData, college_id: e.target.value})} required />
                    </div>

                    <div className="form-group">
                      <label>Institutional Email</label>
                      <input type="email" placeholder="sarah@college.edu" value={regData.email} onChange={e => setRegData({...regData, email: e.target.value})} required />
                    </div>
                  </div>
                </div>

                <div className="modal-actions-row">
                  <button type="button" className="btn-modal-cancel" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn-modal-submit" disabled={submitting}>
                    {submitting ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                    {submitting ? 'Updating...' : 'Update Profile'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* SECURE DELETION MODAL */}
      {deleteModalState.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-pop-in secure-delete-modal" style={{ width: '500px', minWidth: 'auto', height: 'auto', padding: '2.5rem' }}>
            <div className="modal-header" style={{ borderBottom: 'none', marginBottom: '0' }}>
              <div className="modal-header-copy">
                <h2 style={{ color: '#ef4444' }}>Security Verification</h2>
              </div>
              <button type="button" className="modal-close-btn" onClick={closeDeleteModal}>
                <X size={20} />
              </button>
            </div>
            
            <div className="delete-modal-body" style={{ textAlign: 'center', marginTop: '1rem' }}>
              {deleteModalState.step === 1 ? (
                <>
                  <div className="warning-icon-wrapper" style={{ display: 'inline-flex', background: '#fef2f2', padding: '1rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
                    <Trash2 size={36} color="#ef4444" />
                  </div>
                  <h3 style={{ fontSize: '1.1rem', color: '#1e293b', marginBottom: '0.75rem' }}>Are you sure you want to delete {deleteModalState.teacher?.name}?</h3>
                  <p className="delete-warning-text" style={{ color: '#64748b', fontSize: '0.85rem', lineHeight: '1.5' }}>
                    By deleting this account, all data associated with them will also be deleted and cannot be recovered.
                  </p>
                  <div className="modal-actions-row" style={{ marginTop: '2.5rem', justifyContent: 'center', borderTop: 'none', paddingTop: 0 }}>
                    <button className="btn-modal-cancel" onClick={closeDeleteModal}>No, Cancel</button>
                    <button className="btn-modal-submit" style={{ background: '#ef4444' }} onClick={() => setDeleteModalState(prev => ({ ...prev, step: 2 }))}>Yes, Delete</button>
                  </div>
                </>
              ) : (
                <>
                  <h3 style={{ fontSize: '1.1rem', color: '#1e293b', marginBottom: '0.75rem' }}>Admin Authorization Required</h3>
                  <p className="delete-warning-text" style={{ color: '#64748b', fontSize: '0.85rem', lineHeight: '1.5' }}>
                    Please enter your admin password to confirm the permanent deletion of <strong>{deleteModalState.teacher?.name}</strong>.
                  </p>
                  
                  <div className="form-group" style={{ marginTop: '2rem', textAlign: 'left' }}>
                    <label style={{ color: '#475569' }}>Admin Password</label>
                    <input 
                      type="password" 
                      placeholder="Enter your password..." 
                      value={deleteModalState.password}
                      onChange={e => setDeleteModalState(prev => ({ ...prev, password: e.target.value, error: '' }))}
                      autoFocus
                    />
                    {deleteModalState.error && <span className="req" style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.5rem', display: 'block', fontWeight: 600 }}>{deleteModalState.error}</span>}
                  </div>

                  <div className="modal-actions-row" style={{ marginTop: '2.5rem', justifyContent: 'flex-end', borderTop: 'none', paddingTop: 0 }}>
                    <button className="btn-modal-cancel" onClick={closeDeleteModal} disabled={deleteModalState.isDeleting}>Cancel</button>
                    <button className="btn-modal-submit" style={{ background: '#ef4444' }} onClick={confirmDelete} disabled={deleteModalState.isDeleting || !deleteModalState.password}>
                      {deleteModalState.isDeleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                      {deleteModalState.isDeleting ? 'Deleting...' : 'Confirm Deletion'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <WebcamModal 
        isOpen={webcamState.isOpen} 
        onClose={() => setWebcamState({ isOpen: false, angle: null })} 
        onCapture={(blob) => handleFile(webcamState.angle?.key, blob)} 
        angleLabel={webcamState.angle?.label} 
      />
    </div>
  );
};

export default TeacherList;
