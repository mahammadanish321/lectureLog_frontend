import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { UserPlus, Upload, Loader2, CheckCircle, Users, Trash2, ArrowLeft, Plus, X, Camera, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './RegisterStudent.css';

const AI_SERVICE_URL = 'http://127.0.0.1:8001';

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
  { key: 'down',  label: 'Down',  required: false, tip: 'Look slightly downward (recommended for CCTV)' },
];

// Modal for adding angles to existing students
const AddAnglesModal = ({ student, onClose, onDone }) => {
  const [files, setFiles] = useState({ front: null, left: null, right: null, down: null });
  const [previews, setPreviews] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState({ step: 0, label: '' });
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
        const embedTasks = selected.map(async (a) => {
          const fd = new FormData();
          fd.append('file', files[a.key]);
          const r = await fetch(`${AI_SERVICE_URL}/embed`, { method: 'POST', body: fd });
          const d = await r.json();
          return d.embedding;
        });
        const embeddings = (await Promise.all(embedTasks)).filter(Boolean);
        setProgress({ step: 2, label: 'Saving to server...' });
        await api.patch(`/students/${student.id}/angles`, { face_embeddings: JSON.stringify(embeddings) });
      } else {
        // Web flow: send files directly to backend
        setProgress({ step: 1, label: 'Uploading & processing...' });
        const fd = new FormData();
        selected.forEach(a => fd.append('images', files[a.key]));
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
                </div>
              )}
              <div className="angle-info">
                <span className="angle-label">{a.label}{a.required && <span className="req">*</span>}</span>
                <span className="angle-tip">{a.tip}</span>
              </div>
              <input type="file" accept="image/*" hidden onChange={e => handleFile(a.key, e.target.files[0])}/>
            </label>
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
    </div>
  );
};

