import React, { useState, useEffect } from 'react';
import api from '../api';
import { UserPlus, Loader2, Trash2, Users, ArrowLeft, Plus, X, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './RegisterTeacher.css';

const AI_SERVICE_URL = 'http://127.0.0.1:8001';

// Reusable SVG cartoon illustration for each angle
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
        <path d="M24 28 L16 28" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
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
  { key: 'front', label: 'Front', required: true,  tip: 'Look straight at the camera' },
  { key: 'left',  label: 'Left',  required: true,  tip: 'Turn your head to the left' },
  { key: 'right', label: 'Right', required: true,  tip: 'Turn your head to the right' },
  { key: 'down',  label: 'Down',  required: false, tip: 'Look slightly downward (recommended)' },
];

// Modal for adding angles to existing teachers
const AddAnglesModal = ({ teacher, onClose, onDone }) => {
  const [files, setFiles] = useState({});
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
        await api.patch(`/teachers/${teacher.id}/angles`, { face_embeddings: JSON.stringify(embeddings) });
      } else {
        setProgress({ step: 1, label: 'Uploading & processing...' });
        const fd = new FormData();
        selected.forEach(a => fd.append('images', files[a.key]));
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
            <label key={a.key} className={`angle-slot ${files[a.key] ? 'filled' : ''} ${!a.required ? 'optional' : ''}`}>
              {!a.required && <span className="angle-badge recommended">Recommended</span>}
              {previews[a.key] ? (
                <div className="angle-preview-wrap">
                  <img src={previews[a.key]} alt={a.label} className="angle-preview-img"/>
                  <div className="angle-check" style={{ background:'#22c55e', borderRadius:'50%', padding:'2px', color:'white', position:'absolute', top:'-6px', right:'-6px', display:'flex' }}>✓</div>
                </div>
              ) : (
                <div className="angle-illustration"><AngleIllustration angle={a.key}/></div>
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
    </div>
  );
};

const RegisterTeacher = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', email: '', college_id: '' });
  const [files, setFiles] = useState({ front: null, left: null, right: null, down: null });
  const [previews, setPreviews] = useState({});
  const [registering, setRegistering] = useState(false);
  const [bgProgress, setBgProgress] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [anglesModal, setAnglesModal] = useState(null);
  const isElectron = !!(window.electronAPI?.isElectron);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const missingRequired = ANGLES.filter(a => a.required && !files[a.key]);
    if (missingRequired.length > 0) return alert(`Please upload: ${missingRequired.map(a => a.label).join(', ')} photo(s)`);

    const selectedAngles = ANGLES.filter(a => files[a.key]);
    const steps = ['Saving profile', ...selectedAngles.map(a => `Processing ${a.label}`), 'Complete'];

    const capturedFormData = { ...formData };
    const capturedFiles = { ...files };
    setFormData({ name: '', email: '', college_id: '' });
    setFiles({ front: null, left: null, right: null, down: null });
    setPreviews({});
    setRegistering(true);
    setBgProgress({ steps, current: 0, label: steps[0] });

    try {
      let embeddingsArray = null;
      if (isElectron) {
        const embedTasks = selectedAngles.map(async (a, i) => {
          const fd = new FormData();
          fd.append('file', capturedFiles[a.key]);
          setBgProgress(p => ({ ...p, current: i + 1, label: steps[i + 1] }));
          const r = await fetch(`${AI_SERVICE_URL}/embed`, { method: 'POST', body: fd });
          const d = await r.json();
          if (!d.embedding) throw new Error(`No embedding for ${a.label}`);
          return d.embedding;
        });
        embeddingsArray = await Promise.all(embedTasks);
      }

      setBgProgress(p => ({ ...p, current: steps.length - 1, label: 'Saving to server...' }));

      const data = new FormData();
      data.append('name', capturedFormData.name);
      data.append('email', capturedFormData.email);
      data.append('college_id', capturedFormData.college_id);
      data.append('image', capturedFiles['front']);
      if (embeddingsArray) data.append('face_embeddings', JSON.stringify(embeddingsArray));

      await api.post('/teachers', data, { headers: { 'Content-Type': 'multipart/form-data' } });

      setBgProgress({ steps, current: steps.length, label: '✅ Faculty registered successfully!' });
      fetchTeachers();
      setTimeout(() => { setRegistering(false); setBgProgress(null); }, 2500);
    } catch (err) {
      setBgProgress({ steps, current: 0, label: `❌ ${err.response?.data?.message || err.message}` });
      setTimeout(() => { setRegistering(false); setBgProgress(null); }, 4000);
    }
  };

  return (
    <div className="register-container">
      <div className="management-header-row">
        <div className="title-section"><h1>Faculty Registration</h1></div>
        <div className="management-context-pill">
          <span className="meta">Admin</span>
          <span className="title">Academic Staff</span>
        </div>
        <div className="header-actions">
          <button className="action-btn-outline" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={16} style={{ marginRight:'8px' }}/>Back to Dashboard
          </button>
        </div>
      </div>

      <div className="register-grid">
        <div className="register-content animate-fade-in">
          <h3>Teacher Registration</h3>
          <p>Register a new faculty member with multi-angle photos for robust AI recognition.</p>

          {registering && bgProgress && (
            <div className="bg-progress-card indigo">
              <div className="bg-progress-header">
                <Loader2 className="animate-spin" size={16} color="#818cf8"/>
                <span style={{ color:'#818cf8' }}>{bgProgress.label}</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill indigo" style={{ width:`${(bgProgress.current / bgProgress.steps.length) * 100}%` }}/>
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
            <div className="angle-grid-section">
              <div className="angle-grid-label" style={{ color:'#818cf8' }}>
                <Camera size={14}/>
                <span>Face Angle Photos <span className="req">* Front, Left, Right required</span></span>
              </div>
              <div className="angle-grid">
                {ANGLES.map(a => (
                  <label key={a.key} className={`angle-slot teacher-slot ${files[a.key] ? 'filled' : ''} ${!a.required ? 'optional' : ''}`}>
                    {!a.required && <span className="angle-badge recommended">Recommended</span>}
                    {previews[a.key] ? (
                      <div className="angle-preview-wrap">
                        <img src={previews[a.key]} alt={a.label} className="angle-preview-img"/>
                        <div className="angle-check" style={{ background:'#818cf8' }}>✓</div>
                      </div>
                    ) : (
                      <div className="angle-illustration"><AngleIllustration angle={a.key}/></div>
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

            <button type="submit" className="submit-btn teacher-btn" disabled={registering}>
              {registering ? <Loader2 className="animate-spin" size={18}/> : <UserPlus size={18}/>}
              <span>{registering ? 'Processing in background...' : 'Register Faculty Member'}</span>
            </button>
          </form>
        </div>

        {/* Teacher roster panel */}
        <div className="teacher-list-panel card">
          <div className="card-header">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h3>Current Faculty</h3>
              <Users size={18} color="#94a3b8"/>
            </div>
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:'1.5rem' }}>
            {fetchLoading ? (
              <div style={{ display:'flex', justifyContent:'center' }}>
                <Loader2 className="animate-spin" size={24} color="#818cf8"/>
              </div>
            ) : teachers.map(teacher => (
              <div key={teacher.id} className="teacher-item-mini">
                <div className="mini-image">
                  <img src={teacher.image_url || `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/public/teachers/${teacher.id}.jpg`}
                    alt={teacher.name} onError={e => { e.target.src = 'https://ui-avatars.com/api/?name=' + teacher.name; }}/>
                </div>
                <div className="mini-details">
                  <p className="name">{teacher.name}</p>
                  <p className="sub">{teacher.college_id} • {teacher.email}</p>
                  <span className="angle-count-badge indigo">
                    <Camera size={10}/> {teacher.angle_count || 1} angle{teacher.angle_count !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="mini-actions">
                  <button className="btn-add-angle indigo" title="Add more face angles" onClick={() => setAnglesModal(teacher)}>
                    <Plus size={12}/> Angles
                  </button>
                  <button className="btn-delete-mini" onClick={() => handleDelete(teacher.id)}><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {anglesModal && (
        <AddAnglesModal teacher={anglesModal} onClose={() => setAnglesModal(null)} onDone={fetchTeachers}/>
      )}
    </div>
  );
};

export default RegisterTeacher;
