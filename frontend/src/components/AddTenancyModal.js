import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '';

function AddTenancyModal({ onClose, onTenancyAdded }) {
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [filteredTenants, setFilteredTenants] = useState([]);
  const [tenantSearch, setTenantSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);

  const [formData, setFormData] = useState({
    property_id: '',
    tenant_id: '',
    tenancy_type: 'ast',
    rent_amount: '',
    rent_due_day: '1',
    room_number: '',
    start_date: '',
    end_date: '',
    deposit_amount: '',
    is_primary: true
  });

  // Fetch properties and tenants on mount
  useEffect(() => {
    fetchData();
  }, []);

  // Filter tenants based on search
  useEffect(() => {
    if (tenantSearch.trim()) {
      const searchLower = tenantSearch.toLowerCase();
      const filtered = tenants.filter(t => 
        `${t.first_name} ${t.last_name}`.toLowerCase().includes(searchLower) ||
        (t.email && t.email.toLowerCase().includes(searchLower))
      );
      setFilteredTenants(filtered);
    } else {
      setFilteredTenants(tenants);
    }
  }, [tenantSearch, tenants]);

  const fetchData = async () => {
    try {
      setDataLoading(true);
      const [propertiesRes, tenantsRes] = await Promise.all([
        axios.get(`${API_URL}/api/properties`),
        axios.get(`${API_URL}/api/tenants`)
      ]);
      setProperties(propertiesRes.data);
      setTenants(tenantsRes.data);
      setFilteredTenants(tenantsRes.data);
      setDataLoading(false);
    } catch (err) {
      setError('Failed to load data');
      setDataLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleTenantSearch = (e) => {
    setTenantSearch(e.target.value);
  };

  const handleTenantSelect = (tenantId) => {
    setFormData(prev => ({ ...prev, tenant_id: tenantId }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.property_id || !formData.tenant_id) {
      setError('Please select a property and tenant');
      setLoading(false);
      return;
    }

    try {
      // Create the tenancy
      const tenancyResponse = await axios.post(`${API_URL}/api/tenancies`, {
        property_id: formData.property_id,
        tenancy_type: formData.tenancy_type,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        rent_amount: parseFloat(formData.rent_amount),
        rent_frequency: 'monthly',
        rent_due_day: parseInt(formData.rent_due_day),
        deposit_amount: formData.deposit_amount ? parseFloat(formData.deposit_amount) : null,
        deposit_scheme: null,
        room_number: formData.room_number || null
      });

      const tenancyId = tenancyResponse.data.id;

      // Create the tenancy_tenants link
      await axios.post(`${API_URL}/api/tenancies/tenancy-tenants`, {
        tenancy_id: tenancyId,
        tenant_id: formData.tenant_id,
        is_primary: formData.is_primary
      });

      onTenancyAdded(tenancyResponse.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create tenancy');
      setLoading(false);
    }
  };

  const selectedTenant = tenants.find(t => t.id === formData.tenant_id);

  if (dataLoading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Add New Tenancy</h3>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
          <div className="modal-loading">Loading data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add New Tenancy</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="modal-error">{error}</div>}

          <div className="form-section">
            <h4>Property & Tenant</h4>
            
            <div className="form-group">
              <label htmlFor="property_id">Property *</label>
              <select
                id="property_id"
                name="property_id"
                value={formData.property_id}
                onChange={handleChange}
                required
              >
                <option value="">Select property...</option>
                {properties.map(prop => (
                  <option key={prop.id} value={prop.id}>
                    {prop.name || prop.address_line_1} - {prop.city}
                  </option>
                ))}
              </select>
              {properties.length === 0 && (
                <span className="field-hint">No properties available. Add a property first.</span>
              )}
            </div>

            <div className="form-group tenant-search-group">
              <label>Search Tenant *</label>
              <input
                type="text"
                value={tenantSearch}
                onChange={handleTenantSearch}
                placeholder="Search by name or email..."
                className="tenant-search-input"
              />
              
              <div className="tenant-dropdown">
                {filteredTenants.length === 0 ? (
                  <div className="tenant-option empty">No tenants found</div>
                ) : (
                  filteredTenants.map(tenant => (
                    <div
                      key={tenant.id}
                      className={`tenant-option ${formData.tenant_id === tenant.id ? 'selected' : ''}`}
                      onClick={() => handleTenantSelect(tenant.id)}
                    >
                      <span className="tenant-name">{tenant.first_name} {tenant.last_name}</span>
                      <span className="tenant-email">{tenant.email}</span>
                    </div>
                  ))
                )}
              </div>
              
              {selectedTenant && (
                <div className="selected-tenant">
                  Selected: <strong>{selectedTenant.first_name} {selectedTenant.last_name}</strong>
                </div>
              )}
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="is_primary"
                  checked={formData.is_primary}
                  onChange={handleChange}
                />
                <span>Primary Tenant</span>
              </label>
            </div>
          </div>

          <div className="form-section">
            <h4>Tenancy Details</h4>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="tenancy_type">Tenancy Type</label>
                <select
                  id="tenancy_type"
                  name="tenancy_type"
                  value={formData.tenancy_type}
                  onChange={handleChange}
                >
                  <option value="ast">Assured Shorthold Tenancy</option>
                  <option value="periodic">Periodic Tenancy</option>
                  <option value="fixed">Fixed Term</option>
                  <option value="commercial">Commercial</option>
                  <option value="licence">Licence</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="room_number">Room Number</label>
                <input
                  type="text"
                  id="room_number"
                  name="room_number"
                  value={formData.room_number}
                  onChange={handleChange}
                  placeholder="For HMO properties"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="rent_amount">Monthly Rent *</label>
                <div className="input-prefix">
                  <span className="prefix">£</span>
                  <input
                    type="number"
                    id="rent_amount"
                    name="rent_amount"
                    value={formData.rent_amount}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="rent_due_day">Rent Due Day</label>
                <select
                  id="rent_due_day"
                  name="rent_due_day"
                  value={formData.rent_due_day}
                  onChange={handleChange}
                >
                  {[...Array(28)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}th{[1, 21].includes(i + 1) ? 'st' : [2, 22].includes(i + 1) ? 'nd' : [3, 23].includes(i + 1) ? 'rd' : ''} of month
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="start_date">Start Date *</label>
                <input
                  type="date"
                  id="start_date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="end_date">End Date</label>
                <input
                  type="date"
                  id="end_date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="deposit_amount">Deposit Amount</label>
              <div className="input-prefix">
                <span className="prefix">£</span>
                <input
                  type="number"
                  id="deposit_amount"
                  name="deposit_amount"
                  value={formData.deposit_amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading || !formData.property_id || !formData.tenant_id}>
              {loading ? 'Creating...' : 'Create Tenancy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddTenancyModal;
