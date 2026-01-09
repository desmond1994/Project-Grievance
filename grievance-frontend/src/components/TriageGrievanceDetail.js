// src/components/TriageGrievanceDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../apiClient';
import './GrievanceDetail.css';
import PhotoGallery from './PhotoGallery';

export default function TriageGrievanceDetail() {
  const { id } = useParams();
  const grievanceId = id;
  const [grievance, setGrievance] = useState(null);
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

      <div className="grievance-detail-section">
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
          <div className="info-card">
            <strong>Submitter:</strong> {grievance.user_name || 'Citizen'}
          </div>
          <p style={{fontStyle: 'italic', marginTop: '1rem'}}>
            Submitted: {grievance.created_at ? new Date(grievance.created_at).toLocaleString('en-IN') : 'N/A'}
          </p>
        </div>

        {triageImages.length > 0 && (
          <div style={{marginTop: '1.5rem'}}>
            <h5>Submitted Images</h5>
            <PhotoGallery 
              photos={triageImages.map(img => ({
                image: img.image?.startsWith('http') ? img.image : `http://127.0.0.1:8000${img.image}`
              }))} 
            />
          </div>
        )}

        {resolutionImages.length > 0 && (
          <div style={{marginTop: '1.5rem'}}>
            <h5>Resolution Images</h5>
            <PhotoGallery 
              photos={resolutionImages.map(img => ({
                image: img.image?.startsWith('http') ? img.image : `http://127.0.0.1:8000${img.image}`
              }))} 
            />
          </div>
        )}
      </div>

      <div style={{textAlign: 'center', margin: '2rem 0'}}>
        <button className="print-btn" onClick={() => window.print()}>🖨️ Print</button>
      </div>

      
    </div>
  );
}