const RegisterStudent = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', email: '', roll_number: '', college_id: '', year: '1', stream: 'CSE' });
  const [files, setFiles] = useState({ front: null, left: null, right: null, down: null });
  const [previews, setPreviews] = useState({});
  const [registering, setRegistering] = useState(false);
  const [bgProgress, setBgProgress] = useState(null); // { steps, current, label }
  const [students, setStudents] = useState([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [filterYear, setFilterYear] = useState('all');
  const [anglesModal, setAnglesModal] = useState(null); // student object
  const isElectron = !!(window.electronAPI?.isElectron);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const requiredAngles = ANGLES.filter(a => a.required);
    const missingRequired = requiredAngles.filter(a => !files[a.key]);
    if (missingRequired.length > 0) {
      return alert(`Please upload: ${missingRequired.map(a => a.label).join(', ')} photo(s)`);
    }

    const selectedAngles = ANGLES.filter(a => files[a.key]);
    const steps = ['Saving profile', ...selectedAngles.map(a => `Processing ${a.label}`), 'Complete'];

    // Immediately free the form for the next student
    const capturedFormData = { ...formData };
    const capturedFiles = { ...files };
    setFormData({ name: '', email: '', roll_number: '', college_id: '', year: '1', stream: 'CSE' });
    setFiles({ front: null, left: null, right: null, down: null });
    setPreviews({});
    setRegistering(true);
    setBgProgress({ steps, current: 0, label: steps[0] });

    // Background processing
    try {
      let embeddingsArray = null;

      if (isElectron) {
        // Generate embeddings in parallel locally for speed
        const embedTasks = selectedAngles.map(async (a, i) => {
          const fd = new FormData();
          fd.append('file', capturedFiles[a.key]);
          setBgProgress(p => ({ ...p, current: i + 1, label: steps[i + 1] }));
          const r = await fetch(`${AI_SERVICE_URL}/embed`, { method: 'POST', body: fd });
          const d = await r.json();
          if (!d.embedding) throw new Error(`No embedding for ${a.label} angle`);
          return d.embedding;
        });
        // Run all embed tasks in parallel
        embeddingsArray = await Promise.all(embedTasks);
      }

      setBgProgress(p => ({ ...p, current: steps.length - 1, label: 'Saving to server...' }));

      // Build multipart form
      const data = new FormData();
      Object.keys(capturedFormData).forEach(k => data.append(k, capturedFormData[k]));
      // Use the front photo as the primary image
      data.append('image', capturedFiles['front']);
      if (embeddingsArray) {
        data.append('face_embeddings', JSON.stringify(embeddingsArray));
      }

      await api.post('/students', data, { headers: { 'Content-Type': 'multipart/form-data' } });

      setBgProgress({ steps, current: steps.length, label: '✅ Registered successfully!' });
      fetchStudents();
      setTimeout(() => { setRegistering(false); setBgProgress(null); }, 2500);
    } catch (err) {
      setBgProgress({ steps, current: 0, label: `❌ ${err.response?.data?.message || err.message}` });
      setTimeout(() => { setRegistering(false); setBgProgress(null); }, 4000);
    }
  };

  const filteredStudents = filterYear === 'all' ? students : students.filter(s => s.year?.toString() === filterYear);

  return (
    <div className="register-container">
      <div className="management-header-row">
        <div className="title-section"><h1>Identity Registration</h1></div>
        <div className="management-context-pill">
          <span className="meta">Admin</span>
          <span className="title">Identity Console</span>
        </div>
        <div className="header-actions">
          <button className="action-btn-outline" onClick={() => navigate('/students')}>
            <ArrowLeft size={16} style={{ marginRight: '8px' }}/>Back to Directory
          </button>
        </div>
      </div>

      <div className="register-grid">
        <div className="register-content animate-fade-in">
          <h3>Student Registration</h3>
          <p>Upload photos from multiple angles to maximize AI recognition accuracy in the classroom.</p>

          {/* Background progress bar (shown after submit) */}
          {registering && bgProgress && (
            <div className="bg-progress-card">
              <div className="bg-progress-header">
                <Loader2 className="animate-spin" size={16} color="var(--primary)"/>
                <span>{bgProgress.label}</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${(bgProgress.current / bgProgress.steps.length) * 100}%` }}/>
              </div>
              <div className="progress-steps">
                {bgProgress.steps.map((s, i) => (
                  <span key={i} className={`progress-step ${i < bgProgress.current ? 'done' : i === bgProgress.current ? 'active' : ''}`}>
                    {i < bgProgress.current ? '✓' : i + 1}. {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="register-form">
            {/* Angle photo grid */}
            <div className="angle-grid-section">
              <div className="angle-grid-label">
                <Camera size={14}/>
                <span>Face Angle Photos <span className="req">* Front, Left, Right required</span></span>
              </div>
              <div className="angle-grid">
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
                      <span className="angle-tip">{a.tip}</span>
                    </div>
                    <input type="file" accept="image/*" hidden onChange={e => handleFileChange(a.key, e.target.files[0])}/>
                  </label>
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

            <button type="submit" className="submit-btn" disabled={registering}>
              {registering ? <Loader2 className="animate-spin" size={18}/> : <UserPlus size={18}/>}
              <span>{registering ? 'Processing in background...' : 'Register Student'}</span>
            </button>
          </form>
        </div>

        {/* Student roster panel */}
        <div className="student-list-panel card">
          <div className="card-header">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h3>Identity Roster</h3>
              <Users size={18} color="#94a3b8"/>
            </div>
            <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
              className="form-group select" style={{ marginTop:'1rem', padding:'0.4rem', fontSize:'0.75rem' }}>
              <option value="all">All Academic Years</option>
              <option value="1">Year 1</option><option value="2">Year 2</option>
              <option value="3">Year 3</option><option value="4">Year 4</option>
            </select>
          </div>

          <div style={{ flex:1, overflowY:'auto', padding:'0 1.5rem 1.5rem' }}>
            {fetchLoading ? (
              <div style={{ display:'flex', justifyContent:'center', padding:'2rem' }}>
                <Loader2 className="animate-spin" size={24} color="var(--primary)"/>
              </div>
            ) : filteredStudents.map(student => (
              <div key={student.id} className="student-item-mini">
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

      {anglesModal && (
        <AddAnglesModal student={anglesModal} onClose={() => setAnglesModal(null)} onDone={fetchStudents}/>
      )}
    </div>
  );
};

export default RegisterStudent;
