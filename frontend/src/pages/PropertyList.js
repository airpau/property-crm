import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import AddPropertyModal from '../components/AddPropertyModal';

const API_URL = process.env.REACT_APP_API_URL || '';

function PropertyList() {
  const [properties, setProperties] = useState([]);
  const [propertyExpenses, setPropertyExpenses] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in again');
        setLoading(false);
        return;
      }
      
      const response = await axios.get(`${API_URL}/api/properties`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Properties loaded:', response.data.length);
      setProperties(response.data);
      
      // Fetch expenses for all properties
      await fetchAllExpenses(response.data, token);
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading properties:', err.response?.status, err.response?.data);
      setError(`Failed to load properties: ${err.response?.data?.error || err.message}`);
      setLoading(false);
    }
  };
  
  const fetchAllExpenses = async (propertiesList, token) => {
    const expensesMap = {};
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    for (const property of propertiesList) {
      try {
        const response = await axios.get(
          `${API_URL}/api/expenses/property/${property.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        const allExpenses = response.data || [];
        
        // Calculate this month's expenses
        let monthlyTotal = 0;
        allExpenses.forEach(expense => {
          const amount = parseFloat(expense.amount) || 0;
          
          if (expense.frequency === 'one-off') {
            const expenseDate = new Date(expense.expense_date);
            if (expenseDate >= firstDayOfMonth) {
              monthlyTotal += amount;
            }
          } else {
            // Recurring expense
            monthlyTotal += amount;
          }
        });
        
        expensesMap[property.id] = monthlyTotal;
      } catch (err) {
        console.error(`Error fetching expenses for property ${property.id}:`, err);
        expensesMap[property.id] = 0;
      }
    }
    
    setPropertyExpenses(expensesMap);
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
                <div className="property-stat net-income">
                  <div className={`stat-number ${(property.monthly_income || 0) - (propertyExpenses[property.id] || 0) >= 0 ? 'positive' : 'negative'}`}>
                    £{((property.monthly_income || 0) - (propertyExpenses[property.id] || 0)).toLocaleString()}
                  </div>
                  <div className="stat-label">Net (Income - Expenses)</div>
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