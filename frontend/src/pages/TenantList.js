import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '';

function TenantList() {
  const [tenants, setTenants] = useState([]);
  const [filteredTenants, setFilteredTenants] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        return fullName.includes(searchLower);
      });
      setFilteredTenants(filtered);
    }
  }, [searchQuery, tenants]);

  const fetchTenants = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/tenants`);
      setTenants(response.data);
      setFilteredTenants(response.data);
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

  if (loading) return <div className="loading">Loading tenants...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="tenant-list">
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
          placeholder="Search tenants by name..."
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
            <div key={tenant.id} className="tenant-card">
              <h3>{tenant.first_name} {tenant.last_name}</h3>
              <p>📧 {tenant.email}</p>
              <p>📱 {tenant.phone}</p>
              
              {tenant.tenancies && tenant.tenancies.length > 0 && tenant.tenancies[0].tenancy_id && (
                <div className="tenant-properties">
                  {tenant.tenancies.map(tenancy => (
                    tenancy.tenancy_id && (
                      <div key={tenancy.tenancy_id} className="tenant-property">
                        <p>🏠 {tenancy.property_name}</p>
                        <p>💰 £{tenancy.rent_amount}/month</p>
                        <p>Status: {tenancy.tenancy_status}</p>
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TenantList;
