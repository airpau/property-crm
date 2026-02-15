import React, { useState } from 'react';
import axios from 'axios';
import './AddProperty.css';

const API_URL = process.env.REACT_APP_API_URL || '';

const PROPERTY_CATEGORIES = [
  { value: 'btr', label: '🏠 Buy to Let (BTL)', description: 'Single tenancy, fixed monthly rent' },
  { value: 'hmo', label: '🏢 HMO (House in Multiple Occupation)', description: 'Multiple rooms/tenants, individual rents' },
  { value: 'sa', label: '✈️ Serviced Accommodation', description: 'Short-term bookings, nightly rates' },
  { value: 'commercial', label: '🏭 Commercial', description: 'Commercial property letting' }
];

const MANAGEMENT_TYPES = [
  { value: 'self', label: 'Self-Managed', description: 'You handle everything directly' },
  { value: 'managed', label: 'Managed by Agent', description: 'Property manager handles day-to-day' }
];

function AddProperty({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1);
  
  const [property, setProperty] = useState({
    // Basic info
    name: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    postcode: '',
    
    // Property details
    property_category: 'btr',
    property_type: 'flat',
    bedrooms: 1,
    bathrooms: 1,
    is_hmo: false,
    hmo_license_number: '',
    
    // Management
    is_managed: false,
    management_fee_percent: 15,
    fixed_cleaning_fee: 0,
    property_manager_name: '',
    
    // Financial defaults (can be overridden per tenancy/booking)
    default_rent_amount: 0,
    
    // Status
    status: 'active',
    notes: ''
  });
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProperty({
      ...property,
      [name]: type === 'checkbox' ? checked : 
              type === 'number' ? parseFloat(value) || 0 : value
    });
  };
  
  const handleCategoryChange = (e) => {
    const category = e.target.value;
    setProperty({
      ...property,
      property_category: category,
      is_hmo: category === 'hmo',
      // Reset management defaults for SA
      management_fee_percent: category === 'sa' ? 15 : 10,
      fixed_cleaning_fee: category === 'sa' ? 0 : 0
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      const propertyData = {
        name: property.name || property.address_line_1,
        address_line_1: property.address_line_1,
        address_line_2: property.address_line_2,
        city: property.city,
        postcode: property.postcode,
        property_category: property.property_category,
        property_type: property.property_type,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        is_hmo: property.is_hmo,
        hmo_license_number: property.hmo_license_number,
        is_managed: property.is_managed,
        management_fee_percent: property.is_managed ? property.management_fee_percent : null,
        fixed_cleaning_fee: property.is_managed ? property.fixed_cleaning_fee : null,
        property_manager_name: property.is_managed ? property.property_manager_name : null,
        status: property.status,
        notes: property.notes
      };
      
      const response = await axios.post(
        `${API_URL}/api/properties`,
        propertyData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setLoading(false);
      onSuccess(response.data);
      onClose();
    } catch (err) {
      console.error('Error creating property:', err);
      setError(err.response?.data?.error || 'Failed to create property');
      setLoading(false);
    }
  };
  
  const renderStep1 = () => (
    <>
      <div className="form-section">
        <h3>Property Address</h3>
        
        <div className="form-group">
          <label>Property Name (optional)</label>
          <input
            type="text"
            name="name"
            value={property.name}
            onChange={handleChange}
            placeholder="e.g., 2 Mill Farm House"
          />
        </div>
        
        <div className="form-group">
          <label>Address Line 1 *</label>
          <input
            type="text"
            name="address_line_1"
            value={property.address_line_1}
            onChange={handleChange}
            placeholder="e.g., 85 Westbourne Terrace"
            required
          />
        </div>
        
        <div className="form-group">
          <label>Address Line 2</label>
          <input
            type="text"
            name="address_line_2"
            value={property.address_line_2}
            onChange={handleChange}
            placeholder="e.g., Flat 6"
          />
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>City *</label>
            <input
              type="text"
              name="city"
              value={property.city}
              onChange={handleChange}
              placeholder="e.g., London"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Postcode *</label>
            <input
              type="text"
              name="postcode"
              value={property.postcode}
              onChange={handleChange}
              placeholder="e.g., W2 6QS"
              required
            />
          </div>
        </div>
      </div>
      
      <div className="form-section">
        <h3>Property Category *</h3>
        <div className="category-cards">
          {PROPERTY_CATEGORIES.map(cat => (
            <div
              key={cat.value}
              className={`category-card ${property.property_category === cat.value ? 'selected' : ''}`}
              onClick={() => handleCategoryChange({ target: { value: cat.value } })}
            >
              <div className="category-icon">{cat.label.split(' ')[0]}</div>
              <div className="category-label">{cat.label.split(' ').slice(1).join(' ')}</div>
              <div className="category-desc">{cat.description}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
  
  const renderStep2 = () => (
    <>
      <div className="form-section">
        <h3>Property Details</h3>
        
        <div className="form-row">
          <div className="form-group">
            <label>Property Type</label>
            <select name="property_type" value={property.property_type} onChange={handleChange}>
              <option value="house">House</option>
              <option value="flat">Flat/Apartment</option>
              <option value="bungalow">Bungalow</option>
              <option value="studio">Studio</option>
              <option value="villa">Villa</option>
              <option value="commercial">Commercial</option>
            </select>
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>Bedrooms</label>
            <input
              type="number"
              name="bedrooms"
              value={property.bedrooms}
              onChange={handleChange}
              min="0"
            />
          </div>
          
          <div className="form-group">
            <label>Bathrooms</label>
            <input
              type="number"
              name="bathrooms"
              value={property.bathrooms}
              onChange={handleChange}
              min="0"
              step="0.5"
            />
          </div>
        </div>
        
        {property.property_category === 'hmo' && (
          <div className="form-group">
            <label>HMO License Number</label>
            <input
              type="text"
              name="hmo_license_number"
              value={property.hmo_license_number}
              onChange={handleChange}
              placeholder="e.g., LN123456"
            />
          </div>
        )}
      </div>
      
      <div className="form-section">
        <h3>Management</h3>
        
        <div className="management-cards">
          {MANAGEMENT_TYPES.map(type => (
            <div
              key={type.value}
              className={`management-card ${(type.value === 'managed') === property.is_managed ? 'selected' : ''}`}
              onClick={() => setProperty({ ...property, is_managed: type.value === 'managed' })}
            >
              <div className="management-label">{type.label}</div>
              <div className="management-desc">{type.description}</div>
            </div>
          ))}
        </div>
        
        {property.is_managed && (
          <div className="management-details">
            <div className="form-group">
              <label>Property Manager Name</label>
              <input
                type="text"
                name="property_manager_name"
                value={property.property_manager_name}
                onChange={handleChange}
                placeholder="e.g., Tom at Revolve"
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Management Fee (%)</label>
                <input
                  type="number"
                  name="management_fee_percent"
                  value={property.management_fee_percent}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>
              
              <div className="form-group">
                <label>Fixed Cleaning Fee (£ or $)</label>
                <input
                  type="number"
                  name="fixed_cleaning_fee"
                  value={property.fixed_cleaning_fee}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                />
                <small className="hint">Per booking for SA, or per clean</small>
              </div>
            </div>
            
            {property.property_category === 'sa' && (
              <div className="info-box">
                <p><strong>Serviced Accommodation PM Rules:</strong></p>
                <ul>
                  <li>Cleaning fee deducted from each booking</li>
                  <li>PM % calculated on (Net Revenue - Cleaning)</li>
                  <li>Auto-tracked in PM payment summary</li>
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content add-property-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add New Property</h2>
          <div className="step-indicator">
            <span className={step === 1 ? 'active' : ''}>1</span>
            <span className="separator">→</span>
            <span className={step === 2 ? 'active' : ''}>2</span>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {step === 1 ? renderStep1() : renderStep2()}
          
          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}
          
          <div className="modal-actions">
            {step > 1 && (
              <button type="button" className="btn-secondary" onClick={() => setStep(1)}>
                ← Back
              </button>
            )}
            
            {step < 2 ? (
              <button type="button" className="btn-primary" onClick={() => setStep(2)}>
                Next →
              </button>
            ) : (
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Creating...' : 'Create Property'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddProperty;
