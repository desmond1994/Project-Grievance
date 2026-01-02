// src/components/TriageGrievanceDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../apiClient';
import '../App.css';
import PhotoGallery from './PhotoGallery';

export default function TriageGrievanceDetail() {
  const { id } = useParams();
  const grievanceId = id;
  const [grievance, setGrievance] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        // triage detail
        const gRes = await apiClient.get(`grievances/${grievanceId}/`);
        setGrievance(gRes.data);
        console.log('triage grievance data:', gRes.data);
        console.log("triage keys:", Object.keys(gRes.data));
console.log("triage resolution_images:", gRes.data.resolution_images);
console.log("triage images:", gRes.data.images);


        // optional triage events endpoint; if not present, events stay empty
        try {
          const eRes = await apiClient.get(`grievances/${grievanceId}/events/`);

          setEvents(eRes.data);
        } catch {
          setEvents([]);
        }

        setError(null);
      } catch {
        setError('Failed to load grievance details.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [grievanceId]);

  if (loading) return <p>Loading grievance details...</p>;
  if (error) return <p className="error-message">{error}</p>;
  if (!grievance) return null;

  const normalizedStatus =
    grievance.status === 'Pending at Triage'
      ? 'Pending'
      : grievance.status || 'Pending';

// Use resolution_images directly (same format as admin/user)
const triageImages = grievance.images || [];

console.log('triageImages:', triageImages);


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
          {grievance.category?.name || 'Complaint'}
  </h2>
      </div>
      <p>
        <i>
          Submitted:{' '}
          {grievance.created_at ? new Date(grievance.created_at).toLocaleString() : 'N/A'}

        </i>
      </p>

      <div className="grievance-detail-section">
        <p>
          <strong>Department:</strong>{' '}
          {grievance.category?.department?.name || 'Grievance Triage'}

        </p>
        <p>
          <strong>Category:</strong>{' '}
          {grievance.category?.full_path ||
            grievance.category_name ||
            grievance.category?.name ||
            'In Review'}
        </p>
        <p>
          <strong>Description:</strong> {grievance.description}
        </p>
        <p>
          <strong>Location:</strong> {grievance.location || 'N/A'}
        </p>
        <p>
          <strong>Citizen:</strong> {grievance.user_name || 'Citizen'}
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
                <tr key={ev.id || ev.timestamp}>
                  <td>
                    {ev.timestamp
                      ? new Date(ev.timestamp).toLocaleString()
                      : ''}
                  </td>
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

      {triageImages.length > 0 && <PhotoGallery photos={triageImages} />}
    </div>
  );
}
