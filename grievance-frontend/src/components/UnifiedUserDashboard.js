import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import apiClient from '../apiClient';
import './UnifiedUserDashboard.css';

const USER_STATUS_TABS = ['Submitted', 'In Progress', 'Resolved'];

export default function UnifiedUserDashboard() {
  const { authToken } = useContext(AuthContext);
  const navigate = useNavigate();
  const [myGrievances, setMyGrievances] = useState([]);
  const [activeStatus, setActiveStatus] = useState('Submitted');
  const [loading, setLoading] = useState(true);

 
  const handleViewDetails = (id) => {
    navigate(`/user/grievances/${id}`);
  };

  useEffect(() => {
    if (!authToken) return;
    setLoading(true);
    apiClient.get('grievances/')
      .then(res => {
        const data = res.data.results || res.data;
        setMyGrievances(data);
      })
      .catch(err => {
        console.error('Error fetching grievances:', err);
        // Add user-friendly toast/alert here if needed
      })
      .finally(() => setLoading(false));
  }, [authToken]);  // Add activeStatus if refetch needed

  const statusCounts = USER_STATUS_TABS.reduce((acc, tab) => {
    acc[tab] = myGrievances.filter(g => {
      if (tab === 'Submitted') return ['Pending', 'Pending at Triage', 'In Review'].includes(g.status);
      return g.status === tab;
    }).length;
    return acc;
  }, {});

  const filteredGrievances = myGrievances.filter(g => {
    if (activeStatus === 'Submitted') return ['Pending', 'Pending at Triage', 'In Review'].includes(g.status);
    return g.status === activeStatus;
  });

  if (loading) return <div className="loading">Loading your grievances...</div>;

  return (
    <div className="unified-dashboard">
      <div className="dashboard-header">
  {/* LEFT: Title */}
  <div className="header-left">
    <h2>Your Grievances</h2>
  </div>
  {/* RIGHT: Submit Button */}
  <div className="header-right">
    <Link to="/submit-grievance" className="btn-submit-grievance">
      ➕ Submit New Grievance
    </Link>
  </div>
</div>


      <div className="admin-stats-header mb-4">
        <div className="stat-item stat-inprogress">
          <span className="stat-number">{statusCounts['In Progress']}</span>
          <span className="stat-label">In Progress</span>
        </div>
        <div className="stat-item stat-submitted">
          <span className="stat-number">{statusCounts['Submitted']}</span>
          <span className="stat-label">Submitted</span>
        </div>
        <div className="stat-item stat-resolved">
          <span className="stat-number">{statusCounts['Resolved']}</span>
          <span className="stat-label">Resolved</span>
        </div>
      </div>

      <div className="status-tabs">
        {USER_STATUS_TABS.map(status => (
          <button
            key={status}
            className={`status-tab ${activeStatus === status ? 'active' : ''}`}
            onClick={() => setActiveStatus(status)}
          >
            {status} <span>({statusCounts[status] || 0})</span>
          </button>
        ))}
      </div>

      <div className="admin-dashboard-table-wrapper">
        <table className="admin-grievance-table table table-hover">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Status</th>
              <th>Department</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredGrievances.map(g => (
              <tr key={g.id} className="grievance-row">
                <td>#{g.id}</td>
                <td>{g.title}</td>
                <td>
                  <span className={`status-pill status-${g.status.toLowerCase().replace(/\s+/g, '')}`}>
                    {g.status}
                  </span>
                </td>
                <td>{g.department_name || 'In Review'}</td>
                <td>
  <button
  className="btn-details-simple"
  onClick={(e) => {
    e.stopPropagation();
    handleViewDetails(g.id);
  }}
>
  View Details
</button>
</td>

              </tr>
            ))}
            {filteredGrievances.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center py-4">
                  No grievances matching "{activeStatus}" status
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
