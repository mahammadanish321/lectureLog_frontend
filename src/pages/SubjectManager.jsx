import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './SubjectManager.css';

const API_URL = 'http://localhost:5000/api/subjects';

const SubjectManager = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({ name: '', code: '' });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API_URL);
      setSubjects(res.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching subjects:', err);
      setError('Failed to load subjects.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.code) {
      setError('Both Subject Name and Code are required.');
      return;
    }

    try {
      if (editingId) {
        await axios.put(`${API_URL}/${editingId}`, formData);
      } else {
        await axios.post(API_URL, formData);
      }
      setFormData({ name: '', code: '' });
      setEditingId(null);
      setError(null);
      fetchSubjects();
    } catch (err) {
      console.error('Error saving subject:', err);
      setError(err.response?.data?.message || 'Failed to save subject.');
    }
  };

  const handleEdit = (subject) => {
    setFormData({ name: subject.name, code: subject.code || '' });
    setEditingId(subject.id);
    setError(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this subject?')) return;
    try {
      await axios.delete(`${API_URL}/${id}`);
      fetchSubjects();
    } catch (err) {
      console.error('Error deleting subject:', err);
      setError(err.response?.data?.message || 'Failed to delete subject.');
    }
  };

  const cancelEdit = () => {
    setFormData({ name: '', code: '' });
    setEditingId(null);
    setError(null);
  };

  return (
    <div className="subject-manager-container">
      <h1 className="page-title">Subject Management</h1>
      <p className="page-subtitle">Manage academy subjects and codes.</p>

      {error && <div className="error-message">{error}</div>}

      <div className="subject-manager-content">
        <div className="subject-form-card">
          <h2>{editingId ? 'Edit Subject' : 'Add New Subject'}</h2>
          <form onSubmit={handleSubmit} className="subject-form">
            <div className="form-group">
              <label htmlFor="name">Subject Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Advanced Mathematics"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="code">Subject Code</label>
              <input
                type="text"
                id="code"
                name="code"
                value={formData.code}
                onChange={handleChange}
                placeholder="e.g. MATH-401"
                required
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">
                {editingId ? 'Update Subject' : 'Add Subject'}
              </button>
              {editingId && (
                <button type="button" onClick={cancelEdit} className="btn-secondary">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="subject-list-card">
          <h2>Current Subjects</h2>
          {loading ? (
            <p className="loading-text">Loading subjects...</p>
          ) : subjects.length === 0 ? (
            <p className="no-data-text">No subjects found. Add one above!</p>
          ) : (
            <div className="table-responsive">
              <table className="subject-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((subject) => (
                    <tr key={subject.id}>
                      <td className="code-cell">{subject.code || '-'}</td>
                      <td>{subject.name}</td>
                      <td className="actions-cell">
                        <button onClick={() => handleEdit(subject)} className="btn-edit">Edit</button>
                        <button onClick={() => handleDelete(subject.id)} className="btn-delete">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubjectManager;
