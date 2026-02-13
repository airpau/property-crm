import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import AddPropertyModal from '../components/AddPropertyModal';

const API_URL = process.env.REACT_APP_API_URL || '';

function PropertyList() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/properties`);
      setProperties(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load properties');
      setLoading(false);
    }
  };

  const handlePropertyAdded = (newProperty) => {
    setProperties(prev => [...prev, newProperty]);
  };

  if (loading) return <div className="loading">Loading properties...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="property-list">
      <div className="property-list-header">
        <h2>Your Properties</h2>
        <button className="add-property-btn" onClick={() => setShowModal(true)}>+ Add Property</button>
      </div>
      
      {properties.length === 0 ? (
        <div className="empty-state">
          <p>No properties found. Add your first property to get started.</p>
        </div>
      ) : (
        <div className="property-grid">
          {properties.map(property => (
            <Link 
              to={`/properties/${property.id}`} 
              key={property.id} 
              className="property-card"
            >
              <div className="property-card-header">
                <h3 className="property-name">
                  {property.name || property.address_line_1}
                </h3>
                <span className={`property-status status-${property.status}`}>
                  {property.status}
                </span>
              </div>
              
              <p className="property-address">
                {property.address_line_1}, {property.city}, {property.postcode}
              </p>
              
              <div className="property-details">
                <div className="property-detail">
                  <span>🏠</span> {property.property_type || 'Property'}
                </div>
                <div className="property-detail">
                  <span>🛏️</span> {property.bedrooms !== null && property.bedrooms !== undefined ? property.bedrooms : (property.total_rooms || '-')} beds
                </div>
                <div className="property-detail">
                  <span>🚿</span> {property.bathrooms !== null && property.bathrooms !== undefined ? property.bathrooms : '-'} baths
                </div>
                {property.is_hmo && (
                  <div className="property-detail">
                    <span>🏢</span> HMO
                  </div>
                )}
              </div>
              
              <div className="property-stats">
                <div className="property-stat">
                  <div className="stat-number">{property.active_tenancies || 0}</div>
                  <div className="stat-label">Active Tenancies</div>
                </div>
                <div className="property-stat">
                  <div className="stat-number">{property.active_tenants || 0}</div>
                  <div className="stat-label">Tenants</div>
                </div>
                <div className="property-stat">
                  <div className="stat-number">£{property.monthly_income?.toLocaleString() || 0}</div>
                  <div className="stat-label">Monthly Income</div>
                </div>
                <div className="property-stat">
                  <div className="stat-number">
                    {property.expiring_certs || 0}
                  </div>
                  <div className="stat-label">Expiring Certs</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      
      {showModal && (
        <AddPropertyModal
          onClose={() => setShowModal(false)}
          onPropertyAdded={handlePropertyAdded}
        />
      )}
    </div>
  );
}

export default PropertyList;