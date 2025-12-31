import React, { useState, useEffect, useContext } from 'react';
import AdminGrievanceEditor from './AdminGrievanceEditor';
import { AuthContext } from '../context/AuthContext';
import apiClient from '../apiClient';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const ADMIN_STATUS_TABS = [
  'All',
  'Pending',
  'In Progress',
  'Resolved',
  'Rejected',
];


export default function AdminDashboard() {
  const { authToken } = useContext(AuthContext);
  const [grievances, setGrievances] = useState([]);
  const [activeStatus, setActiveStatus] = useState('All');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  


  useEffect(() => {
    if (!authToken) {
      navigate('/login', { replace: true });
    }
  }, [authToken, navigate]);

  const fetchGrievances = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('admin-grievances/');
      // Only exclude triage/in-review cases
      const filtered = res.data.filter(
        g =>
          g.category_name !== 'In Review' ||
          g.department_name !== 'Grievance Triage'
      );
      setGrievances(filtered);
      setError(null);
    } catch (error) {
      // Auto-logout on 401/403 errors
      if (
        error.response &&
        (error.response.status === 401 || error.response.status === 403)
      ) {
        navigate('/login', { replace: true });
        return;
      }
      setError('Failed to load grievances.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authToken) {
      fetchGrievances();
    }
    // eslint-disable-next-line
  }, [authToken]);

    const filteredGrievances =
      activeStatus === 'All'
      ? grievances
      : activeStatus === 'Pending'
      ? grievances.filter(
      (g) => g.status === 'Pending' || g.status === 'Reopened'
      )
      : grievances.filter((g) => g.status === activeStatus);

  const statusCounts = ADMIN_STATUS_TABS.reduce((acc, status) => {
if (status === 'All') {
acc[status] = grievances.length;
} else if (status === 'Pending') {
acc[status] = grievances.filter(
(g) => g.status === 'Pending' || g.status === 'Reopened'
).length;
} else {
acc[status] = grievances.filter((g) => g.status === status).length;
}
return acc;
}, {});


  const handleUpdateSuccess = () => {
    setEditingId(null);
    fetchGrievances();
  };

  // Category display utility: show full path and department if present
  const getCategoryDisplay = g => {
    if (g.category && g.category.full_path) return g.category.full_path;
    if (g.category_name) return g.category_name;
    if (g.category && g.category.name) return g.category.name;
    return g.category || 'N/A';
  };

  const getDepartmentDisplay = g => g.department_name || (g.category && g.category.department?.name) || 'N/A';

  if (!authToken) return null;
  if (loading) return <p>Loading grievances...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  if (editingId)
  return (
    <div>
      <button
        className="admin-back-btn"
        onClick={() => setEditingId(null)}
      >
        ← Back to Dashboard
      </button>
      <AdminGrievanceEditor
        grievanceId={editingId}
        onUpdateSuccess={handleUpdateSuccess}
      />
    </div>
  );


    return (
    <div className="admin-dashboard">
      <h2 className="admin-dashboard-title">Admin Dashboard</h2>

            <div className="admin-status-tabs">
        {ADMIN_STATUS_TABS.map((status) => (
          <button
            key={status}
            className={
              activeStatus === status
                ? 'admin-status-tab active'
                : 'admin-status-tab'
            }
            onClick={() => setActiveStatus(status)}
          >
            {status}{' '}
            <span className="admin-status-count">
              {statusCounts[status] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className="admin-dashboard-table-wrapper">
        <table className="admin-grievance-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Department</th>
              <th>Status</th>
              <th>Take Action</th>
            </tr>
          </thead>
          <tbody>
           {filteredGrievances.map((g) => (
            <tr key={g.id}>
              <td>{g.title}</td>
              <td>{getCategoryDisplay(g)}</td>
              <td>{getDepartmentDisplay(g)}</td>
              <td>
                <span
                  className={`status-pill status-${g.status.replace(/\s/g, '').toLowerCase()}`}
                >
                  {g.status}
                </span>
              </td>
              <td>
                <button
                  className="admin-open-btn"
                  onClick={() => setEditingId(g.id)}
                >
                  Open
                </button>
              </td>
            </tr>
          ))}
          {filteredGrievances.length === 0 && (
            <tr>
              <td colSpan="5" className="admin-empty-row">
                No grievances matching this status.
              </td>
            </tr>
          )}
        </tbody>
        </table>
      </div>
    </div>
  );

}
