import React, { useState, useEffect, useContext } from 'react';
import apiClient from '../apiClient';
import { AuthContext } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import '../App.css';

const STATUS_TABS = [
  { key: 'In Progress', label: 'In Progress' },
  { key: 'Pending', label: 'Submitted' },
  { key: 'Resolved', label: 'Resolved' },
  { key: 'Rejected', label: 'Rejected' },
];

const HomePage = () => {
  const { authToken, isStaff } = useContext(AuthContext);
  const navigate = useNavigate();

  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeStatus, setActiveStatus] = useState(STATUS_TABS[0].key);

  // ✅ Redirect admins after render (no conditional hooks issue)
  useEffect(() => {
    if (isStaff) {
      navigate('/admin', { replace: true });
    }
  }, [isStaff, navigate]);

  useEffect(() => {
    if (!authToken || isStaff) {
      setGrievances([]);
      setLoading(false);
      return;
    }

    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);
        const grievanceResponse = await apiClient.get('grievances/');
        setGrievances(grievanceResponse.data || []);
      } catch (err) {
        setError('Could not load your data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [authToken, isStaff]);

  // UI states (after hooks)
  if (isStaff) return <h2>Redirecting to admin...</h2>;
  if (!authToken) return <h2>Please log in to view grievances.</h2>;
  if (loading) return <h2>Loading grievances...</h2>;
  if (error) return <h2 style={{ color: 'red' }}>{error}</h2>;

  const statusCounts = STATUS_TABS.reduce((acc, tab) => {
    acc[tab.key] = grievances.filter((g) => {
      if (tab.key === 'Pending') {
        return g.status === 'Pending' || g.status === 'Pending at Triage';
      }
      return g.status === tab.key;
    }).length;
    return acc;
  }, {});

  const filteredGrievances = grievances.filter((g) => {
    if (activeStatus === 'Pending') {
      return g.status === 'Pending' || g.status === 'Pending at Triage';
    }
    return g.status === activeStatus;
  });

  return (
    <div>
      <div className="submit-grievance-btn-container">
        <Link to="/submit-grievance" className="submit-grievance-btn">
          Submit Grievance
        </Link>
      </div>

      <h1>Your Grievances</h1>

      <div style={{ display: 'flex', gap: '18px', margin: '18px 0', justifyContent: 'center', flexWrap: 'wrap' }}>
        {STATUS_TABS.map((tab) => (
          <div
            key={tab.key}
            className={activeStatus === tab.key ? 'status-box active' : 'status-box'}
            onClick={() => setActiveStatus(tab.key)}
            style={{
              cursor: 'pointer',
              backgroundColor: activeStatus === tab.key ? '#2b4450' : '#f3f5f7',
              color: activeStatus === tab.key ? '#fff' : '#222',
              borderRadius: '10px',
              minWidth: '180px',
              minHeight: '65px',
              boxShadow: '0 2px 10px rgba(60,80,110,0.09)',
              textAlign: 'center',
              fontSize: '1.08rem',
              fontWeight: 500,
              padding: '16px',
              border: activeStatus === tab.key ? '2px solid #85c1e9' : '1px solid #e2e2e2',
              transition: 'all 0.18s',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '1.2rem', letterSpacing: 0.2 }}>{tab.label}</div>
            <div style={{ fontSize: '0.88rem', marginTop: 8, color: activeStatus === tab.key ? '#ffd700' : '#2471a3' }}>
              {statusCounts[tab.key] || 0} Grievance{(statusCounts[tab.key] || 0) !== 1 ? 's' : ''}
            </div>
          </div>
        ))}
      </div>

      {filteredGrievances.length === 0 && (
        <p style={{ textAlign: 'center', color: '#666' }}>No grievances with status "{activeStatus}"</p>
      )}

      {filteredGrievances.map((grievance) => (
        <Link
          to={`/user/grievances/${grievance.id}`}
          key={grievance.id}
          className="grievance-container"
          style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
        >
          <h3>{grievance.category_name}</h3>
          <p>{grievance.description}</p>
        </Link>
      ))}
    </div>
  );
};

export default HomePage;
