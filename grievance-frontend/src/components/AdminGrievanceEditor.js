import React, { useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import apiClient from '../apiClient';
import PhotoGallery from './PhotoGallery';
import './AdminGrievanceEditor.css';

export default function AdminGrievanceEditor({ grievanceId, onUpdateSuccess }) {
  const { user } = useContext(AuthContext);
  const [status, setStatus] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [signedDocument, setSignedDocument] = useState(null);
  const [resolutionImage, setResolutionImage] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [events, setEvents] = useState([]);
  const [categoryInfo, setCategoryInfo] = useState({});
  const [departmentName, setDepartmentName] = useState('');
  const [daysLeft, setDaysLeft] = useState(7);
  const [resolutionImagesView, setResolutionImages] = useState([]);

  const computeDaysLeft = useCallback((dueDateStr) => {
    if (!dueDateStr) return null;
    const due = new Date(dueDateStr + 'T00:00:00');
    const now = new Date();
    return Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  }, []);

  // ✅ STRICT: Notes AND BOTH files required
  const isFormValid = () => {
    const hasNotes = resolutionNotes && resolutionNotes.trim().length >= 10;
    const hasDoc = signedDocument;
    const hasImage = resolutionImage;
    return hasNotes && hasDoc && hasImage;  // BOTH files!
  };

  const validationError = () => {
    if (!resolutionNotes || resolutionNotes.trim().length === 0) {
      return 'Resolution notes required (min 10 characters).';
    }
    if (resolutionNotes.trim().length < 10) {
      return 'Resolution notes too short (min 10 characters).';
    }
    if (!signedDocument) {
      return 'Signed document is required.';
    }
    if (!resolutionImage) {
      return 'Resolution photo is required.';
    }
    return null;
  };

  useEffect(() => {
    const initGrievance = async () => {
      try {
        setLoading(true);
        let response = await apiClient.get(`grievances/${grievanceId}/`);

        const authorizedRoles = ['triage_user', 'department_admin', 'top_authority'];
        if (response.data.status === 'Pending' && 
            user?.role && authorizedRoles.includes(user.role)) {
          await apiClient.patch(`grievances/${grievanceId}/`, { 
            status: 'In Progress',
            resolution_notes: `${user.username || 'Admin'} auto-set to In Progress on open`
          });
          response = await apiClient.get(`grievances/${grievanceId}/`);
        }

        setStatus(response.data.status);
        setResolutionNotes(response.data.resolution_notes || '');
        setDaysLeft(computeDaysLeft(response.data.due_date));
        setCategoryInfo(response.data.category || {});
        setDepartmentName(
          response.data.department?.name ||
          response.data.category?.department?.name ||
          ''
        );
        setResolutionImages(response.data.images || []);
        setError(null);
      } catch (err) {
        setError('Failed to load grievance details.');
      } finally {
        setLoading(false);
      }
    };

    const fetchEvents = async () => {
      try {
        const res = await apiClient.get(`grievances/${grievanceId}/events/`);
        setEvents(res.data || []);
      } catch (err) {
        setEvents([]);
      }
    };

    if (grievanceId) {
      initGrievance();
      fetchEvents();
    }
  }, [grievanceId, computeDaysLeft, user]);

  const refreshEvents = async () => {
    try {
      const res = await apiClient.get(`grievances/${grievanceId}/events/`);
      setEvents(res.data || []);
    } catch (err) {
      // ignore
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErr = validationError();
    if (validationErr) {
      setError(validationErr);
      return;
    }
    
    setError(null);
    setSubmitLoading(true);

    const formData = new FormData();
    formData.append('status', 'Resolved');  // Auto-resolve
    
    formData.append('resolution_notes', resolutionNotes.trim());
    formData.append('signed_document', signedDocument);
    formData.append('resolution_image', resolutionImage);

    try {
      await apiClient.patch(`grievances/${grievanceId}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await refreshEvents();
      onUpdateSuccess?.();
    } catch (err) {
      setError('Failed to resolve grievance.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const grantExtension = async () => {
    setError(null);
    try {
      await apiClient.post(`admin-grievances/${grievanceId}/grant_extension/`);
      const response = await apiClient.get(`grievances/${grievanceId}/`);
      setDaysLeft(computeDaysLeft(response.data.due_date));
      alert('✅ Extension granted +14 days!');
      await refreshEvents();
      onUpdateSuccess?.();
    } catch (err) {
      setError('Extension failed. Check if eligible.');
    }
  };

  if (loading) return <p>Loading grievance details...</p>;
  if (error) return <div style={{ color: 'red', padding: '10px', border: '1px solid red', borderRadius: '4px', marginBottom: '10px' }}>{error}</div>;

  return (
    <div className="admin-editor">
      <h2 className="admin-editor-title">Resolve Grievance #{grievanceId}</h2>

      <form onSubmit={handleSubmit} className="admin-editor-form">
        <div className="admin-editor-meta">
          <div><strong>Department:</strong> {departmentName || 'N/A'}</div>
          <div><strong>Category:</strong> {(categoryInfo.full_path || categoryInfo.name) || 'N/A'}</div>
        </div>

        <div className="admin-editor-field">
          <label>Current Status</label>
          <div className="status-display">
            <span className={`status-badge status-${status.toLowerCase().replace(/\s+/g, '-')}`}>
              {status}
            </span>
            <small>(Will be Resolved on save)</small>
          </div>
        </div>

        <div className="sla-section">
          <div className="sla-badge-container">
            <span>SLA:</span>
            <span className={`sla-badge ${
              daysLeft === null ? 'healthy' :
              daysLeft < 0 ? 'overdue' :
              daysLeft <= 3 ? 'warning' : 'healthy'
            }`}>
              {daysLeft === null ? 'No SLA' : `${daysLeft}d`}
            </span>
          </div>
          <div className="quick-actions">
            <button type="button" className="quick-btn in-progress" onClick={() => setStatus('In Progress')}>
              🚀 Mark In Progress
            </button>
            <button type="button" className="quick-btn extension" onClick={grantExtension}>
              ⏰ +14d Extension
            </button>
          </div>
        </div>

        <div className="admin-editor-field">
          <label htmlFor="resolutionNotes">
            Resolution Notes <span className="required">*</span> (min 10 chars)
          </label>
          <textarea
            id="resolutionNotes"
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            rows="5"
            placeholder="Detailed explanation of resolution steps taken..."
            className={!isFormValid() ? 'invalid-field' : ''}
          />
          <small className={resolutionNotes.trim().length >= 10 ? 'valid-count' : 'invalid-count'}>
            {resolutionNotes.trim().length}/10+ characters
          </small>
        </div>

        <div className="admin-editor-field">
          <label htmlFor="signedDocument">
            Signed Document <span className="required">*</span>
          </label>
          <input
            id="signedDocument"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => setSignedDocument(e.target.files[0])}
            className={!signedDocument ? 'invalid-field' : ''}
            required
          />
          {signedDocument && <small className="file-preview">✅ {signedDocument.name}</small>}
        </div>

        <div className="admin-editor-field">
          <label htmlFor="resolutionImage">
            Resolution Photo <span className="required">*</span>
          </label>
          <input
            id="resolutionImage"
            type="file"
            accept="image/*"
            onChange={(e) => setResolutionImage(e.target.files[0])}
            className={!resolutionImage ? 'invalid-field' : ''}
            required
          />
          {resolutionImage && <small className="file-preview">✅ {resolutionImage.name}</small>}
        </div>

        <div className="admin-editor-actions">
          <button 
            type="submit" 
            disabled={submitLoading || !isFormValid()}
            className={!isFormValid() ? 'disabled-validation' : ''}
          >
            {submitLoading ? 'Resolving...' : '✅ Resolve Grievance'}
          </button>
        </div>
      </form>

      <div className="admin-editor-images">
        <h3>Existing Resolution Images</h3>
        {resolutionImagesView.length === 0 ? (
          <p>No resolution images uploaded yet.</p>
        ) : (
          <PhotoGallery photos={resolutionImagesView} />
        )}
      </div>

      <div className="admin-editor-events">
        <h3>📋 Event History ({events.length})</h3>
        {events.length === 0 ? (
          <p className="no-events">No audit events yet.</p>
        ) : (
          <div className="table-container">
            <table className="event-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Action</th>
                  <th>User</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.id || ev.timestamp}>
                    <td>{ev.timestamp ? new Date(ev.timestamp).toLocaleString() : ''}</td>
                    <td>
                      <span className={`status-badge status-${String(ev.action || '')
                        .toLowerCase()
                        .replace(/\s+/g, '-')}`}
                      >
                        {ev.action}
                      </span>
                    </td>
                    <td>{ev.user?.username || ev.user || 'System'}</td>
                    <td>{ev.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
