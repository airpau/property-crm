import React, { useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '';

const PROPERTY_CATEGORIES = [
  { value: 'btr', label: '🏠 Buy to Let (BTL)', description: 'Single tenancy, fixed monthly rent' },
  { value: 'hmo', label: '🏢 HMO (House in Multiple Occupation)', description: 'Multiple rooms/tenants, individual rents' },
  { value: 'sa', label: '✈️ Serviced Accommodation', description: 'Short-term bookings, nightly rates' },
  { value: 'commercial', label: '🏭 Commercial', description: 'Commercial property letting' }
];

function AddPropertyModal({ onClose, onPropertyAdded }) {
  const [formData, setFormData] = useState({
    name: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    postcode: '',
    property_category: 'btr',
    property_type: '',
    bedrooms: '',
    bathrooms: '',
    is_hmo: false,
    is_managed: false,
    management_fee_percent: 15,
    fixed_cleaning_fee: 0,
    property_manager_name: '',
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
        bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
        is_hmo: formData.property_category === 'hmo',
        management_fee_percent: formData.is_managed ? parseFloat(formData.management_fee_percent) : null,
        fixed_cleaning_fee: formData.is_managed ? parseFloat(formData.fixed_cleaning_fee) : null,
        property_manager_name: formData.is_managed ? formData.property_manager_name : null
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

          {/* Property Category */}
          <div className="form-section">
            <label style={{display: 'block', marginBottom: '12px', fontWeight: 600}}>Property Category *</label>
            <div className="category-cards" style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '16px'}}>
              {PROPERTY_CATEGORIES.map(cat => (
                <div
                  key={cat.value}
                  className={`category-card ${formData.property_category === cat.value ? 'selected' : ''}`}
                  onClick={() => handleChange({ target: { name: 'property_category', value: cat.value } })}
                  style={{
                    padding: '12px',
                    border: `2px solid ${formData.property_category === cat.value ? '#4f46e5' : '#e5e7eb'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: formData.property_category === cat.value ? '#eef2ff' : 'white'
                  }}
                >
                  <div style={{fontSize: '20px', marginBottom: '4px'}}>{cat.label.split(' ')[0]}</div>
                  <div style={{fontSize: '13px', fontWeight: 600}}>{cat.label.split(' ').slice(1).join(' ')}</div>
                  <div style={{fontSize: '11px', color: '#6b7280', marginTop: '4px'}}>{cat.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Management Settings */}
          <div className="form-section" style={{background: '#f9fafb', padding: '12px', borderRadius: '8px', marginBottom: '16px'}}>
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="is_managed"
                  checked={formData.is_managed}
                  onChange={handleChange}
                />
                <span style={{fontWeight: 600}}>Managed by Agent/Property Manager</span>
              </label>
            </div>
            
            {formData.is_managed && (
              <div style={{marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb'}}>
                <div className="form-group">
                  <label htmlFor="property_manager_name">Property Manager Name</label>
                  <input
                    type="text"
                    id="property_manager_name"
                    name="property_manager_name"
                    value={formData.property_manager_name}
                    onChange={handleChange}
                    placeholder="e.g., Tom at Revolve"
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="management_fee_percent">Management Fee (%)</label>
                    <input
                      type="number"
                      id="management_fee_percent"
                      name="management_fee_percent"
                      value={formData.management_fee_percent}
                      onChange={handleChange}
                      placeholder="15"
                      min="0"
                      max="100"
                      step="0.1"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="fixed_cleaning_fee">Fixed Cleaning Fee (£/$)</label>
                    <input
                      type="number"
                      id="fixed_cleaning_fee"
                      name="fixed_cleaning_fee"
                      value={formData.fixed_cleaning_fee}
                      onChange={handleChange}
                      placeholder="0"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                
                {formData.property_category === 'sa' && (
                  <div style={{background: '#dbeafe', padding: '10px', borderRadius: '6px', fontSize: '13px', color: '#1e40af'}}>
                    <p style={{margin: '0'}}><strong>SA PM Rules:</strong> Cleaning fee + % of net per booking</p>
                  </div>
                )}
              </div>
            )}
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
