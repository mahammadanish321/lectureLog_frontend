import React, { useState, useEffect } from 'react';
import api from '../api';
import { Users, Search, Trash2, Edit2, Check, X, UserPlus, Upload, Loader2, CheckCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import './TeacherList.css';
import './RegisterTeacher.css';

// SVG cartoon illustrations for each angle
const AngleIllustration = ({ angle }) => {
  const illustrations = {
    front: (
      <svg viewBox="0 0 80 90" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="40" cy="28" r="18" stroke="#818cf8" strokeWidth="2.5" fill="none"/>
        <ellipse cx="34" cy="26" rx="3" ry="3.5" fill="#818cf8" opacity="0.8"/>
        <ellipse cx="46" cy="26" rx="3" ry="3.5" fill="#818cf8" opacity="0.8"/>
        <path d="M34 34 Q40 38 46 34" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <line x1="40" y1="8" x2="40" y2="2" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
        <path d="M20 75 Q40 60 60 75" stroke="#818cf8" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <line x1="40" y1="46" x2="40" y2="60" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round"/>
        <text x="40" y="88" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="sans-serif" fontWeight="600">STRAIGHT</text>
      </svg>
    ),
    left: (
      <svg viewBox="0 0 80 90" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="38" cy="28" rx="14" ry="18" stroke="#818cf8" strokeWidth="2.5" fill="none"/>
        <circle cx="33" cy="26" r="3" fill="#818cf8" opacity="0.8"/>
        <path d="M30 34 Q36 37 42 35" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <path d="M24 28 L16 28" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" opacity="0.5" markerEnd="url(#arrow)"/>
        <path d="M16 26 L22 28 L16 30" fill="#818cf8" opacity="0.6"/>
        <path d="M18 75 Q38 60 56 75" stroke="#818cf8" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <line x1="38" y1="46" x2="38" y2="60" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round"/>
        <text x="40" y="88" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="sans-serif" fontWeight="600">TURN LEFT</text>
      </svg>
    ),
    right: (
      <svg viewBox="0 0 80 90" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="42" cy="28" rx="14" ry="18" stroke="#818cf8" strokeWidth="2.5" fill="none"/>
        <circle cx="47" cy="26" r="3" fill="#818cf8" opacity="0.8"/>
        <path d="M38 34 Q44 37 50 35" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <path d="M56 28 L64 28" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
        <path d="M64 26 L58 28 L64 30" fill="#818cf8" opacity="0.6"/>
        <path d="M22 75 Q42 60 60 75" stroke="#818cf8" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <line x1="42" y1="46" x2="42" y2="60" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round"/>
        <text x="40" y="88" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="sans-serif" fontWeight="600">TURN RIGHT</text>
      </svg>
    ),
    down: (
      <svg viewBox="0 0 80 90" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="40" cy="32" rx="18" ry="14" stroke="#818cf8" strokeWidth="2.5" fill="none"/>
        <ellipse cx="34" cy="32" rx="2.5" ry="2" fill="#818cf8" opacity="0.8"/>
        <ellipse cx="46" cy="32" rx="2.5" ry="2" fill="#818cf8" opacity="0.8"/>
        <path d="M35 37 Q40 40 45 37" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <path d="M40 46 L40 54" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
        <path d="M38 52 L40 56 L42 52" fill="#818cf8" opacity="0.6"/>
        <path d="M20 78 Q40 63 60 78" stroke="#818cf8" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <text x="40" y="88" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="sans-serif" fontWeight="600">LOOK DOWN</text>
      </svg>
    ),
  };
  return illustrations[angle] || null;
};

const ANGLES = [
  { key: 'front', label: 'Front', required: true, tip: 'Look straight at the camera' },
  { key: 'left',  label: 'Left',  required: true, tip: 'Turn your head to the left' },
  { key: 'right', label: 'Right', required: true, tip: 'Turn your head to the right' },
  { key: 'down',  label: 'Down',  required: false, tip: 'Look slightly downward' },
];


const TeacherList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const isAdmin = user?.role === 'admin';
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal & Registration State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentEditId, setCurrentEditId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);
  const [files, setFiles] = useState({ front: null, left: null, right: null, down: null });
  const [previews, setPreviews] = useState({});
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
    setPreviews({ front: teacher.image_url || `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/public/teachers/${teacher.id}.jpg` });
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
          const embedTasks = selectedAngles.map(async (a) => {
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
            return d.embedding;
          });
          
          embeddingsArray = await Promise.all(embedTasks);
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
        if (a.key !== 'front') data.append('images', files[a.key]);
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

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this faculty profile?')) return;
    try {
      await api.delete(`/teachers/${id}`);
      addToast('Faculty profile deleted permanently.', 'info');
      fetchTeachers();
    } catch (err) {
      addToast('Failed to delete faculty member.', 'error');
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
                        <button className="btn-delete" onClick={() => handleDelete(teacher.id)}><Trash2 size={14} /></button>
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
                        <label key={a.key} className={`angle-slot ${files[a.key] ? 'filled' : ''} ${!a.required ? 'optional' : ''}`}>
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
                          <div className="angle-info">
                            <span className="angle-label">{a.label}{a.required && <span className="req">*</span>}</span>
                            <span className="angle-tip" style={{ fontSize: '0.65rem' }}>{a.tip}</span>
                          </div>
                          <input type="file" accept="image/*" hidden onChange={e => handleFile(a.key, e.target.files[0])}/>
                        </label>
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
    </div>
  );
};

export default TeacherList;
