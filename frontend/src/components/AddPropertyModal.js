import React, { useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '';

function AddPropertyModal({ onClose, onPropertyAdded }) {
  const [formData, setFormData] = useState({
    name: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    postcode: '',
    property_type: '',
    bedrooms: '',
    bathrooms: '',
    is_hmo: false,
    status: 'active'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/api/properties`, {
        ...formData,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null
      });
      onPropertyAdded(response.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create property');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add New Property</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="modal-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="name">Property Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Oak Street House"
            />
          </div>

          <div className="form-group">
            <label htmlFor="address_line_1">Address Line 1 *</label>
            <input
              type="text"
              id="address_line_1"
              name="address_line_1"
              value={formData.address_line_1}
              onChange={handleChange}
              placeholder="Street address"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="address_line_2">Address Line 2</label>
            <input
              type="text"
              id="address_line_2"
              name="address_line_2"
              value={formData.address_line_2}
              onChange={handleChange}
              placeholder="Apartment, suite, etc."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="city">City *</label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="City"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="postcode">Postcode *</label>
              <input
                type="text"
                id="postcode"
                name="postcode"
                value={formData.postcode}
                onChange={handleChange}
                placeholder="Postcode"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="property_type">Property Type</label>
              <select
                id="property_type"
                name="property_type"
                value={formData.property_type}
                onChange={handleChange}
              >
                <option value="">Select type...</option>
                <option value="house">House</option>
                <option value="flat">Flat/Apartment</option>
                <option value="bungalow">Bungalow</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="active">Active</option>
                <option value="void">Void</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="bedrooms">Bedrooms</label>
              <input
                type="number"
                id="bedrooms"
                name="bedrooms"
                value={formData.bedrooms}
                onChange={handleChange}
                placeholder="0"
                min="0"
              />
            </div>

            <div className="form-group">
              <label htmlFor="bathrooms">Bathrooms</label>
              <input
                type="number"
                id="bathrooms"
                name="bathrooms"
                value={formData.bathrooms}
                onChange={handleChange}
                placeholder="0"
                min="0"
                step="0.5"
              />
            </div>
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="is_hmo"
                checked={formData.is_hmo}
                onChange={handleChange}
              />
              <span>HMO Property</span>
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddPropertyModal;
