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
  // ✅ ALL HOOKS FIRST - Before any early returns!
  const { user } = useContext(AuthContext);
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState('');
  const [images, setImages] = useState([]);
  const [suggestedCategories, setSuggestedCategories] = useState([]);
  const navigate = useNavigate();

  // ✅ ALL useEffect HOOKS - Before admin check!
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description]);

  const leafCategories = getLeafCategories(categories);

  // ✅ ADMIN CHECK - AFTER all hooks!
  if (user?.is_staff) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
        <h3>Admin users cannot submit grievances</h3>
        <p>Use the admin dashboard to manage grievances</p>
      </div>
    );
  }

  const relevantOptions = (
    description.length < 8 || suggestedCategories.length === 0
      ? leafCategories.filter(cat =>
          cat.name.trim().toLowerCase() !== 'other' &&
          cat.name.trim().toLowerCase() !== 'in review'
        )
      : suggestedCategories
          .map(name => categories.find(cat => cat.name === name))
          .filter(cat => cat && cat.name.trim().toLowerCase() !== 'other')
  );

  const selectOptions = [
    ...relevantOptions.map(cat => ({
      value: cat.id,
      label: cat.full_path || cat.name,
      tooltip: `More info about '${cat.full_path || cat.name}'`
    })),
    ...categories
      .filter(cat => cat.name.trim().toLowerCase() === 'other')
      .map(cat => ({
        value: cat.id,
        label: cat.full_path || cat.name,
        tooltip: 'Use this if none above matches your issue'
      }))
  ];

  const CustomOption = props => (
    <components.Option {...props}>
      <span className="complaint-select__chip">
        {props.data.label}
      </span>
    </components.Option>
  );

  const isReadyToSubmit = !!categoryId && !!description;

  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError(null);

  const formData = new FormData();
  formData.append('description', description);
  formData.append('category_id', String(categoryId));  // ✅ category_id!
  if (location) {
    formData.append('location', location);
  }
  images.forEach(file => formData.append('images', file));

  try {
    await apiClient.post('grievances/', formData);
    setImages([]);
    setDescription('');
    setCategoryId('');
    setLocation('');
    navigate('/');
  } catch (err) {
    // ... error handling
  } finally {
    setLoading(false);
  }
};

  const handleImagesChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setImages(prevImages => {
      const existingFiles = prevImages.map(f => f.name + f.size);
      const uniqueNewFiles = newFiles.filter(f => !existingFiles.includes(f.name + f.size));
      const mergedFiles = [...prevImages, ...uniqueNewFiles].slice(0, 3);
      return mergedFiles;
    });
  };

  const removeImage = idx => setImages(prev => prev.filter((_, i) => i !== idx));

  return (
    <div className="complaint-form-container">
      <h2>Submit a New Grievance</h2>
      <form onSubmit={handleSubmit}>
        <div className="complaint-form-group">
          <label className="complaint-form-label" htmlFor="description">Describe your complaint</label>
          <textarea
            id="description"
            className="complaint-form-textarea"
            value={description}
            onChange={e => setDescription(e.target.value)}
            required
          />
        </div>

        <div className="complaint-form-group">
          <label className="complaint-form-label" htmlFor="category">Select the complaint type</label>
          <Select
            options={selectOptions}
            value={selectOptions.find(opt => opt.value === categoryId) || null}
            onChange={opt => setCategoryId(opt.value)}
            placeholder="Select a complaint type..."
            components={{ Option: CustomOption }}
            classNamePrefix="complaint-select"
          />
        </div>

        <div className="complaint-form-group">
          <label className="complaint-form-label" htmlFor="location">Location or Address</label>
          <input
            id="location"
            type="text"
            className="complaint-form-input"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="e.g., 123 Main St, near water tank"
          />
        </div>

        <div className="complaint-form-group">
          <label className="complaint-form-label" htmlFor="resolution_images">Upload images (optional, max 3)</label>
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
                      marginRight: '12px'
                    }}
                  />
                  <div>
                    <div><strong>{file.name}</strong></div>
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
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </form>
    </div>
  );
};

export default GrievanceFormContent;
