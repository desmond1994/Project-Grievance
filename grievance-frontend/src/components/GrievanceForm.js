import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import apiClient from '../apiClient';
import { useNavigate } from 'react-router-dom';
import Select, { components } from 'react-select';
import './GrievanceSelect.css';
import './GrievanceForm.css';

// Utility: Recursively flatten leaf subcategories
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

const GrievanceFormContent = () => {
  const { user } = useContext(AuthContext);

  const [description, setDescription] = useState('');
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState('');
  const [images, setImages] = useState([]);
  const [suggestedCategories, setSuggestedCategories] = useState([]);

  const navigate = useNavigate();

  // ✅ RULE: apiClient already has /api/ in baseURL → use relative endpoints only
  useEffect(() => {
    const fetchData = async () => {
      try {
        const catResponse = await apiClient.get('categories/');
        setCategories(catResponse.data || []);
      } catch (err) {
        setError('Failed to load form data. Please refresh the page.');
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      setSuggestedCategories([]);
      if (description.length < 8) return;

      try {
        const res = await apiClient.post('suggest-complaint-type/', { description });
        if (res.data && res.data.suggestions) {
          setSuggestedCategories(res.data.suggestions);
        }
      } catch (err) {
        setSuggestedCategories([]);
      }
    };
    fetchSuggestions();
  }, [description]);

  // Admin cannot submit
  if (user?.is_staff) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
        <h3>Admin users cannot submit grievances</h3>
        <p>Use the admin dashboard to manage grievances</p>
      </div>
    );
  }

  const leafCategories = getLeafCategories(categories);

  const relevantOptions =
    description.length < 8 || suggestedCategories.length === 0
      ? leafCategories.filter(
          (cat) =>
            cat.name.trim().toLowerCase() !== 'other' &&
            cat.name.trim().toLowerCase() !== 'in review'
        )
      : suggestedCategories
          .map((name) => leafCategories.find((cat) => cat.name === name))
          .filter((cat) => cat && cat.name.trim().toLowerCase() !== 'other');

  const selectOptions = [
    ...relevantOptions.map((cat) => ({
      value: cat.id,
      label: cat.full_path || cat.name,
      tooltip: `More info about '${cat.full_path || cat.name}'`,
    })),
    ...categories
      .filter((cat) => cat.name.trim().toLowerCase() === 'other')
      .map((cat) => ({
        value: cat.id,
        label: cat.full_path || cat.name,
        tooltip: 'Use this if none above matches your issue',
      })),
  ];

  const CustomOption = (props) => (
    <components.Option {...props}>
      <span className="complaint-select__chip">{props.data.label}</span>
    </components.Option>
  );

  const isReadyToSubmit = !!categoryId && !!description;

  const handleSubmit = async (e) => {
  e.preventDefault();

  if (!categoryId) {
    alert('Please select a category');
    return;
  }

  const formData = new FormData();
  formData.append('title', title || description.slice(0, 50));
  formData.append('description', description);
  formData.append('category_id', categoryId);
  formData.append('location', location);

  images.forEach((file) => formData.append('images', file));

  try {
    setLoading(true);
    setError(null);

    const token = localStorage.getItem('authToken');
    const API_BASE = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api';
    const response = await fetch(`${API_BASE}/grievances/`, {
      method: 'POST',
      headers: { 'Authorization': `Token ${token}` },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Submission failed');
    }

    const data = await response.json();
    alert('✅ Grievance #' + data.id + ' submitted successfully!');
    // Reset form
    setTitle(''); setDescription(''); setCategoryId(''); setLocation(''); setImages([]);
  } catch (err) {
    console.error('Submit error:', err);
    const errorMsg = err.message || 'Submission failed. Please try again.';
    if (errorMsg.includes('401') || errorMsg.includes('token') || errorMsg.includes('Authentication')) {
      localStorage.clear();
      navigate('/login', { replace: true });
      return;
    }
    setError(errorMsg);
  } finally {
    setLoading(false);
  }
};


  const handleImagesChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setImages((prevImages) => {
      const existingFiles = prevImages.map((f) => f.name + f.size);
      const uniqueNewFiles = newFiles.filter((f) => !existingFiles.includes(f.name + f.size));
      return [...prevImages, ...uniqueNewFiles].slice(0, 3);
    });
  };

  const removeImage = (idx) => setImages((prev) => prev.filter((_, i) => i !== idx));

  return (
    <div className="complaint-form-container">
      <h2>Submit a New Grievance</h2>

      <form onSubmit={handleSubmit}>
        <div className="complaint-form-group">
          <label className="complaint-form-label" htmlFor="description">
            Describe your complaint
          </label>
          <textarea
            id="description"
            className="complaint-form-textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
          />
        </div>

        <div className="complaint-form-group">
          <label className="complaint-form-label" htmlFor="category">
            Select the complaint type
          </label>
          <Select
            options={selectOptions}
            value={selectOptions.find((opt) => opt.value === Number(categoryId)) || null}
            onChange={(opt) => setCategoryId(Number(opt.value))}
            placeholder="Select a complaint type..."
            components={{ Option: CustomOption }}
            classNamePrefix="complaint-select"
          />
        </div>

        <div className="complaint-form-group">
          <label className="complaint-form-label" htmlFor="location">
            Location or Address
          </label>
          <input
            id="location"
            type="text"
            className="complaint-form-input"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., 123 Main St, near water tank"
          />
        </div>

        <div className="complaint-form-group">
          <label className="complaint-form-label" htmlFor="resolution_images">
            Upload images (optional, max 3)
          </label>
          <input
            type="file"
            id="resolution_images"
            accept="image/*"
            multiple
            onChange={handleImagesChange}
            disabled={images.length >= 3}
          />

          {images.length >= 3 && (
            <div style={{ color: 'red', marginTop: '4px' }}>
              You can upload up to 3 images only.
            </div>
          )}

          {images.length > 0 && (
            <div className="complaint-form-image-previews">
              {images.map((file, idx) => (
                <div className="complaint-form-image-preview" key={idx}>
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    style={{
                      width: '90px',
                      height: '80px',
                      objectFit: 'cover',
                      borderRadius: '5px',
                      marginRight: '12px',
                    }}
                  />
                  <div>
                    <div>
                      <strong>{file.name}</strong>
                    </div>
                    <div>Size: {(file.size / 1024).toFixed(1)} KB</div>
                  </div>
                  <button
                    type="button"
                    className="complaint-form-remove-btn"
                    onClick={() => removeImage(idx)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          className="complaint-form-submit-btn"
          disabled={loading || !isReadyToSubmit}
        >
          {loading ? 'Submitting...' : 'Submit Grievance'}
        </button>

        {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
      </form>
    </div>
  );
};

export default GrievanceFormContent;
