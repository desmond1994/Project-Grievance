import React, { useEffect, useState } from 'react';
import apiClient from '../apiClient';
import { useNavigate } from 'react-router-dom';
import './TriageDash.css';

function TriageDashboard() {
  const [grievances, setGrievances] = useState([]);
  const [categories, setCategories] = useState([]);
  const [assignLoading, setAssignLoading] = useState({});
  const [assignSuccess, setAssignSuccess] = useState({});
  const [assignError, setAssignError] = useState({});
  const [categoryAssign, setCategoryAssign] = useState({});
  const navigate = useNavigate();

  // Recursively flatten leaf categories
  function getLeafCategories(categories) {
    if (!categories) return [];
    let leaves = [];
    categories.forEach(cat => {
      if (cat.subcategories && cat.subcategories.length > 0) {
        leaves = leaves.concat(getLeafCategories(cat.subcategories));
      } else {
        leaves.push(cat);
      }
    });
    return leaves;
  }

  const fetchGrievances = async () => {
    try {
      const res = await apiClient.get('triage-grievances/');
      const data = res.data;
  const list = Array.isArray(data) ? data : (data?.results || []);
  setGrievances(list);

    } catch (err) {
      console.error('Error fetching grievances:', err);
      setGrievances([]);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get('categories/');
      const data = res.data;
const list = Array.isArray(data) ? data : (data?.results || []);
setCategories(list);

    } catch (err) {
      console.error('Error fetching categories:', err);
      setCategories([]);
    }
  };

  useEffect(() => {
    fetchGrievances();
    fetchCategories();
  }, []);


  // ✅ FIX: overdue should be first => sort ascending (most negative first)
 const computeDaysLeft = (dueDateStr) => {
  if (!dueDateStr) return null;
  const due = new Date(dueDateStr + 'T00:00:00');
  const now = new Date();
  return Math.ceil((due - now) / (1000 * 60 * 60 * 24));
};

const sortedGrievances = grievances.slice().sort((a, b) => {
  const daysA = computeDaysLeft(a.due_date) ?? 9999;
  const daysB = computeDaysLeft(b.due_date) ?? 9999;
  return daysA - daysB;
});


const SLABadge = ({ due_date }) => {
  const days = computeDaysLeft(due_date);
  if (days === null) return <span className="sla-badge ok">No SLA</span>;
  if (days <= 0) return <span className="sla-badge overdue">{days < 0 ? 'OVERDUE' : 'DUE TODAY'}</span>;
  if (days <= 3) return <span className="sla-badge warning">{days}d</span>;
  return <span className="sla-badge ok">{days}d</span>;
};


const leafCategories = getLeafCategories(categories).filter(
  c => c.name !== 'Other'
);


  const handleAssign = async (grievanceId, categoryId) => {
    if (!categoryId) return;

    setAssignLoading(prev => ({ ...prev, [grievanceId]: true }));
    setAssignSuccess(prev => ({ ...prev, [grievanceId]: false }));
    setAssignError(prev => ({ ...prev, [grievanceId]: null }));

    try {
     await apiClient.patch(`grievances/${grievanceId}/`, { category_id: categoryId });
      setAssignSuccess(prev => ({ ...prev, [grievanceId]: true }));
      await fetchGrievances();
    } catch (err) {
      setAssignError(prev => ({ ...prev, [grievanceId]: 'Error updating grievance.' }));
    } finally {
      setAssignLoading(prev => ({ ...prev, [grievanceId]: false }));
    }
  };

  const overdueCount = sortedGrievances.filter(g => (computeDaysLeft(g.due_date) ?? 9999) < 0).length;


  return (
    <div className="triage-dashboard">
      <h2 className="triage-title">Triage Dashboard</h2>

      <div className="sla-header">
        <h3 className="sla-title">
          SLA Overdue ({overdueCount})
        </h3>
        {/* Optional: shows API overdue list size too (helps debugging) */}
        {/* <small>Overdue API: {overdueGrievances.length}</small> */}
      </div>

      {sortedGrievances.length === 0 ? (
        <p className="triage-empty">No grievances pending triage.</p>
      ) : (
        <div className="triage-table-wrapper">
          <table className="triage-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Description</th>
                <th>Submitter</th>
                <th>Date</th>
                <th>SLA</th>
                <th>New Category</th>
                <th>Assign</th>
              </tr>
            </thead>
            <tbody>
              {sortedGrievances.map((g) => (
                <tr
  key={g.id}
  className={`triage-row ${(computeDaysLeft(g.due_date) ?? 9999) < 0 ? 'overdue-row' : ''}`}
>

                  <td><strong>{g.id}</strong></td>
                  <td className="triage-description">
                    <button
                      type="button"
                      className="triage-link-btn"
                      onClick={() => navigate(`/triage/grievances/${g.id}`)}
                    >
                      {(g.description || '').slice(0, 80)}...
                    </button>
                  </td>
                  <td>{g.user_name}</td>
                  <td>{g.created_at ? new Date(g.created_at).toLocaleDateString() : ''}</td>
                  <td><SLABadge due_date={g.due_date} /></td>
                  <td>
                    <select
                      className="triage-select"
                      value={categoryAssign[g.id] || ''}
                     onChange={(e) =>
  setCategoryAssign(prev => ({ ...prev, [g.id]: parseInt(e.target.value, 10) }))
}

                    >
                      <option value="" disabled>Select category</option>
                      {leafCategories.map((c) => (
                        <option key={c.id} value={c.id}>{c.full_path || c.name}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      className="triage-assign-btn"
                      onClick={() => handleAssign(g.id, categoryAssign[g.id])}
                      disabled={assignLoading[g.id] || !categoryAssign[g.id]}
                    >
                      {assignLoading[g.id] ? 'Assigning...' : 'Assign'}
                    </button>
                    {assignSuccess[g.id] && <span className="triage-status-success">✓ Assigned!</span>}
                    {assignError[g.id] && <span className="triage-status-error">✗ {assignError[g.id]}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default TriageDashboard;
