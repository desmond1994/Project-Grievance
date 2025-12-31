import React, { useState, useEffect } from 'react';
import apiClient from '../apiClient';

const EngineeringDashboard = () => {
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const grievancesPerPage = 10;

  useEffect(() => {
    const fetchGrievances = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.get('grievances/', {
          params: {
            department: 'Engineering',
            page: currentPage,
            search: searchTerm,
          },
        });
        setGrievances(response.data.results || response.data);
      } catch (err) {
        setError("Could not load grievances. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchGrievances();
  }, [currentPage, searchTerm]);

  // Filter grievances based on search term
  const filteredGrievances = grievances.filter((grievance) =>
    grievance.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    grievance.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const indexOfLastGrievance = currentPage * grievancesPerPage;
  const indexOfFirstGrievance = indexOfLastGrievance - grievancesPerPage;
  const currentGrievances = filteredGrievances.slice(indexOfFirstGrievance, indexOfLastGrievance);
  const totalPages = Math.ceil(filteredGrievances.length / grievancesPerPage);

  if (loading) return <h2>Loading grievances...</h2>;
  if (error) return <h2 style={{ color: 'red' }}>{error}</h2>;

  return (
    <div>
      <h1>Engineering Department Grievances</h1>
      <input
        type="text"
        placeholder="Search grievances..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ marginBottom: '10px' }}
      />
      {currentGrievances.length > 0 ? (
        currentGrievances.map((grievance) => (
          <div key={grievance.id}>
            <h3>{grievance.title}</h3>
            <p>{grievance.description}</p>
          </div>
        ))
      ) : (
        <p>No grievances found.</p>
      )}
      <div>
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(currentPage - 1)}
        >
          Previous
        </button>
        <span> Page {currentPage} of {totalPages} </span>
        <button
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(currentPage + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default EngineeringDashboard;
