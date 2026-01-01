import React, { useEffect, useState } from 'react';
import apiClient from '../apiClient';
import './TriageDash.css';

function TriageDashboard() {
  const [grievances, setGrievances] = useState([]);
  const [categories, setCategories] = useState([]);
  const [assignLoading, setAssignLoading] = useState({});
  const [assignSuccess, setAssignSuccess] = useState({});
  const [assignError, setAssignError] = useState({});
  const [categoryAssign, setCategoryAssign] = useState({});
  const [overdueGrievances, setOverdueGrievances] = useState([]);

  // Recursively flatten all leaf categories (for selection)
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

  // Fetch triage grievances
  const fetchGrievances = () => {
    apiClient.get('triage-grievances/')
      .then(res => setGrievances(res.data))
      .catch(err => console.error("Error fetching grievances:", err));
  };

  // Fetch categories
  const fetchCategories = () => {
    apiClient.get('categories/')
      .then(res => setCategories(res.data || []))
      .catch(err => console.error("Error fetching categories:", err));
  };

  useEffect(() => {
    fetchGrievances();
    fetchCategories();
  }, []);

  useEffect(() => {
  apiClient.get('/api/grievances/overdue/').then(res => {
    setOverdueGrievances(res.data.results);
    console.log(`${res.data.count} overdue grievances`);
  }).catch(err => console.error('Overdue fetch failed', err));
}, []);


  // LEAF complaint categories only
  const leafCategories = getLeafCategories(categories).filter(
    c => c.name !== 'Other' && c.name !== 'In Review'
  );

  // When assigning, department is set by the selected category's backend mapping
  const handleAssign = (grievanceId, categoryId) => {
    setAssignLoading({ ...assignLoading, [grievanceId]: true });
    apiClient.post(`triage-grievances/${grievanceId}/assign/`, { category_id: categoryId })
      .then(() => {
        setAssignSuccess({ ...assignSuccess, [grievanceId]: true });
        setAssignLoading({ ...assignLoading, [grievanceId]: false });
        fetchGrievances(); // Refresh list after assign
      })
      .catch(() => {
        setAssignError({ ...assignError, [grievanceId]: 'Error updating grievance.' });
        setAssignLoading({ ...assignLoading, [grievanceId]: false });
      });
  };

    return (
    <div className="triage-dashboard">
      <h2 className="triage-title">Triage Dashboard</h2>

      {/* 🔥 SLA OVERDUE SECTION - ADD THIS */}
    <div className="overdue-alert">
      <h3>🚨 SLA Overdue ({overdueGrievances.length})</h3>
      {overdueGrievances.length > 0 ? (
        overdueGrievances.map(g => (
          <div key={g.id} className="overdue-card">
            <strong>{g.title}</strong> - Due: {new Date(g.due_date).toLocaleDateString()}
            <br/>{g.description.slice(0,100)}...
          </div>
        ))
      ) : (
        <p>No overdue grievances</p>
      )}
    </div>
    
      {grievances.length === 0 ? (
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
                <th>New Category</th>
                <th>Assign</th>
              </tr>
            </thead>
            <tbody>
  {grievances.map((g) => {
    // Calculate SLA status for triage (7 days)
    const daysLeft = g.due_date ? Math.floor((new Date(g.due_date) - new Date()) / (1000*60*60*24)) : 7;
    const slaStatus = daysLeft < 0 ? 'overdue' : daysLeft <= 3 ? 'warning' : 'healthy';
    
    return (
      <tr key={g.id} className={`triage-row ${slaStatus}`}>
        <td><strong>{g.id}</strong></td>
        <td className="triage-description">{g.description.slice(0,80)}...</td>
        <td>{g.user_name}</td>
        <td>{new Date(g.submitted_at).toLocaleDateString()}</td>
        <td>
          <select
            className="triage-select"
            value={categoryAssign[g.id] || ''}
            onChange={(e) => setCategoryAssign({ ...categoryAssign, [g.id]: e.target.value })}
          >
            <option value="" disabled>Select category</option>
            {leafCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.full_path || c.name}</option>
            ))}
          </select>
        </td>
        <td>
          {/* SLA Badge */}
          <span className={`sla-badge sla-${slaStatus}`}>
            {daysLeft > 0 ? `${daysLeft}d` : 'OVERDUE'} {slaStatus === 'healthy' ? '🟢' : slaStatus === 'warning' ? '🟡' : '🔴'}
          </span>
          <br/>
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
    );
  })}
</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default TriageDashboard;
