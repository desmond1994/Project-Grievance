import React, { useState, useEffect, useContext, useCallback } from 'react';
import AdminGrievanceEditor from './AdminGrievanceEditor';
import { AuthContext } from '../context/AuthContext';
import apiClient from '../apiClient';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const ADMIN_STATUS_TABS = [
  'All', 'Pending', 'In Progress', 'Resolved', 'Rejected',
  'Policy Decision', 'Pending Approval'
];

const daysLeft = (dueDate) => {
  if (!dueDate) return 'No SLA';
  const now = new Date();
  const due = new Date(dueDate);
  const diff = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  return diff > 0 ? `+${diff}d` : `${diff}d`;
};

const getStatusColor = (days) => {
  if (!days || days === 'No SLA') return 'secondary';
  const numDays = parseInt(days.toString().replace(/[+-]/g, ''), 10);
  if (numDays < 0) return 'danger';
  if (numDays <= 2) return 'warning';
  return 'success';
};

export default function AdminDashboard() {
  const { authToken } = useContext(AuthContext);

  const [grievances, setGrievances] = useState([]);
  const [activeStatus, setActiveStatus] = useState('All');
  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (!authToken) navigate('/login', { replace: true });
  }, [authToken, navigate]);

  const fetchGrievances = useCallback(async () => {
    try {
      setLoading(true);

      // const endpoint = isTopAuthority ? 'admin-grievances/' : 'grievances/'; // ✅ relative only
      const endpoint = 'grievances/';

      const res = await apiClient.get(endpoint);

const data = res.data;
const list = Array.isArray(data) ? data : (data?.results || []);
setGrievances(list);


      
      setError(null);
    } catch (err) {
      const status = err?.response?.status;
      console.error('Fetch grievances error:', status, err?.response?.data);

      if (status === 401 || status === 403) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        navigate('/login', { replace: true });
        return;
      }

      setError(`API Error ${status || '???'}`);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (authToken) fetchGrievances();
  }, [authToken, fetchGrievances]);

  const grantExtension = async (grievanceId) => {
    const grievance = grievances.find(g => g.id === grievanceId);
    if (!window.confirm(`Grant 14-day extension for "${grievance?.title || 'grievance'}?"`)) return;

    try {
      // ✅ relative only
      await apiClient.post(`admin-grievances/${grievanceId}/grant_extension/`);
      alert('✅ Extension granted! SLA updated.');
      fetchGrievances();
    } catch (err) {
      console.error('Extension error:', err?.response?.data || err.message);
      alert(`❌ Failed: ${err?.response?.data?.error || 'Server error'}`);
    }
  };

  const filteredGrievances =
    activeStatus === 'All'
      ? grievances
      : activeStatus === 'Pending'
        ? grievances.filter(g => g.status === 'Pending' || g.status === 'Reopened')
        : grievances.filter(g => g.status === activeStatus);

  const statusCounts = ADMIN_STATUS_TABS.reduce((acc, status) => {
    if (status === 'All') {
      acc[status] = grievances.length;
    } else if (status === 'Pending') {
      acc[status] = grievances.filter(g => g.status === 'Pending' || g.status === 'Reopened').length;
    } else {
      acc[status] = grievances.filter(g => g.status === status).length;
    }
    return acc;
  }, {});

  const handleUpdateSuccess = () => {
    setEditingId(null);
    fetchGrievances();
  };

  const getCategoryDisplay = g => {
    if (g.category?.full_path) return g.category.full_path;
    if (g.category?.name) return g.category.name;
    return g.category || 'N/A';
  };

  const getDepartmentDisplay = g =>
  (g.category?.department?.name) || 'N/A';


  if (!authToken) return null;
  if (loading) return <div className="loading">Loading grievances...</div>;
  if (error) return <div className="error">{error}</div>;

  if (editingId) {
    return (
      <div className="admin-editor-container">
        <button className="admin-back-btn" onClick={() => setEditingId(null)}>
          ← Back to Dashboard
        </button>
        <AdminGrievanceEditor
          grievanceId={editingId}
          onUpdateSuccess={handleUpdateSuccess}
        />
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <h2 className="admin-dashboard-title">
        Admin Dashboard ({grievances.length} total)
      </h2>

      <div className="admin-stats-header">
        <div className="stat-item stat-overdue">
          <span className="stat-number">
            {grievances.filter(g => {
              const d = daysLeft(g.due_date);
              return d !== 'No SLA' && parseInt(d.replace(/[+-]/g, ''), 10) < 0;
            }).length}
          </span>
          <span className="stat-label">Overdue</span>
        </div>

        <div className="stat-item stat-pending">
          <span className="stat-number">{statusCounts.Pending || 0}</span>
          <span className="stat-label">Pending</span>
        </div>

        <div className="stat-item stat-total">
          <span className="stat-number">{grievances.length}</span>
          <span className="stat-label">Total</span>
        </div>
      </div>

      <div className="admin-status-tabs">
        {ADMIN_STATUS_TABS.map((status) => (
          <button
            key={status}
            className={`admin-status-tab ${activeStatus === status ? 'active' : ''}`}
            onClick={() => setActiveStatus(status)}
          >
            {status}
            <span className="admin-status-count">({statusCounts[status] ?? 0})</span>
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
              <th>SLA</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredGrievances.map((g) => (
              <tr
                key={g.id}
                className={`status-row status-${g.status.replace(/\s/g, '').toLowerCase()}`}
              >
                <td className="grievance-title">{g.title}</td>
                <td>{getCategoryDisplay(g)}</td>
                <td>{getDepartmentDisplay(g)}</td>
                <td>
                  <span className={`status-pill status-${g.status.replace(/\s/g, '').toLowerCase()}`}>
                    {g.status}
                  </span>
                </td>
                <td>
                  <span className={`sla-badge bg-${getStatusColor(daysLeft(g.due_date))}`}>
                    {daysLeft(g.due_date)}
                  </span>
                </td>
                <td className="admin-actions">
                  {['Policy Decision', 'Pending Approval'].includes(g.status) && (
                    <button
                      className="admin-extension-btn"
                      onClick={() => grantExtension(g.id)}
                      title="Grant 14-day SLA extension"
                    >
                      +14d
                    </button>
                  )}
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
                <td colSpan="6" className="admin-empty-row">
                  No grievances matching "{activeStatus}" status.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
