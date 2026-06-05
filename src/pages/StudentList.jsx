import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { Search, Trash2, Edit2, Check, X, UserPlus, Upload, Loader2, CheckCircle, Camera, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import WebcamModal from '../components/ui/WebcamModal';
import './StudentList.css';
import './RegisterStudent.css';

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


const StudentList = () => {
  const { user, adminLogin } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterYear, setFilterYear] = useState('all');
  const [filterStream, setFilterStream] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Secure Deletion State
  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    step: 1, // 1 = Warning, 2 = Password
    student: null,
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
    name: '', email: '', roll_number: '', college_id: '', year: '1', stream: 'CSE'
  });

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/students');
      setStudents(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load student directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleFile = (angle, file) => {
    if (!file) return;
    setFiles(f => ({ ...f, [angle]: file }));
    setPreviews(p => ({ ...p, [angle]: URL.createObjectURL(file) }));
  };

  const handleEditClick = (student) => {
    setRegData({
      name: student.name,
      email: student.email,
      roll_number: student.roll_number,
      college_id: student.college_id,
      year: student.year?.toString() || '1',
      stream: student.stream || 'CSE'
    });
    let initPreviews = { front: student.image_url || `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/public/students/${student.id}.jpg` };
    if (student.angle_images) {
      const parsed = typeof student.angle_images === 'string' ? JSON.parse(student.angle_images) : student.angle_images;
      Object.keys(parsed).forEach(k => {
        if (parsed[k]?.url) initPreviews[k] = parsed[k].url;
      });
    }
    setPreviews(initPreviews);
    setCurrentEditId(student.id);
    setIsEditMode(true);
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setIsEditMode(false);
    setCurrentEditId(null);
    setRegData({ name: '', email: '', roll_number: '', college_id: '', year: '1', stream: 'CSE' });
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
      let verifiedAngles = {};

      if (isElectron && selectedAngles.length > 0) {
        console.log('[Electron] Generating local face embeddings...');
        try {
          embeddingsArray = [];
          const failedAngles = [];
          
          selectedAngles.forEach(a => {
            verifiedAngles[a.key] = true;
          });

          for (let i = 0; i < selectedAngles.length; i++) {
            const a = selectedAngles[i];
            const fd = new FormData();
            fd.append('file', files[a.key]);
            const r = await fetch(`${AI_SERVICE_URL}/embed`, { method: 'POST', body: fd });
            const d = await r.json();
            
            if (!r.ok || d.error || d.face_detected === false || !d.embedding) {
              console.warn(`Face not detected for ${a.label}: ${d.error || 'No embedding returned'}`);
              embeddingsArray.push(null); // Soft-fail: record null for this angle
              failedAngles.push(a.label);
              verifiedAngles[a.key] = false;
              continue;
            }
            embeddingsArray.push(d.embedding);
          }
          
          // Filter out nulls for the backend
          embeddingsArray = embeddingsArray.filter(e => e !== null);
          if (embeddingsArray.length === 0) {
            embeddingsArray = null; // No valid embeddings
          }
          
          if (failedAngles.length > 0) {
            alert(`⚠️ Face not detected in: ${failedAngles.join(', ')}. Profile will be marked as Incomplete.`);
          }
          
          console.log('[Electron] ✅ Local embeddings generated successfully!');
        } catch (aiErr) {
          console.error('[Electron] ❌ Local AI Error:', aiErr.message);
          alert('⚠️ The AI face recognition service error. Please try again.');
          setSubmitting(false);
          return;
        }
      }

      const data = new FormData();
      Object.keys(regData).forEach(key => data.append(key, regData[key]));
      
      if (files.front) data.append('image', files.front);
      selectedAngles.forEach(a => {
        if (a.key !== 'front') data.append('image_' + a.key, files[a.key]);
      });
      
      if (embeddingsArray) {
        data.append('face_embeddings', JSON.stringify(embeddingsArray));
      }
      
      data.append('verified_angles', JSON.stringify(verifiedAngles));

      if (isEditMode) {
        await api.put(`/students/${currentEditId}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post('/students', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      
      setRegSuccess(true);
      setTimeout(() => {
        closeModal();
        fetchStudents();
      }, 1500);
    } catch (err) {
      alert('Operation Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (student) => {
    setDeleteModalState({
      isOpen: true,
      step: 1,
      student: student,
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
      
      // 2. Delete Student
      await api.delete(`/students/${deleteModalState.student.id}`);
      fetchStudents();
      
      // 3. Close Modal
      setDeleteModalState(prev => ({ ...prev, isOpen: false }));
    } catch (err) {
      setDeleteModalState(prev => ({ ...prev, isDeleting: false, error: 'Incorrect password or deletion failed.' }));
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesYear = filterYear === 'all' || student.year?.toString() === filterYear;
    const matchesStream = filterStream === 'all' || student.stream === filterStream;
    const searchLower = searchQuery.toLowerCase();
    return matchesYear && matchesStream && (
      student.name.toLowerCase().includes(searchLower) || 
      (student.roll_number && student.roll_number.toLowerCase().includes(searchLower)) ||
      (student.college_id && student.college_id.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="student-list-container">
      <div className="management-header-row">
        <div className="title-section">
          <h1>Student Management</h1>
        </div>
        <div className="management-context-pill">
          <span className="meta">{isAdmin ? 'Admin' : 'Faculty'}</span>
          <span className="title">Student Database</span>
        </div>
        <div className="header-actions">
          {isAdmin && (
            <button className="action-btn-primary" onClick={() => navigate('/students/register')}>
              <UserPlus size={16} style={{ marginRight: '8px' }} />
              Add Student
            </button>
          )}
          <button className="action-btn-outline" onClick={fetchStudents}>
            Refresh List
          </button>
        </div>
      </div>

      <div className="student-table-card">
        <div className="table-controls">
          <div className="search-box">
            <Search size={18} color="#94a3b8" />
            <input type="text" placeholder="Search students..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="filter-box">
            <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}><option value="all">All Years</option><option value="1">Year 1</option><option value="2">Year 2</option><option value="3">Year 3</option><option value="4">Year 4</option></select>
            <select value={filterStream} onChange={(e) => setFilterStream(e.target.value)}><option value="all">All Streams</option><option value="CSE">CSE</option><option value="CSBS">CSBS</option><option value="ECE">ECE</option><option value="ME">ME</option></select>
          </div>
        </div>

        <div className="student-data-table-wrapper">
          <table className="student-data-table">
            <thead>
              <tr><th>Profile</th><th>Student Info</th><th>IDs</th><th>Academic Year</th>{isAdmin && <th>Actions</th>}</tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={isAdmin ? 5 : 4} className="loading-cell">Loading roster...</td></tr>
              ) : filteredStudents.map((student) => (
                <tr key={student.id}>
                  <td>
                    <div className="student-avatar-large">
                      <img src={student.image_url || `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/public/students/${student.id}.jpg`} alt={student.name} onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=' + student.name; }} />
                    </div>
                  </td>
                  <td>
                    <div className="info-cell"><span className="student-name">{student.name}{!student.is_face_verified && (
                      <span className="face-warning-badge" title="Face not verified. Please update photos for AI attendance.">
                        ⚠️ Incomplete
                      </span>
                    )}</span><span className="student-email">{student.email}</span></div>
                  </td>
                  <td>
                    <div className="info-cell"><span className="student-id">Roll: {student.roll_number}</span><span className="student-id">Col: {student.college_id}</span></div>
                  </td>
                  <td>
                    <div className="info-cell"><span className="year-badge">Year {student.year}</span><span className="student-id" style={{ marginTop: '4px' }}>{student.stream}</span></div>
                  </td>
                  {isAdmin && (
                    <td>
                      <div className="action-buttons">
                        <button className="btn-edit" onClick={() => handleEditClick(student)}><Edit2 size={14} /></button>
                        <button className="btn-delete" onClick={() => handleDeleteClick(student)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CORRECTED 2-COLUMN MODAL */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-pop-in">
            <div className="modal-header">
              <div className="modal-header-copy">
                <h2>Update Student Profile</h2>
                <p>Modify existing identity metadata.</p>
              </div>
              <button type="button" className="modal-close-btn" onClick={closeModal} aria-label="Close student enrollment popup">
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
                    {/* LEFT COLUMN: MULTI-ANGLE IMAGE GRID */}
                    <div className="angle-grid-section" style={{ paddingRight: '20px' }}>
                      <div className="angle-grid-label" style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
                        <Camera size={14}/>
                        <span>Face Angle Photos <span className="req" style={{ color: '#ef4444', marginLeft: '6px', fontSize: '0.7rem' }}>* Front, Left, Right required</span></span>
                      </div>
                      <div className="angle-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        {ANGLES.map(a => {
                          const currentStudent = isEditMode ? filteredStudents.find(s => s.id === currentEditId) : null;
                          const showEncodedState = isEditMode && a.key !== 'front' && currentStudent && currentStudent.angle_count >= 2;
                          
                          let isAngleUnverified = false;
                          if (currentStudent) {
                            let angleImagesParsed = {};
                            if (currentStudent.angle_images) {
                              angleImagesParsed = typeof currentStudent.angle_images === 'string'
                                ? JSON.parse(currentStudent.angle_images)
                                : currentStudent.angle_images;
                            }
                            
                            if (a.key === 'front') {
                              isAngleUnverified = currentStudent.is_face_verified === false || angleImagesParsed['front']?.is_verified === false;
                            } else if (angleImagesParsed[a.key]) {
                              isAngleUnverified = angleImagesParsed[a.key].is_verified === false;
                            }
                          }
                          
                          // If user selected a new file, clear the unverified state locally
                          if (files[a.key]) {
                            isAngleUnverified = false;
                          }

                          return (
                            <div key={a.key} className="angle-card" style={{ position: 'relative' }}>
                              <label className={`angle-slot ${files[a.key] || (showEncodedState && !previews[a.key]) ? 'filled' : ''} ${!a.required ? 'optional' : ''} ${isAngleUnverified ? 'unverified' : ''}`}>
                                {!a.required && <span className="angle-badge recommended">Recommended</span>}
                                {previews[a.key] ? (
                                  <div className="angle-preview-wrap">
                                    <img src={previews[a.key]} alt={a.label} className="angle-preview-img"/>
                                    {isAngleUnverified ? (
                                      <div className="angle-check error" title="Face not detected!"><X size={14}/></div>
                                    ) : (
                                      <div className="angle-check"><CheckCircle size={20}/></div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="angle-illustration">
                                    <AngleIllustration angle={a.key}/>
                                    {showEncodedState ? (
                                      <div className="encoded-overlay">
                                        <div className="encoded-badge">
                                          <Lock size={12} />
                                          <span>Encoded</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="angle-upload-hint"><Upload size={12}/></div>
                                    )}
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
                              {isAngleUnverified ? (
                                <span className="angle-tip error" style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 500 }}>⚠️ Face not detected!</span>
                              ) : (
                                <span className="angle-tip" style={{ fontSize: '0.65rem' }}>{a.tip}</span>
                              )}
                            </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  {/* RIGHT COLUMN: FIELDS */}
                  <div className="fields-column">
                    <div className="form-group">
                      <label>Full Legal Name</label>
                      <input type="text" placeholder="e.g. Mahammad Anish" value={regData.name} onChange={e => setRegData({...regData, name: e.target.value})} required />
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label>Roll Number</label>
                        <input type="text" placeholder="30" value={regData.roll_number} onChange={e => setRegData({...regData, roll_number: e.target.value})} required />
                      </div>
                      <div className="form-group">
                        <label>College ID</label>
                        <input type="text" placeholder="gmit-30" value={regData.college_id} onChange={e => setRegData({...regData, college_id: e.target.value})} required />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Academic Year</label>
                        <select value={regData.year} onChange={e => setRegData({...regData, year: e.target.value})}>
                          <option value="1">Year 1</option><option value="2">Year 2</option><option value="3">Year 3</option><option value="4">Year 4</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Stream / Dept</label>
                        <select value={regData.stream} onChange={e => setRegData({...regData, stream: e.target.value})}>
                          <option value="CSE">CSE</option><option value="CSBS">CSBS</option><option value="ECE">ECE</option><option value="ME">ME</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Institutional Email</label>
                      <input type="email" placeholder="anish@college.edu" value={regData.email} onChange={e => setRegData({...regData, email: e.target.value})} required />
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
                  <h3 style={{ fontSize: '1.1rem', color: '#1e293b', marginBottom: '0.75rem' }}>Are you sure you want to delete {deleteModalState.student?.name}?</h3>
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
                    Please enter your admin password to confirm the permanent deletion of <strong>{deleteModalState.student?.name}</strong>.
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

export default StudentList;
