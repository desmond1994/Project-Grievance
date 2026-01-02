import React, { useState, useEffect } from 'react';
import apiClient from '../apiClient';

const HealthDashboard = () => {
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const grievancesPerPage = 10;

  const daysLeftNumber = (dueDate) => {
    if (!dueDate) return null;
    const now = new Date();
    const due = new Date(dueDate);
    return Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  };

  const daysLeftLabel = (dueDate) => {
    const d = daysLeftNumber(dueDate);
    if (d === null) return 'No SLA';
    return d > 0 ? `+${d}d` : `${d}d`;
  };

  const getStatusColor = (d) => {
    if (d === null) return 'secondary';
    if (d < 0) return 'danger';
    if (d <= 2) return 'warning';
    return 'success';
  };

  useEffect(() => {
    const fetchGrievances = async () => {
      try {
        setLoading(true);
        setError(null);

        // ✅ RULE: baseURL already has /api/ so relative endpoint only
        const response = await apiClient.get('grievances/', {
          params: {
            department: 'Health (Public Health)',
            page: currentPage,
            search: searchTerm,
          },
        });

        setGrievances(response.data.results || response.data);
      } catch (err) {
        setError('Could not load grievances. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchGrievances();
  }, [currentPage, searchTerm]);

  const filteredGrievances = grievances.filter((g) =>
    (g.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (g.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastGrievance = currentPage * grievancesPerPage;
  const indexOfFirstGrievance = indexOfLastGrievance - grievancesPerPage;
  const currentGrievances = filteredGrievances.slice(indexOfFirstGrievance, indexOfLastGrievance);
  const totalPages = Math.ceil(filteredGrievances.length / grievancesPerPage);

  const overdueCount = filteredGrievances.filter(g => {
    const d = daysLeftNumber(g.due_date);
    return d !== null && d < 0;
  }).length;

  if (loading) return <h2 className="text-center">Loading grievances...</h2>;
  if (error) return <h2 className="text-danger text-center">{error}</h2>;

  return (
    <div className="health-dashboard p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Health Department Dashboard</h1>
        <div className="overdue-count">
          <span className="badge bg-danger fs-6">
            Overdue: {overdueCount}
          </span>
        </div>
      </div>

      <input
        type="text"
        className="form-control mb-4 w-50"
        placeholder="Search by title or description..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div className="table-responsive">
        <table className="table table-hover">
          <thead className="table-dark">
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Description</th>
              <th>Status</th>
              <th>SLA</th>
              <th>Days Left</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {currentGrievances.length > 0 ? (
              currentGrievances.map((grievance) => {
                const d = daysLeftNumber(grievance.due_date);
                return (
                  <tr key={grievance.id} className="align-middle">
                    <td><strong>#{grievance.id}</strong></td>
                    <td>{grievance.title}</td>
                    <td className="text-truncate" style={{ maxWidth: '200px' }}>
                      {grievance.description}
                    </td>
                    <td>
                      <span className={`badge bg-${getStatusColor(d)}`}>
                        {grievance.status}
                      </span>
                    </td>
                    <td>{grievance.due_date ? new Date(grievance.due_date).toLocaleDateString() : 'No SLA'}</td>
                    <td>
                      <span className={`badge bg-${getStatusColor(d)}`}>
                        {daysLeftLabel(grievance.due_date)}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-primary btn-sm me-1">
                        Update Status
                      </button>
                      <button className="btn btn-outline-secondary btn-sm">
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" className="text-center py-4">
                  <h5>No Health grievances found</h5>
                  <p className="text-muted">Try adjusting your search or filters</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-4">
          <div>
            Showing {indexOfFirstGrievance + 1} to {Math.min(indexOfLastGrievance, filteredGrievances.length)}
            {' '}of {filteredGrievances.length} grievances
          </div>
          <div className="btn-group">
            <button
              className="btn btn-outline-primary"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Previous
            </button>
            <span className="btn btn-light disabled">
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="btn btn-outline-primary"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthDashboard;
