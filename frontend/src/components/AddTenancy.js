import React, { useState } from 'react';
import axios from 'axios';
import './AddTenancy.css';

const API_URL = process.env.REACT_APP_API_URL || '';

function AddTenancy({ propertyId, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Tenancy state
  const [tenancy, setTenancy] = useState({
    start_date: '',
    rent_amount: '',
    rent_due_day: '1',
    rent_frequency: 'monthly',
    room_number: '',
    deposit_amount: '',
    tenancy_type: 'assured_shorthold',
    notes: ''
  });
  
  // Tenant state
  const [tenant, setTenant] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    is_primary: true
  });
  
  const handleTenancyChange = (e) => {
    setTenancy({ ...tenancy, [e.target.name]: e.target.value });
  };
  
  const handleTenantChange = (e) => {
    setTenant({ ...tenant, [e.target.name]: e.target.value });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      // Step 1: Create tenancy
      const tenancyRes = await axios.post(
        `${API_URL}/api/tenancies`,
        {
          property_id: propertyId,
          tenancy_type: tenancy.tenancy_type,
          status: 'active',
          start_date: tenancy.start_date,
          rent_amount: parseFloat(tenancy.rent_amount),
          rent_frequency: tenancy.rent_frequency,
          rent_due_day: parseInt(tenancy.rent_due_day),
          deposit_amount: tenancy.deposit_amount ? parseFloat(tenancy.deposit_amount) : null,
          room_number: tenancy.room_number || null,
          notes: tenancy.notes
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const tenancyId = tenancyRes.data.id;
      
      // Step 2: Create tenant
      const tenantRes = await axios.post(
        `${API_URL}/api/tenants`,
        {
          first_name: tenant.first_name,
          last_name: tenant.last_name,
          email: tenant.email,
          phone: tenant.phone
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const tenantId = tenantRes.data.id;
      
      // Step 3: Link tenant to tenancy
      await axios.post(
        `${API_URL}/api/tenancies/${tenancyId}/tenants`,
        {
          tenant_id: tenantId,
          is_primary: tenant.is_primary
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setLoading(false);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating tenancy:', err);
      setError(err.response?.data?.error || 'Failed to create tenancy');
      setLoading(false);
    }
  };
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add New Tenancy</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h3>Tenancy Details</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label>Start Date *</label>
                <input
                  type="date"
                  name="start_date"
                  value={tenancy.start_date}
                  onChange={handleTenancyChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Tenancy Type</label>
                <select
                  name="tenancy_type"
                  value={tenancy.tenancy_type}
                  onChange={handleTenancyChange}
                >
                  <option value="assured_shorthold">Assured Shorthold</option>
                  <option value="periodic">Periodic</option>
                  <option value="room_only">Room Only</option>
                </select>
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Monthly Rent (£) *</label>
                <input
                  type="number"
                  name="rent_amount"
                  value={tenancy.rent_amount}
                  onChange={handleTenancyChange}
                  placeholder="e.g., 1200"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Due Day *</label>
                <select
                  name="rent_due_day"
                  value={tenancy.rent_due_day}
                  onChange={handleTenancyChange}
                  required
                >
                  {[...Array(31)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Deposit (£)</label>
                <input
                  type="number"
                  name="deposit_amount"
                  value={tenancy.deposit_amount}
                  onChange={handleTenancyChange}
                  placeholder="e.g., 1200"
                />
              </div>
              
              <div className="form-group">
                <label>Room Number (HMO)</label>
                <input
                  type="text"
                  name="room_number"
                  value={tenancy.room_number}
                  onChange={handleTenancyChange}
                  placeholder="e.g., Room 1"
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>Notes</label>
              <textarea
                name="notes"
                value={tenancy.notes}
                onChange={handleTenancyChange}
                rows="2"
                placeholder="Any additional notes..."
              />
            </div>
          </div>
          
          <div className="form-section">
            <h3>Tenant Details</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label>First Name *</label>
                <input
                  type="text"
                  name="first_name"
                  value={tenant.first_name}
                  onChange={handleTenantChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Last Name *</label>
                <input
                  type="text"
                  name="last_name"
                  value={tenant.last_name}
                  onChange={handleTenantChange}
                  required
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={tenant.email}
                  onChange={handleTenantChange}
                  placeholder="tenant@email.com"
                />
              </div>
              
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={tenant.phone}
                  onChange={handleTenantChange}
                  placeholder="+44..."
                />
              </div>
            </div>
            
            <div className="form-group checkbox">
              <label>
                <input
                  type="checkbox"
                  name="is_primary"
                  checked={tenant.is_primary}
                  onChange={(e) => setTenant({ ...tenant, is_primary: e.target.checked })}
                />
                Primary Tenant
              </label>
            </div>
          </div>
          
          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}
          
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Tenancy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddTenancy;
