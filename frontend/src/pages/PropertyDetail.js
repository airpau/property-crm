import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import DocumentUpload from '../components/DocumentUpload';
import './PropertyDetail.css';

const API_URL = process.env.REACT_APP_API_URL || '';

function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [upcomingPayments, setUpcomingPayments] = useState([]);
  const [editingTenant, setEditingTenant] = useState(null);
  const [editForm, setEditForm] = useState({ email: '', phone: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProperty();
  }, [id]);

  const fetchProperty = async () => {
    try {
      console.log('Fetching property, API_URL:', API_URL);
      const response = await axios.get(`${API_URL}/api/properties/${id}`);
      console.log('Property loaded:', response.data);
      setProperty(response.data);
      setLoading(false);
      
      // Get actual rent payments for this month (pending or late only)
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      try {
        const paymentsRes = await axios.get(`${API_URL}/api/rent-payments`, {
          params: {
            property_id: id,
            start_date: startOfMonth.toISOString(),
            end_date: endOfMonth.toISOString()
          }
        });
        
        // Filter to pending/late payments only (not paid)
        const pendingPayments = (paymentsRes.data || [])
          .filter(p => p.status === 'pending' || p.status === 'late')
          .map(payment => ({
            tenantName: payment.tenants?.map(t => `${t.first_name} ${t.last_name}`).join(', ') || 'Unknown',
            amount: payment.amount_due,
            dueDay: new Date(payment.due_date).getDate(),
            room: payment.tenancy?.room_number,
            tenancyId: payment.tenancy_id,
            status: payment.status
          }))
          .sort((a, b) => a.dueDay - b.dueDay);
          
        setUpcomingPayments(pendingPayments);
      } catch (paymentErr) {
        console.error('Error fetching payments:', paymentErr);
        // Fallback to tenancy-based calculation if API fails
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
      }
    } catch (err) {
      setError('Failed to load property details');
      setLoading(false);
    }
  };

  const handleEditTenant = (tenant, e) => {
    e.stopPropagation();
    setEditingTenant(tenant);
    setEditForm({
      email: tenant.email || '',
      phone: tenant.phone || ''
    });
  };

  const handleSaveTenant = async () => {
    if (!editingTenant) return;
    
    try {
      setSaving(true);
      console.log('Saving tenant...', editingTenant.id);
      console.log('API_URL:', API_URL);
      console.log('Full URL:', `${API_URL}/api/tenants/${editingTenant.id}`);
      console.log('Data:', { email: editForm.email, phone: editForm.phone });
      
      const response = await axios.put(`${API_URL}/api/tenants/${editingTenant.id}`, {
        email: editForm.email,
        phone: editForm.phone
      });
      
      console.log('Save response:', response.data);
      
      // Refresh property data
      await fetchProperty();
      setEditingTenant(null);
      setSaving(false);
    } catch (err) {
      console.error('Error saving tenant:', err);
      console.error('Error response:', err.response);
      console.error('Error message:', err.message);
      alert('Failed to save changes. Check console for details.');
      setSaving(false);
    }
  };

  const handleCloseModal = () => {
    setEditingTenant(null);
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
        <div className="stat-card clickable" onClick={() => window.location.href = '/rent-tracker'}>
          <h4>Monthly Rental Income</h4>
          <div className="stat-value">£{totalMonthlyRent.toLocaleString()}</div>
          <span className="card-action">View in Rent Tracker →</span>
        </div>
        <div className="stat-card">
          <h4>Active Tenancies</h4>
          <div className="stat-value">{property.tenancies?.length || 0}</div>
        </div>
        <div className="stat-card clickable" onClick={() => window.location.href = '/tenants'}>
          <h4>Total Tenants</h4>
          <div className="stat-value">
            {property.tenancies?.reduce((sum, t) => sum + (t.tenants?.length || 0), 0) || 0}
          </div>
          <span className="card-action">View All Tenants →</span>
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
                      {tenancy.tenants?.length > 0 
                        ? tenancy.tenants.map(t => `${t.first_name} ${t.last_name}`).join(', ') + 
                          (tenancy.room_number ? ` - Room ${tenancy.room_number}` : '')
                        : (tenancy.room_number ? `Room ${tenancy.room_number}` : 'Unassigned')
                      }
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

                  {/* DEBUG BANNER - Remove after testing */}
                  <div style={{
                    background: '#ef4444',
                    color: 'white',
                    padding: '8px',
                    margin: '8px 0',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    DEBUG: Tenants found: {tenancy.tenants?.length || 0}
                  </div>

                  {/* Tenants in this tenancy - Clickable with Edit */}
                  {tenancy.tenants && tenancy.tenants.length > 0 ? (
                    <div className="tenant-list" style={{ border: '2px solid red' }}>
                      {console.log('Rendering tenant list with', tenancy.tenants.length, 'tenants')}
                      {tenancy.tenants.map(tenant => {
                        console.log('Rendering tenant:', tenant.id, tenant.first_name, tenant.last_name);
                        return (
                        <div 
                          key={tenant.id} 
                          className="tenant-item"
                          style={{ border: '1px solid blue', margin: '4px 0' }}
                        >
                          <div className="tenant-info" onClick={() => navigate(`/tenants?highlight=${tenant.id}`)}>
                            <span className="tenant-name">
                              {tenant.first_name} {tenant.last_name}
                              {tenant.is_primary && <span className="tenant-badge">PRIMARY</span>}
                            </span>
                            <span className="tenant-contact">
                              {tenant.phone || tenant.email || 'No contact'}
                            </span>
                          </div>
                          <button 
                            className="edit-tenant-btn"
                            onClick={(e) => handleEditTenant(tenant, e)}
                            style={{
                              padding: '8px 12px !important',
                              background: '#4f46e5 !important',
                              color: 'white !important',
                              border: '2px solid white !important',
                              borderRadius: '6px',
                              fontSize: '14px',
                              cursor: 'pointer',
                              marginLeft: '8px',
                              display: 'inline-block',
                              minWidth: '60px'
                            }}
                          >
                            ✏️ Edit
                          </button>
                        </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{
                      background: '#fbbf24',
                      color: '#92400e',
                      padding: '8px',
                      margin: '8px 0',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      DEBUG: No tenants in this tenancy
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
                <p>No upcoming payments - all rents paid for this month! 🎉</p>
              </div>
            ) : (
              <>
                <div className="payment-summary">
                  <span className="total-label">Outstanding This Month:</span>
                  <span className="total-amount">£{totalMonthlyRent.toLocaleString()}</span>
                </div>
                <div className="payment-list">
                  {upcomingPayments.map((payment, idx) => (
                    <div key={idx} className={`payment-item ${payment.status}`}>
                      <div className="payment-info">
                        <span className="payment-tenant">{payment.tenantName}</span>
                        {payment.room && <span className="payment-room">Room {payment.room}</span>}
                        {payment.status === 'late' && <span className="payment-late">⚠️ LATE</span>}
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

      {/* Edit Tenant Modal */}
      {editingTenant && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Edit {editingTenant.first_name} {editingTenant.last_name}</h3>
            
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                placeholder="tenant@email.com"
              />
            </div>
            
            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                placeholder="+44 7..."
              />
            </div>
            
            <div className="modal-actions">
              <button 
                className="btn-primary"
                onClick={handleSaveTenant}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button 
                className="btn-secondary"
                onClick={handleCloseModal}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PropertyDetail;
