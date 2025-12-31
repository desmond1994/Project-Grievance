import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import apiClient from '../apiClient';
import './AdminGrievanceEditor.css';

export default function AdminGrievanceEditor({ grievanceId, onUpdateSuccess }) {
  const { authToken } = useContext(AuthContext);
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

  // Fetch grievance details and event log
  useEffect(() => {
    const fetchGrievance = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`grievances/${grievanceId}/`);
        setStatus(response.data.status);
        setResolutionNotes(response.data.resolution_notes || '');
        setCategoryInfo(response.data.category || {});
        setDepartmentName(response.data.department_name || (response.data.category && response.data.category.department?.name) || '');
        setError(null);
      } catch {
        setError('Failed to load grievance details.');
      } finally {
        setLoading(false);
      }
    };

    const fetchEvents = async () => {
      try {
        const res = await apiClient.get(`grievances/${grievanceId}/events/`);
        setEvents(res.data);
      } catch {
        // Ignore event fetch errors
      }
    };

    fetchGrievance();
    fetchEvents();
  }, [grievanceId, authToken]);

  // Handle grievance update (with files)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitLoading(true);
    const formData = new FormData();
    formData.append('status', status);
    formData.append('resolution_notes', resolutionNotes);
    if (signedDocument) formData.append('signed_document', signedDocument);
    if (resolutionImage) formData.append('resolution_image', resolutionImage);

    try {
      await apiClient.patch(`grievances/${grievanceId}/`, formData);
      onUpdateSuccess();
      // Refresh event log after update
      const res = await apiClient.get(`grievances/${grievanceId}/events/`);
      setEvents(res.data);
    } catch {
      setError('Failed to update grievance.');
    } finally {
      setSubmitLoading(false);
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
            <strong>Department:</strong>{' '}
            {departmentName || 'N/A'}
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

      <div className="admin-editor-events">
        <h3>Event Log / History</h3>
        <ul>
          {events.length === 0 && <li>No audit events yet.</li>}
          {events.map((ev) => (
            <li key={ev.id}>
              <span className="admin-event-time">
                {new Date(ev.timestamp).toLocaleString()}
              </span>
              <span className="admin-event-main">
                {ev.action} by {(ev.user && (ev.user.username || ev.user)) || 'System'}
              </span>
              {ev.notes && <span className="admin-event-notes"> — {ev.notes}</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}