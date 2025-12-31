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
              {grievances.map((g) => (
                <tr key={g.id}>
                  <td>{g.id}</td>
                  <td className="triage-description">{g.description}</td>
                  <td>{g.user_name}</td>
                  <td>{g.submitted_at}</td>
                  <td>
                    <select
                      className="triage-select"
                      value={categoryAssign[g.id] || ''}
                      onChange={(e) =>
                        setCategoryAssign({ ...categoryAssign, [g.id]: e.target.value })
                      }
                    >
                      <option value="" disabled>
                        Select category
                      </option>
                      {leafCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.full_path || c.name}
                        </option>
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
                    {assignSuccess[g.id] && (
                      <span className="triage-status-success">Assigned!</span>
                    )}
                    {assignError[g.id] && (
                      <span className="triage-status-error">{assignError[g.id]}</span>
                    )}
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
