import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

function PropertyDetail() {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProperty();
  }, [id]);

  const fetchProperty = async () => {
    try {
      const response = await axios.get(`/api/properties/${id}`);
      setProperty(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load property details');
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading property details...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!property) return <div className="error">Property not found</div>;

  return (
    <div className="property-detail">
      <h2>{property.name || property.address_line_1}</h2>
      <p>{property.address_line_1}, {property.city}, {property.postcode}</p>
      
      <div className="detail-section">
        <h3>Active Tenancies</h3>
        {property.tenancies?.map(tenancy => (
          <div key={tenancy.id} className="tenancy-card">
            <p>Tenancy Type: {tenancy.tenancy_type}</p>
            <p>Rent: £{tenancy.rent_amount}/month</p>
            <p>Started: {new Date(tenancy.start_date).toLocaleDateString()}</p>
            <div className="tenants">
              {tenancy.tenants?.map(tenant => (
                <span key={tenant.id}>
                  {tenant.first_name} {tenant.last_name}
                  {tenant.is_primary && ' (Primary)'}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="detail-section">
        <h3>Compliance Certificates</h3>
        {property.compliance?.map(cert => (
          <div key={cert.id} className="compliance-item">
            <p>{cert.certificate_type} - Expires: {new Date(cert.expiry_date).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PropertyDetail;