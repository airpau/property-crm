import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import DocumentUpload from '../components/DocumentUpload';
import './PropertyDetail.css';

const API_URL = process.env.REACT_APP_API_URL || '';

function PropertyDetail() {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [upcomingPayments, setUpcomingPayments] = useState([]);

  useEffect(() => {
    fetchProperty();
  }, [id]);

  const fetchProperty = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/properties/${id}`);
      setProperty(response.data);
      setLoading(false);
      
      // Calculate upcoming payments from tenancies
      if (response.data.tenancies) {
        const payments = response.data.tenancies
          .filter(t => t.status === 'active')
          .flatMap(tenancy => {
            const tenants = tenancy.tenants || [];
            return tenants.map(tenant => ({
              tenantName: `${tenant.first_name} ${tenant.last_name}`,
              amount: tenancy.rent_amount,
              dueDay: tenancy.rent_due_day || 1,
              room: tenancy.room_number,
              tenancyId: tenancy.id
            }));
          })
          .sort((a, b) => a.dueDay - b.dueDay);
        setUpcomingPayments(payments);
      }
    } catch (err) {
      setError('Failed to load property details');
      setLoading(false);
    }
  };

  if (loading) return <div className="loading-spinner">Loading property details...</div>;
  if (error) return <div className="error-container"><h2>⚠️ {error}</h2></div>;
  if (!property) return <div className="error-container"><h2>Property not found</h2></div>;

  const totalMonthlyRent = upcomingPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  return (
    <div className="property-detail-container">
      {/* Header Section */}
      <div className="property-header">
        <h1>{property.name || property.address_line_1}</h1>
        <p className="property-address">
          {property.address_line_1}
          {property.address_line_2 && `, ${property.address_line_2}`}, 
          {property.city}, {property.postcode}
        </p>
        <div className="property-badges">
          <span className="badge">{property.property_type?.toUpperCase()}</span>
          {property.is_hmo && <span className="badge hmo">HMO Licensed</span>}
          {property.bedrooms && (
            <span className="badge">{property.bedrooms} Bedrooms</span>
          )}
          {property.bathrooms && (
            <span className="badge">{property.bathrooms} Bathrooms</span>
          )}
          <span className="badge">{property.status?.toUpperCase()}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="property-stats-grid">
        <div className="stat-card">
          <h4>Monthly Rental Income</h4>
          <div className="stat-value">£{totalMonthlyRent.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <h4>Active Tenancies</h4>
          <div className="stat-value">{property.tenancies?.length || 0}</div>
        </div>
        <div className="stat-card">
          <h4>Total Tenants</h4>
          <div className="stat-value">
            {property.tenancies?.reduce((sum, t) => sum + (t.tenants?.length || 0), 0) || 0}
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="property-content-grid">
        {/* Tenancies Section */}
        <div className="section-card">
          <h3>🏠 Active Tenancies</h3>
          <div className="tenancy-list">
            {property.tenancies?.filter(t => t.status === 'active').length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🏠</div>
                <p>No active tenancies</p>
              </div>
            ) : (
              property.tenancies?.filter(t => t.status === 'active').map(tenancy => (
                <div key={tenancy.id} className={`tenancy-card ${tenancy.status}`}>
                  <div className="tenancy-header">
                    <span className="tenancy-title">
                      {tenancy.tenancy_type?.toUpperCase()} - {tenancy.room_number ? `Room ${tenancy.room_number}` : 'Entire Property'}
                    </span>
                    <span className={`tenancy-status ${tenancy.status}`}>
                      {tenancy.status?.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="tenancy-details">
                    <div className="tenancy-detail">
                      <span className="tenancy-detail-label">Monthly Rent</span>
                      <span className="tenancy-detail-value amount">£{tenancy.rent_amount}</span>
                    </div>
                    <div className="tenancy-detail">
                      <span className="tenancy-detail-label">Rent Due Day</span>
                      <span className="tenancy-detail-value">
                        {tenancy.rent_due_day ? 
                          `${tenancy.rent_due_day}${['st','nd','rd'][tenancy.rent_due_day-1] || 'th'} of month` : 
                          'Not set'}
                      </span>
                    </div>
                    <div className="tenancy-detail">
                      <span className="tenancy-detail-label">Started</span>
                      <span className="tenancy-detail-value">
                        {new Date(tenancy.start_date).toLocaleDateString('en-GB', {
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    {tenancy.end_date && (
                      <div className="tenancy-detail">
                        <span className="tenancy-detail-label">Ends</span>
                        <span className="tenancy-detail-value">
                          {new Date(tenancy.end_date).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Tenants in this tenancy - Clickable */}
                  {tenancy.tenants && tenancy.tenants.length > 0 && (
                    <div className="tenant-list">
                      {tenancy.tenants.map(tenant => (
                        <div 
                          key={tenant.id} 
                          className="tenant-item clickable"
                          onClick={() => window.location.href = `/tenants?highlight=${tenant.id}`}
                        >
                          <span className="tenant-name">
                            {tenant.first_name} {tenant.last_name}
                            {tenant.is_primary && <span className="tenant-badge">PRIMARY</span>}
                          </span>
                          <span className="tenant-contact">
                            {tenant.phone || tenant.email || 'No contact'}
                          </span>
                          <span className="tenant-action">View →</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Document Upload for this tenancy */}
                  <DocumentUpload 
                    tenancyId={tenancy.id}
                    onUploadComplete={() => console.log('Document uploaded')}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Payments Section */}
        <div className="section-card">
          <h3>💰 Upcoming Rent Payments</h3>
          <div className="upcoming-payments">
            {upcomingPayments.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">💰</div>
                <p>No upcoming payments</p>
              </div>
            ) : (
              <>
                <div className="payment-summary">
                  <span className="total-label">Total Monthly Due:</span>
                  <span className="total-amount">£{totalMonthlyRent.toLocaleString()}</span>
                </div>
                <div className="payment-list">
                  {upcomingPayments.map((payment, idx) => (
                    <div key={idx} className="payment-item">
                      <div className="payment-info">
                        <span className="payment-tenant">{payment.tenantName}</span>
                        {payment.room && <span className="payment-room">Room {payment.room}</span>}
                      </div>
                      <div className="payment-amount">
                        <span className="amount">£{payment.amount}</span>
                        <span className="due-date">Due {payment.dueDay}{['st','nd','rd'][payment.dueDay-1] || 'th'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Compliance Section */}
        <div className="section-card" style={{ gridColumn: '1 / -1' }}>
          <h3>📋 Compliance & Certificates</h3>
          {(!property.compliance || property.compliance.length === 0) ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <p>No compliance certificates on file</p>
            </div>
          ) : (
            <div className="compliance-grid">
              {property.compliance.map(cert => {
                const expiryDate = new Date(cert.expiry_date);
                const today = new Date();
                const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
                const status = daysUntilExpiry < 0 ? 'expired' : daysUntilExpiry <= 30 ? 'expiring' : 'valid';
                
                return (
                  <div key={cert.id} className={`compliance-card ${status}`}>
                    <div className="compliance-header">
                      <span className="compliance-type">{cert.certificate_type}</span>
                      <span className={`compliance-status-badge ${status}`}>
                        {status === 'expired' ? 'EXPIRED' : daysUntilExpiry <= 30 ? `EXPIRES IN ${daysUntilExpiry} DAYS` : 'VALID'}
                      </span>
                    </div>
                    <div className="compliance-dates">
                      <p>Expires: <strong>{expiryDate.toLocaleDateString('en-GB')}</strong></p>
                      {cert.renewal_reminder_date && (
                        <p>Reminder: {new Date(cert.renewal_reminder_date).toLocaleDateString('en-GB')}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Link to="/properties" className="back-link">← Back to Properties</Link>
    </div>
  );
}

export default PropertyDetail;
