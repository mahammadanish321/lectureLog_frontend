import React, { useState, useEffect } from 'react';
import api from '../api';
import { Search, Trash2, Edit2, Check, X, UserPlus, Upload, Loader2, CheckCircle, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './StudentList.css';
import './RegisterStudent.css';

// SVG cartoon illustrations for each angle
const AngleIllustration = ({ angle }) => {
  const illustrations = {
    front: (
      <svg viewBox="0 0 80 90" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="40" cy="28" r="18" stroke="#38bdf8" strokeWidth="2.5" fill="none"/>
        <ellipse cx="34" cy="26" rx="3" ry="3.5" fill="#38bdf8" opacity="0.8"/>
        <ellipse cx="46" cy="26" rx="3" ry="3.5" fill="#38bdf8" opacity="0.8"/>
        <path d="M34 34 Q40 38 46 34" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <line x1="40" y1="8" x2="40" y2="2" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
        <path d="M20 75 Q40 60 60 75" stroke="#38bdf8" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <line x1="40" y1="46" x2="40" y2="60" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round"/>
        <text x="40" y="88" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="sans-serif" fontWeight="600">STRAIGHT</text>
      </svg>
    ),
    left: (
      <svg viewBox="0 0 80 90" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="38" cy="28" rx="14" ry="18" stroke="#38bdf8" strokeWidth="2.5" fill="none"/>
        <circle cx="33" cy="26" r="3" fill="#38bdf8" opacity="0.8"/>
        <path d="M30 34 Q36 37 42 35" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <path d="M24 28 L16 28" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" opacity="0.5" markerEnd="url(#arrow)"/>
        <path d="M16 26 L22 28 L16 30" fill="#38bdf8" opacity="0.6"/>
        <path d="M18 75 Q38 60 56 75" stroke="#38bdf8" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <line x1="38" y1="46" x2="38" y2="60" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round"/>
        <text x="40" y="88" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="sans-serif" fontWeight="600">TURN LEFT</text>
      </svg>
    ),
    right: (
      <svg viewBox="0 0 80 90" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="42" cy="28" rx="14" ry="18" stroke="#38bdf8" strokeWidth="2.5" fill="none"/>
        <circle cx="47" cy="26" r="3" fill="#38bdf8" opacity="0.8"/>
        <path d="M38 34 Q44 37 50 35" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <path d="M56 28 L64 28" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
        <path d="M64 26 L58 28 L64 30" fill="#38bdf8" opacity="0.6"/>
        <path d="M22 75 Q42 60 60 75" stroke="#38bdf8" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <line x1="42" y1="46" x2="42" y2="60" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round"/>
        <text x="40" y="88" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="sans-serif" fontWeight="600">TURN RIGHT</text>
      </svg>
    ),
    down: (
      <svg viewBox="0 0 80 90" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="40" cy="32" rx="18" ry="14" stroke="#38bdf8" strokeWidth="2.5" fill="none"/>
        <ellipse cx="34" cy="32" rx="2.5" ry="2" fill="#38bdf8" opacity="0.8"/>
        <ellipse cx="46" cy="32" rx="2.5" ry="2" fill="#38bdf8" opacity="0.8"/>
        <path d="M35 37 Q40 40 45 37" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <path d="M40 46 L40 54" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
        <path d="M38 52 L40 56 L42 52" fill="#38bdf8" opacity="0.6"/>
        <path d="M20 78 Q40 63 60 78" stroke="#38bdf8" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
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


const StudentList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterYear, setFilterYear] = useState('all');
  const [filterStream, setFilterStream] = useState('all');
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
    setPreviews({ front: student.image_url || `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/public/students/${student.id}.jpg` });
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

      if (isElectron && selectedAngles.length > 0) {
        console.log('[Electron] Generating local face embeddings...');
        try {
          const embedTasks = selectedAngles.map(async (a) => {
            const fd = new FormData();
            fd.append('file', files[a.key]);
            const r = await fetch(`${AI_SERVICE_URL}/embed`, { method: 'POST', body: fd });
            const d = await r.json();
            if (!d.embedding) throw new Error(`No embedding for ${a.label} angle`);
            return d.embedding;
          });
          embeddingsArray = await Promise.all(embedTasks);
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
        if (a.key !== 'front') data.append('images', files[a.key]);
      });
      
      if (embeddingsArray) {
        data.append('face_embeddings', JSON.stringify(embeddingsArray));
      }

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

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this student profile?')) return;
    try {
      await api.delete(`/students/${id}`);
      fetchStudents();
    } catch (err) {
      alert('Delete failed.');
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
          <span className="meta">Admin</span>
          <span className="title">Student Database</span>
        </div>
        <div className="header-actions">
          <button className="action-btn-primary" onClick={() => navigate('/students/register')}>
            <UserPlus size={16} style={{ marginRight: '8px' }} />
            Add Student
          </button>
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
                    <div className="info-cell"><span className="student-name">{student.name}</span><span className="student-email">{student.email}</span></div>
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
                        <button className="btn-delete" onClick={() => handleDelete(student.id)}><Trash2 size={14} /></button>
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
    </div>
  );
};

export default StudentList;
