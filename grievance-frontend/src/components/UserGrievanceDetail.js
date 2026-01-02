// src/components/UserGrievanceDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../apiClient';
import '../App.css';
import PhotoGallery from './PhotoGallery';

export default function UserGrievanceDetail() {
  const { id } = useParams();
  const grievanceId = id;
  const [grievance, setGrievance] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showReopenReason, setShowReopenReason] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [reopenLoading, setReopenLoading] = useState(false);
  const [reopenError, setReopenError] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (!grievanceId) {
      setError('Invalid grievance id.');
      setLoading(false);
      return;
    }
    const fetchData = async () => {
      try {
        setLoading(true);
        const gRes = await apiClient.get(`grievances/${grievanceId}/`);
        setGrievance(gRes.data);
        const eRes = await apiClient.get(`grievances/${grievanceId}/events/`);
        setEvents(eRes.data);
        setError(null);
      } catch {
        setError('Failed to load grievance details.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [grievanceId]);

  const handleReopen = async () => {
    if (!reopenReason.trim()) {
      setReopenError('Please provide a reason for reopening.');
      return;
    }
    setReopenError(null);
    setReopenLoading(true);
    try {
      await apiClient.post(`grievances/${grievanceId}/reopen/`, {
        reason: reopenReason,
      });
      setReopenReason('');
      const gRes = await apiClient.get(`grievances/${grievanceId}/`);
      setGrievance(gRes.data);
      const eRes = await apiClient.get(`grievances/${grievanceId}/events/`);
      setEvents(eRes.data);
    } finally {
      setReopenLoading(false);
    }
  };

  if (loading) return <p>Loading grievance details...</p>;
  if (error) return <p className="error-message">{error}</p>;
  if (!grievance) return null;

  const normalizedStatus =
    grievance.status === 'Pending at Triage' ? 'Pending' : grievance.status;

  return (
    <div className="grievance-detail-card">
      <button className="back-btn" onClick={() => navigate(-1)}>
        ← Back
      </button>
      <div className="grievance-detail-header">
        <span
          className={`status-badge status-${normalizedStatus
            .replace(/\s/g, '')
            .toLowerCase()}`}
        >
          {normalizedStatus}
        </span>

        <h2>
          {grievance.category_name ||
            grievance.category?.name ||
            'Complaint'}
        </h2>
      </div>
      <p>
        <i>
          Last updated: {new Date(grievance.updated_at).toLocaleString()}
        </i>
      </p>

      <div className="grievance-detail-section">
        <p>
          <strong>Department:</strong>{' '}
          {grievance.department_name ||
            grievance.category?.department?.name ||
            'N/A'}
        </p>
        <p>
          <strong>Category:</strong>{' '}
          {grievance.category?.full_path ||
            grievance.category_name ||
            grievance.category?.name ||
            'N/A'}
          {grievance.category_name === 'In Review' && (
            <span> (at triage team)</span>
          )}
        </p>
        <p>
          <strong>Description:</strong> {grievance.description}
        </p>
        <p>
          <strong>Location:</strong> {grievance.location || 'N/A'}
        </p>
      </div>

      <div className="grievance-detail-section">
        <h4>Event Log</h4>
        {events.length === 0 ? (
          <p style={{ color: '#666', textAlign: 'center' }}>No events yet.</p>
        ) : (
          <table className="event-log-table">
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
                <tr key={ev.id}>
                  <td>{new Date(ev.timestamp).toLocaleString()}</td>
                  <td>{ev.action}</td>
                  <td>
                    {(ev.user && (ev.user.username || ev.user)) || 'System'}
                  </td>
                  <td>{ev.notes || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {grievance.images && grievance.images.length > 0 && (
  <PhotoGallery 
    photos={grievance.images.map(img => ({
      image: img.image.startsWith('http') ? img.image : `http://127.0.0.1:8000${img.image}`
    }))} 
  />
)}

      {['Resolved', 'Rejected'].includes(grievance.status) && (
        <div className="grievance-detail-section">
          {!showReopenReason && (
            <button
              className="reopen-btn"
              onClick={() => setShowReopenReason(true)}
              disabled={reopenLoading}
            >
              Reopen Grievance
            </button>
          )}

          {showReopenReason && (
            <>
              <label htmlFor="reopenReason">Reason for Reopening:</label>
              <br />
              <textarea
                id="reopenReason"
                rows="3"
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="Enter reason here..."
                style={{ width: '100%', marginBottom: '10px' }}
              />
              {reopenError && (
                <p className="error-message">{reopenError}</p>
              )}
              <button
                className="reopen-btn"
                onClick={handleReopen}
                disabled={reopenLoading}
              >
                {reopenLoading ? 'Submitting...' : 'Submit Reason'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
