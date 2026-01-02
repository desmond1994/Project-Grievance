import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../apiClient';
import PhotoGallery from './PhotoGallery';
import './AdminGrievanceEditor.css';

export default function AdminGrievanceEditor({ grievanceId, onUpdateSuccess }) {
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

  const due = new Date(dueDateStr + 'T00:00:00'); // avoids YYYY-MM-DD timezone shift
  const now = new Date();

  return Math.ceil((due - now) / (1000 * 60 * 60 * 24));
}, []);


  useEffect(() => {
    const fetchGrievance = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`grievances/${grievanceId}/`);

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

    fetchGrievance();
    fetchEvents();
  }, [grievanceId, computeDaysLeft]);

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
    setError(null);
    setSubmitLoading(true);

    const formData = new FormData();
    formData.append('status', status);
    if (resolutionNotes !== null && resolutionNotes !== undefined) {
  formData.append('resolution_notes', resolutionNotes);
}

    if (signedDocument) formData.append('signed_document', signedDocument);
    if (resolutionImage) formData.append('resolution_image', resolutionImage);

    try {
     await apiClient.patch(`grievances/${grievanceId}/`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});


      await refreshEvents();
      onUpdateSuccess?.();
    } catch (err) {
      setError('Failed to update grievance.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const grantExtension = async () => {
    setError(null);
    try {
      // ✅ keep consistent with AdminDashboard: grant_extension (underscore)
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
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div className="admin-editor">
      <h2 className="admin-editor-title">Edit Grievance</h2>

      <form onSubmit={handleSubmit} className="admin-editor-form">
        <div className="admin-editor-meta">
          <div>
            <strong>Department:</strong> {departmentName || 'N/A'}
          </div>
          <div>
            <strong>Category/Sub-Department:</strong>{' '}
            {(categoryInfo.full_path || categoryInfo.name) || 'N/A'}
          </div>
        </div>

        <div className="admin-editor-field">
          <label htmlFor="status">Status</label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            required
          >
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Rejected">Rejected</option>
          </select>

          <div className="sla-section">
            <div className="sla-badge-container">
              <span>SLA:</span>
              <span
  className={`sla-badge ${
    daysLeft === null
      ? 'healthy'
      : daysLeft < 0
        ? 'overdue'
        : daysLeft <= 3
          ? 'warning'
          : 'healthy'
  }`}
>
  {daysLeft === null ? 'No SLA' : `${daysLeft}d`}
</span>
            </div>

            <div className="quick-actions">
              {/* ✅ IMPORTANT: type="button" so it doesn't submit the form */}
              <button
                type="button"
                className="quick-btn in-progress"
                onClick={() => setStatus('In Progress')}
              >
                🚀 In Progress
              </button>

              <button
                type="button"
                className="quick-btn extension"
                onClick={grantExtension}
              >
                ⏰ +14d Extension
              </button>
            </div>
          </div>
        </div>

        <div className="admin-editor-field">
          <label htmlFor="resolutionNotes">Resolution Notes</label>
          <textarea
            id="resolutionNotes"
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            rows="5"
          />
        </div>

        <div className="admin-editor-field">
          <label htmlFor="signedDocument">Upload Signed Document</label>
          <input
            id="signedDocument"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => setSignedDocument(e.target.files[0])}
          />
        </div>

        <div className="admin-editor-field">
          <label htmlFor="resolutionImage">Upload Resolution Image</label>
          <input
            id="resolutionImage"
            type="file"
            accept="image/*"
            onChange={(e) => setResolutionImage(e.target.files[0])}
          />
        </div>

        <div className="admin-editor-actions">
          <button type="submit" disabled={submitLoading}>
            {submitLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>

      <div className="admin-editor-images">
        <h3>Resolution Images</h3>
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
