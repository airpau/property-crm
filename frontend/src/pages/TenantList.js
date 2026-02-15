import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TenantList.css';

const API_URL = process.env.REACT_APP_API_URL || '';

function TenantList() {
  const [tenants, setTenants] = useState([]);
  const [filteredTenants, setFilteredTenants] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchTenants();
  }, []);

  // Client-side filtering when search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTenants(tenants);
    } else {
      const searchLower = searchQuery.toLowerCase();
      const filtered = tenants.filter(tenant => {
        const fullName = `${tenant.first_name} ${tenant.last_name}`.toLowerCase();
        const propertyName = tenant.current_property?.toLowerCase() || '';
        return fullName.includes(searchLower) || propertyName.includes(searchLower);
      });
      setFilteredTenants(filtered);
    }
  }, [searchQuery, tenants]);

  const fetchTenants = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/tenants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Enrich tenant data with property and payment info
      const enrichedTenants = response.data.map(tenant => {
        const tenancies = tenant.tenancy_tenants || [];
        const activeTenancy = tenancies.find(tt => tt.tenancy?.status === 'active');
        
        return {
          ...tenant,
          current_property: activeTenancy?.tenancy?.property?.name || 'No property',
          property_id: activeTenancy?.tenancy?.property?.id,
          monthly_rent: activeTenancy?.tenancy?.rent_amount,
          rent_due_day: activeTenancy?.tenancy?.rent_due_day,
          tenancy_status: activeTenancy?.tenancy?.status || 'No active tenancy'
        };
      });
      
      setTenants(enrichedTenants);
      setFilteredTenants(enrichedTenants);
      setLoading(false);
    } catch (err) {
      setError('Failed to load tenants');
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const openTenantModal = (tenant) => {
    setSelectedTenant(tenant);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedTenant(null);
  };

  if (loading) return <div className="loading">Loading tenants...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="tenant-list-container">
      <div className="tenant-list-header">
        <h2>Tenant Directory</h2>
        <div className="tenant-count">
          {filteredTenants.length === tenants.length ? (
            <span>{tenants.length} tenant{tenants.length !== 1 ? 's' : ''}</span>
          ) : (
            <span>{filteredTenants.length} of {tenants.length} tenant{tenants.length !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>
      
      <div className="search-container">
        <input
          type="text"
          placeholder="Search tenants by name or property..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="search-input"
        />
        {searchQuery && (
          <button className="search-clear" onClick={clearSearch}>×</button>
        )}
      </div>
      
      {filteredTenants.length === 0 ? (
        <div className="empty-state">
          {searchQuery ? (
            <p>No tenants found matching "{searchQuery}"</p>
          ) : (
            <p>No tenants found.</p>
          )}
        </div>
      ) : (
        <div className="tenant-grid">
          {filteredTenants.map(tenant => (
            <div 
              key={tenant.id} 
              className="tenant-card"
              onClick={() => openTenantModal(tenant)}
            >
              <div className="tenant-card-header">
                <h3>{tenant.first_name} {tenant.last_name}</h3>
                <span className={`status-badge ${tenant.tenancy_status}`}>
                  {tenant.tenancy_status === 'active' ? 'Active' : 'No tenancy'}
                </span>
              </div>
              
              <div className="tenant-contact-info">
                {tenant.email && (
                  <p className="contact-item">
                    <span className="icon">📧</span> {tenant.email}
                  </p>
                )}
                {tenant.phone && (
                  <p className="contact-item">
                    <span className="icon">📱</span> {tenant.phone}
                  </p>
                )}
              </div>

              {tenant.tenancy_status === 'active' && (
                <div className="tenant-property-info">
                  <div className="info-row">
                    <span className="label">Property:</span>
                    <span className="value">{tenant.current_property}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Monthly Rent:</span>
                    <span className="value amount">£{tenant.monthly_rent}</span>
                  </div>
                  {tenant.rent_due_day && (
                    <div className="info-row">
                      <span className="label">Due:</span>
                      <span className="value">
                        {tenant.rent_due_day}{['st','nd','rd'][tenant.rent_due_day-1] || 'th'} of month
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tenant Detail Modal */}
      {showModal && selectedTenant && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedTenant.first_name} {selectedTenant.last_name}</h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="detail-section">
                <h4>Contact Information</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="label">Email:</span>
                    <span className="value">{selectedTenant.email || 'Not provided'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Phone:</span>
                    <span className="value">{selectedTenant.phone || 'Not provided'}</span>
                  </div>
                  {selectedTenant.phone_secondary && (
                    <div className="detail-item">
                      <span className="label">Alt Phone:</span>
                      <span className="value">{selectedTenant.phone_secondary}</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedTenant.tenancy_status === 'active' && (
                <div className="detail-section">
                  <h4>Current Tenancy</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="label">Property:</span>
                      <span className="value">{selectedTenant.current_property}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Monthly Rent:</span>
                      <span className="value highlight">£{selectedTenant.monthly_rent}</span>
                    </div>
                    {selectedTenant.rent_due_day && (
                      <div className="detail-item">
                        <span className="label">Rent Due:</span>
                        <span className="value">
                          {selectedTenant.rent_due_day}{['st','nd','rd'][selectedTenant.rent_due_day-1] || 'th'} of each month
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedTenant.employment_status && (
                <div className="detail-section">
                  <h4>Employment</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="label">Status:</span>
                      <span className="value">{selectedTenant.employment_status}</span>
                    </div>
                    {selectedTenant.employer_name && (
                      <div className="detail-item">
                        <span className="label">Employer:</span>
                        <span className="value">{selectedTenant.employer_name}</span>
                      </div>
                    )}
                    {selectedTenant.annual_income && (
                      <div className="detail-item">
                        <span className="label">Annual Income:</span>
                        <span className="value">£{selectedTenant.annual_income.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedTenant.notes && (
                <div className="detail-section">
                  <h4>Notes</h4>
                  <p className="notes">{selectedTenant.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TenantList;
