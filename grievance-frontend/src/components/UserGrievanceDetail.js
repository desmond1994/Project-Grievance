
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../apiClient';
import './GrievanceDetail.css';
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
        // Fetch grievance details
        const gRes = await apiClient.get(`grievances/${grievanceId}/`);
        setGrievance(gRes.data);
        console.log('triage grievance data:', gRes.data);

        // Optional triage events endpoint
      // Fetch events - SHOW ERRORS
try {
  const eRes = await apiClient.get(`grievances/${grievanceId}/events/`);
  console.log('✅ Events:', eRes.data);  // ← ADD THIS
  setEvents(eRes.data);
} catch (err) {
  console.error('❌ Events error:', err.response?.status, err.response?.data);  // ← SHOW ERROR
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

  if (loading) return (
    <div className="grievance-detail-card" style={{padding: '2rem'}}>
      <div className="skeleton-line" style={{height: '40px', width: '120px', marginBottom: '1.5rem'}}></div>
      <div className="skeleton-grid">
        <div className="skeleton-card" style={{height: '70px'}}></div>
        <div className="skeleton-card" style={{height: '70px'}}></div>
        <div className="skeleton-card" style={{height: '100px', gridColumn: '1/-1'}}></div>
      </div>
    </div>
  );

  if (error) return <p className="error-message">{error}</p>;
  if (!grievance) return null;

  const normalizedStatus = 
    grievance.status === 'Pending at Triage' 
      ? 'Pending' 
      : grievance.status || 'Pending';

  // Handle both images and resolution_images
  const triageImages = grievance.images || [];
  const resolutionImages = grievance.resolution_images || [];

  return (
  <div className="grievance-detail-card">
    <button className="back-btn" onClick={() => navigate(-1)}>
      ← Back
    </button>
    
    <div className="grievance-detail-header">
      <span className={`status-badge status-${normalizedStatus.toLowerCase().replace(/ /g, '-').replace('at-triage', 'pending')}`}>
        {normalizedStatus}
      </span>
      <div className="grievance-id">ID: #{grievance.id}</div>
    </div>

    {/* SINGLE grievance-detail-section - All content streamlined */}
    <div className="grievance-detail-section">
      {/* Info Grid */}
      <div className="info-grid">
        <div className="info-card">
          <strong>Department:</strong> {grievance.category?.department?.name || grievance.department_name || 'Grievance Triage'}
        </div>
        <div className="info-card">
          <strong>Category:</strong> {grievance.category?.full_path || grievance.category_name || grievance.category?.name || 'In Review'}
        </div>
        <div className="info-card full">
          <strong>Description:</strong> {grievance.description}
        </div>
        <div className="info-card">
          <strong>Location:</strong> {grievance.location || 'N/A'}
        </div>
        <p style={{fontStyle: 'italic', marginTop: '1rem'}}>
          Submitted: {grievance.created_at ? new Date(grievance.created_at).toLocaleString('en-IN') : 'N/A'}
        </p>
      </div>

      {/* Images - Direct h5 + Gallery, no wrapper div */}
      {triageImages.length > 0 && (
        <>
          <h5>Submitted Images</h5>
          <PhotoGallery 
            photos={triageImages.map(img => ({
              image: img.image?.startsWith('http') ? img.image : `http://127.0.0.1:8000${img.image}`
            }))} 
          />
        </>
      )}

      {resolutionImages.length > 0 && (
        <>
          <h5>Resolution Images</h5>
          <PhotoGallery 
            photos={resolutionImages.map(img => ({
              image: img.image?.startsWith('http') ? img.image : `http://127.0.0.1:8000${img.image}`
            }))} 
          />
        </>
      )}
    </div>

    {/* Event Log - Single dedicated section */}
    <div className="grievance-detail-section">
      <h4>📋 Event Log ({events.length})</h4>
      {events.length === 0 ? (
        <div className="empty-state">
          📋 No events yet
          <p style={{margin: '0.5rem 0 0 0', fontSize: '0.9rem'}}>
            Activity appears when status changes
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="event-log-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Action</th>
                <th>Notes</th>
                <th>Documents</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id || ev.timestamp}>
                  <td data-label="Date">{ev.timestamp ? new Date(ev.timestamp).toLocaleDateString('en-IN') : ''}</td>
                  <td data-label="Action">
                    <span className={`status-badge status-${String(ev.action || '').toLowerCase().replace(/\s+/g, '-')}`}>
                      {ev.action}
                    </span>
                  </td>
<td data-label="Notes">
  {ev.notes && ev.notes !== 'Updated' ? ev.notes : '-'}
</td>

                  <td data-label="Documents">
                    <div className="doc-links">
                      {ev.action === 'SIGNED_DOCUMENT_UPLOADED' && ev.notes && (
                        <a href={`http://127.0.0.1:8000/media/${ev.notes}`} target="_blank" rel="noopener noreferrer" className="file-link doc-link">
                          📄
                        </a>
                      )}
                      {ev.action === 'RESOLUTION_IMAGE_UPLOADED' && ev.notes && (
                        <a href={`http://127.0.0.1:8000/media/${ev.notes}`} target="_blank" rel="noopener noreferrer" className="file-link image-link">
                          🖼️
                        </a>
                      )}
                      {!ev.notes || (ev.action !== 'SIGNED_DOCUMENT_UPLOADED' && ev.action !== 'RESOLUTION_IMAGE_UPLOADED') ? '-' : null}
                    </div>
                  </td>
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