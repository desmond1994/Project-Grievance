import React, { useState } from 'react';
import apiClient from '../apiClient';

function UpdateForm({ grievance, onUpdate, onCancel }) {
  const [title, setTitle] = useState(grievance.title);
  const [description, setDescription] = useState(grievance.description);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleUpdate = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiClient.put(`grievances/${grievance.id}/`, {
        title,
        description,
        status: grievance.status, // Preserves current status; makes status editable if desired
      });
      onUpdate();
    } catch (err) {
      if (err.response && err.response.data) {
        // Show detailed backend error if available
        const errorMessages = Object.entries(err.response.data)
          .map(([field, messages]) =>
            `${field}: ${Array.isArray(messages) ? messages.join(' ') : messages}`
          ).join(' | ');
        setError(errorMessages);
      } else {
        setError("There was an error updating the grievance!");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleUpdate}>
      <div>
        <label>Title: </label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
        />
      </div>
      <div style={{ marginTop: '10px' }}>
        <label>Description: </label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          required
        />
      </div>
      {error && <div style={{ marginTop: '10px', color: 'red' }}>{error}</div>}
      <button type="submit" style={{ marginTop: '10px' }} disabled={loading}>
        {loading ? 'Saving...' : 'Save'}
      </button>
      <button type="button" onClick={onCancel} style={{ marginLeft: '10px' }}>
        Cancel
      </button>
    </form>
  );
}

export default UpdateForm;
