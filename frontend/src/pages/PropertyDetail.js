import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import DocumentUpload from '../components/DocumentUpload';
import DriveFolderMapping from '../components/DriveFolderMapping';
import AddTenancy from '../components/AddTenancy';
import AddExpense from '../components/AddExpense';
import AddSABooking from '../components/AddSABooking';
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
  
  // Drive integration state
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveEmail, setDriveEmail] = useState(null);
  const [activeDocumentsTab, setActiveDocumentsTab] = useState('compliance');
  const [propertyDocuments, setPropertyDocuments] = useState([]);
  const [complianceDocuments, setComplianceDocuments] = useState([]);
  
  // QuickBooks integration state
  const [qbConnected, setQbConnected] = useState(false);
  const [qbCompanyName, setQbCompanyName] = useState(null);
  
  // Add tenancy modal state
  const [showAddTenancy, setShowAddTenancy] = useState(false);
  
  // Expense tracking state
  const [expenses, setExpenses] = useState([]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editExpenseForm, setEditExpenseForm] = useState({
    category: '',
    description: '',
    amount: '',
    expense_date: '',
    frequency: '',
    is_tax_deductible: false
  });
  const [expenseSummary, setExpenseSummary] = useState({
    oneOff: 0,
    monthlyRecurring: 0,
    totalThisMonth: 0,
    byCategory: {}
  });
  const [expenseForecast, setExpenseForecast] = useState([]);
  
  // Serviced Accommodation state
  const [saBookings, setSaBookings] = useState([]);
  const [showAddSABooking, setShowAddSABooking] = useState(false);
  const [saSummary, setSaSummary] = useState({
    totalBookings: 0,
    confirmedRevenue: 0,
    receivedRevenue: 0,
    pendingRevenue: 0,
    totalNights: 0,
    pmDeductions: 0
  });
  const [saForecast, setSaForecast] = useState([]);

  useEffect(() => {
    fetchProperty();
    checkDriveStatus();
    checkQuickBooksStatus();
    loadPropertyDocuments();
    fetchExpenses();
    // Fetch SA bookings if this is a serviced accommodation property
    if (property?.property_category === 'sa') {
      fetchSABookings();
    }
  }, [id, property?.property_category]);

  const checkDriveStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setDriveConnected(false);
        return;
      }
      
      const response = await axios.get(`${API_URL}/api/google/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDriveConnected(response.data.connected);
      setDriveEmail(response.data.email);
    } catch (error) {
      setDriveConnected(false);
    }
  };

  const checkQuickBooksStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setQbConnected(false);
        return;
      }
      
      const response = await axios.get(`${API_URL}/api/quickbooks/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQbConnected(response.data.connected);
      setQbCompanyName(response.data.companyName);
    } catch (error) {
      setQbConnected(false);
    }
  };

  const fetchExpenses = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      // Get all expenses for this property
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      const response = await axios.get(
        `${API_URL}/api/expenses/property/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const allExpenses = response.data || [];
      setExpenses(allExpenses);
      
      // Calculate summary
      const summary = {
        oneOff: 0,
        monthlyRecurring: 0,
        totalThisMonth: 0,
        byCategory: {}
      };
      
      allExpenses.forEach(expense => {
        const amount = parseFloat(expense.amount) || 0;
        const expenseDate = new Date(expense.expense_date);
        
        if (!summary.byCategory[expense.category]) {
          summary.byCategory[expense.category] = 0;
        }
        
        if (expense.frequency === 'one-off') {
          summary.oneOff += amount;
          // Count if in current month
          if (expenseDate >= firstDayOfMonth) {
            summary.totalThisMonth += amount;
            summary.byCategory[expense.category] += amount;
          }
        } else {
          // Recurring expense
          summary.monthlyRecurring += amount;
          summary.totalThisMonth += amount;
          summary.byCategory[expense.category] += amount;
        }
      });
      
      // Calculate 6-month expense forecast
      const forecast = [];
      for (let i = 0; i < 6; i++) {
        const forecastMonth = new Date(today.getFullYear(), today.getMonth() + i, 1);
        const monthName = forecastMonth.toLocaleString('en-GB', { month: 'short', year: 'numeric' });
        
        let recurringTotal = 0;
        let oneOffTotal = 0;
        
        allExpenses.forEach(expense => {
          const amount = parseFloat(expense.amount) || 0;
          const expenseDate = new Date(expense.expense_date);
          
          if (expense.frequency === 'one-off') {
            // One-off: only count if in this specific month
            if (expenseDate.getMonth() === forecastMonth.getMonth() && 
                expenseDate.getFullYear() === forecastMonth.getFullYear()) {
              oneOffTotal += amount;
            }
          } else {
            // Recurring: count for every month going forward
            // (But only if expense date is on or before this month)
            if (expenseDate <= forecastMonth || i === 0) {
              recurringTotal += amount;
            }
          }
        });
        
        forecast.push({
          month: monthName,
          recurring: recurringTotal,
          oneOff: oneOffTotal,
          total: recurringTotal + oneOffTotal
        });
      }
      
      setExpenseForecast(forecast);
      setExpenseSummary(summary);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  const fetchSABookings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token || property?.property_category !== 'sa') return;
      
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      // Get all SA bookings for this property
      const response = await axios.get(
        `${API_URL}/api/sa-bookings/property/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const bookings = response.data || [];
      setSaBookings(bookings);
      
      // Calculate summary
      const summary = {
        totalBookings: bookings.length,
        confirmedRevenue: 0,
        receivedRevenue: 0,
        pendingRevenue: 0,
        totalNights: 0,
        pmDeductions: 0
      };
      
      bookings.forEach(booking => {
        if (booking.status !== 'cancelled') {
          const netRevenue = parseFloat(booking.net_revenue) || 0;
          const pmDeduction = parseFloat(booking.total_pm_deduction) || 0;
          
          summary.confirmedRevenue += netRevenue;
          summary.totalNights += parseInt(booking.total_nights) || 0;
          summary.pmDeductions += pmDeduction;
          
          if (booking.payment_status === 'received') {
            summary.receivedRevenue += netRevenue;
          } else {
            summary.pendingRevenue += netRevenue;
          }
        }
      });
      
      setSaSummary(summary);
      
      // Get monthly forecast
      const forecastRes = await axios.get(
        `${API_URL}/api/sa-bookings/property/${id}/forecast?year=${today.getFullYear()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSaForecast(forecastRes.data || []);
    } catch (error) {
      console.error('Error fetching SA bookings:', error);
    }
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setEditExpenseForm({
      category: expense.category,
      description: expense.description || '',
      amount: expense.amount,
      expense_date: expense.expense_date,
      frequency: expense.frequency,
      is_tax_deductible: expense.is_tax_deductible || false
    });
  };

  const handleCloseEditExpense = () => {
    setEditingExpense(null);
    setEditExpenseForm({
      category: '',
      description: '',
      amount: '',
      expense_date: '',
      frequency: '',
      is_tax_deductible: false
    });
  };

  const handleSaveExpense = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/expenses/${editingExpense.id}`,
        editExpenseForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      handleCloseEditExpense();
      fetchExpenses();
    } catch (error) {
      console.error('Error saving expense:', error);
      alert('Failed to save expense');
    }
  };

  const loadPropertyDocuments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/drive/properties/${id}/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const docs = response.data || [];
      // Separate compliance and property docs
      const compliance = docs.filter(d => d.category === 'compliance');
      const property = docs.filter(d => ['mortgage', 'legal', 'planning', 'other'].includes(d.category));
      setComplianceDocuments(compliance);
      setPropertyDocuments(property);
    } catch (error) {
    }
  };

  const fetchProperty = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/properties/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProperty(response.data);
      setLoading(false);
      
      // Get actual rent payments for this month (pending or late only)
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      try {
        const paymentsRes = await axios.get(`${API_URL}/api/rent-payments`, {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            property_id: id,
            start_date: startOfMonth.toISOString(),
            end_date: endOfMonth.toISOString()
          }
        });
        
        // Filter to LATE payments only (past due date, not paid)
        const pendingPayments = (paymentsRes.data || [])
          .filter(p => p.status === 'late')
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
      
      const response = await axios.put(`${API_URL}/api/tenants/${editingTenant.id}`, {
        email: editForm.email,
        phone: editForm.phone
      });
      
      
      // Refresh property data
      await fetchProperty();
      setEditingTenant(null);
      setSaving(false);
    } catch (err) {
      alert('Failed to save changes. Check console for details.');
      setSaving(false);
    }
  };

  const handleCloseModal = () => {
    setEditingTenant(null);
  };

  // Google Drive connection
  const connectGoogleDrive = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }
      
      const response = await axios.get(`${API_URL}/api/google/auth-url`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.data.authUrl) {
        return;
      }
      
      // Open Google OAuth in popup
      const popup = window.open(
        response.data.authUrl,
        'GoogleDriveAuth',
        'width=500,height=600,scrollbars=yes'
      );

      // Listen for auth code from popup
      const handleMessage = async (event) => {
        if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
          window.removeEventListener('message', handleMessage);
          
          // Send code to backend with our token
          try {
            await axios.post(`${API_URL}/api/google/connect`, 
              { code: event.data.code },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            checkDriveStatus();
          } catch (err) {
            console.error('Failed to complete auth:', err);
          }
        }
      };
      
      window.addEventListener('message', handleMessage);

      // Also poll for popup closure
      const pollTimer = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollTimer);
          window.removeEventListener('message', handleMessage);
          checkDriveStatus();
        }
      }, 500);
    } catch (error) {
      console.error('Drive connect error:', error);
    }
  };

  const disconnectGoogleDrive = async () => {
    if (!window.confirm('Disconnect Google Drive?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/google/disconnect`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDriveConnected(false);
      setDriveEmail(null);
    } catch (error) {
      alert('Error disconnecting Google Drive.');
    }
  };

  // QuickBooks connection
  const connectQuickBooks = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }
      
      const response = await axios.get(`${API_URL}/api/quickbooks/auth-url`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.data.authUrl) {
        return;
      }
      
      // Open QuickBooks OAuth in popup
      const popup = window.open(
        response.data.authUrl,
        'QuickBooksAuth',
        'width=500,height=600,scrollbars=yes'
      );

      // Listen for auth code from popup
      const handleMessage = async (event) => {
        if (event.data?.type === 'QB_AUTH_SUCCESS') {
          window.removeEventListener('message', handleMessage);
          
          // Send code to backend with our token
          try {
            await axios.post(`${API_URL}/api/quickbooks/connect`, 
              { code: event.data.code, realmId: event.data.realmId },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            checkQuickBooksStatus();
          } catch (err) {
            console.error('Failed to complete QB auth:', err);
          }
        }
      };
      
      window.addEventListener('message', handleMessage);

      // Also poll for popup closure
      const pollTimer = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollTimer);
          window.removeEventListener('message', handleMessage);
          checkQuickBooksStatus();
        }
      }, 500);
    } catch (error) {
      console.error('QuickBooks connect error:', error);
    }
  };

  const disconnectQuickBooks = async () => {
    if (!window.confirm('Disconnect QuickBooks?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/quickbooks/disconnect`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQbConnected(false);
      setQbCompanyName(null);
    } catch (error) {
      alert('Error disconnecting QuickBooks.');
    }
  };

  if (loading) return <div className="loading-spinner">Loading property details...</div>;
  if (error) return <div className="error-container"><h2>⚠️ {error}</h2></div>;
  if (!property) return <div className="error-container"><h2>Property not found</h2></div>;

  const totalMonthlyRent = upcomingPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  
  // Get current month for SA calculations
  const today = new Date();
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  // Calculate SA booking revenue for current month
  const monthlySARevenue = property?.property_category === 'sa' 
    ? (saBookings || []).reduce((sum, booking) => {
        if (booking.status === 'cancelled') return sum;
        const checkIn = new Date(booking.check_in);
        if (checkIn >= currentMonthStart && checkIn <= currentMonthEnd) {
          return sum + (parseFloat(booking.net_revenue) || 0);
        }
        return sum;
      }, 0)
    : 0;
  
  // Calculate total rental income from active tenancies that have STARTED
  const tenancyIncome = property?.tenancies
    ?.filter(t => t.status === 'active' && new Date(t.start_date) <= today)
    ?.reduce((sum, t) => sum + parseFloat(t.rent_amount || 0), 0) || 0;
  
  // Total income = tenancy income + SA booking revenue for this month
  const totalIncome = tenancyIncome + monthlySARevenue;

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
        {property?.property_category === 'sa' ? (
          <>
            <div className="stat-card income">
              <h4>💰 Monthly SA Revenue</h4>
              <div className="stat-value">£{monthlySARevenue.toLocaleString()}</div>
              <span className="card-hint">{saBookings.filter(b => {
                if (b.status === 'cancelled') return false;
                const checkIn = new Date(b.check_in);
                return checkIn >= currentMonthStart && checkIn <= currentMonthEnd;
              }).length} bookings this month</span>
            </div>
            <div className="stat-card expense">
              <h4>📉 Monthly Expenses</h4>
              <div className="stat-value">£{expenseSummary.totalThisMonth.toLocaleString()}</div>
              <span className="card-hint">This property</span>
            </div>
            <div className={`stat-card ${totalIncome - expenseSummary.totalThisMonth >= 0 ? 'profit' : 'loss'}`}>
              <h4>{totalIncome - expenseSummary.totalThisMonth >= 0 ? '📈 Net Profit' : '📉 Net Loss'}</h4>
              <div className="stat-value">
                {totalIncome - expenseSummary.totalThisMonth >= 0 ? '+' : '-'}£{Math.abs(totalIncome - expenseSummary.totalThisMonth).toLocaleString()}
              </div>
              <span className="card-hint">Revenue − Expenses</span>
            </div>
          </>
        ) : (
          <>
            <div className="stat-card clickable" onClick={() => window.location.href = '/rent-tracker'}>
              <h4>Monthly Rental Income</h4>
              <div className="stat-value">£{totalIncome.toLocaleString()}</div>
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
          </>
        )}
      </div>

      {/* Content Grid */}
      <div className="property-content-grid">
        {/* Tenancies Section */}
        <div className="section-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>🏠 Active Tenancies</h3>
            <button
              className="add-tenancy-btn"
              onClick={() => setShowAddTenancy(true)}
              style={{
                background: '#4f46e5',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>+</span> Add Tenancy
            </button>
          </div>
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

                  {/* Tenants in this tenancy - Clickable with Edit */}
                  {tenancy.tenants && tenancy.tenants.length > 0 ? (
                    <div className="tenant-list">
                      {tenancy.tenants.map(tenant => (
                        <div 
                          key={tenant.id} 
                          className="tenant-item"
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
                            onClick={(e) => handleEditTenant(tenant, e)}
                            style={{
                              padding: '8px 14px',
                              background: '#4f46e5',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '14px',
                              fontWeight: '500',
                              cursor: 'pointer',
                              marginLeft: '8px',
                              display: 'inline-block'
                            }}
                          >
                            ✏️ Edit
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No tenants assigned</p>
                  )}

                  {/* Document Upload for this tenancy */}
                  <DocumentUpload 
                    tenancyId={tenancy.id}
                    onUploadComplete={() => {}}
                  />
                </div>
              ))
            )}
          </div>

          {/* Pending Tenancies Section */}
          {property.tenancies?.filter(t => t.status === 'pending').length > 0 && (
            <>
              <h4 style={{ margin: '24px 0 16px', color: '#6b7280', fontSize: '0.9rem' }}>
                ⏳ UPCOMING / PENDING ({property.tenancies?.filter(t => t.status === 'pending').length})
              </h4>
              <div className="tenancy-list">
                {property.tenancies?.filter(t => t.status === 'pending').map(tenancy => (
                  <div key={tenancy.id} className={`tenancy-card ${tenancy.status}`} style={{ opacity: 0.85, borderLeft: '4px solid #f59e0b' }}>
                    <div className="tenancy-header">
                      <span className="tenancy-title">
                        {tenancy.tenants?.length > 0 
                          ? tenancy.tenants.map(t => `${t.first_name} ${t.last_name}`).join(', ') + 
                            (tenancy.room_number ? ` - Room ${tenancy.room_number}` : '')
                          : (tenancy.room_number ? `Room ${tenancy.room_number}` : 'Unassigned')
                        }
                      </span>
                      <span className={`tenancy-status ${tenancy.status}`} style={{ background: '#f59e0b', color: 'white' }}>
                        MOVES IN {new Date(tenancy.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    
                    <div className="tenancy-details">
                      <div className="tenancy-detail">
                        <span className="tenancy-detail-label">Monthly Rent</span>
                        <span className="tenancy-detail-value amount">£{tenancy.rent_amount}</span>
                      </div>
                      <div className="tenancy-detail">
                        <span className="tenancy-detail-label">First Payment Due</span>
                        <span className="tenancy-detail-value" style={{ color: '#f59e0b', fontWeight: 600 }}>
                          {new Date(tenancy.start_date).toLocaleDateString('en-GB')} (Move-in day)
                        </span>
                      </div>
                      <div className="tenancy-detail">
                        <span className="tenancy-detail-label">Rent Due Day</span>
                        <span className="tenancy-detail-value">
                          {tenancy.rent_due_day ? 
                            `${tenancy.rent_due_day}${['st','nd','rd'][tenancy.rent_due_day-1] || 'th'} of month` : 
                            'Not set'}
                        </span>
                      </div>
                    </div>

                    {tenancy.tenants && tenancy.tenants.length > 0 && (
                      <div className="tenant-list">
                        {tenancy.tenants.map(tenant => (
                          <div key={tenant.id} className="tenant-item">
                            <div className="tenant-info">
                              <span className="tenant-name">
                                {tenant.first_name} {tenant.last_name}
                                {tenant.is_primary && <span className="tenant-badge">PRIMARY</span>}
                              </span>
                              <span className="tenant-contact">
                                {tenant.phone || tenant.email || 'No contact'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Serviced Accommodation Bookings Section */}
        {property?.property_category === 'sa' && (
          <div className="section-card sa-bookings-section">
            <div className="section-header">
              <h3>✈️ Serviced Accommodation Bookings</h3>
              <button 
                className="btn-primary add-btn"
                onClick={() => setShowAddSABooking(true)}
              >
                + Add Booking
              </button>
            </div>
            
            {/* SA Summary Cards */}
            <div className="sa-summary-cards">
              <div className="summary-card bookings">
                <span className="summary-label">Total Bookings</span>
                <span className="summary-value">{saSummary.totalBookings}</span>
                <span className="summary-hint">{saSummary.totalNights} nights</span>
              </div>
              <div className="summary-card revenue">
                <span className="summary-label">Confirmed Revenue</span>
                <span className="summary-value">£{saSummary.confirmedRevenue.toLocaleString()}</span>
                <span className="summary-hint">{saSummary.receivedRevenue > 0 ? `£${saSummary.receivedRevenue.toLocaleString()} received` : 'Awaiting payouts'}</span>
              </div>
              {property?.is_managed && saSummary.pmDeductions > 0 && (
                <div className="summary-card pm-deductions">
                  <span className="summary-label">PM Deductions</span>
                  <span className="summary-value">£{saSummary.pmDeductions.toLocaleString()}</span>
                  <span className="summary-hint">{property?.property_manager_name || 'Property Manager'}</span>
                </div>
              )}
            </div>
            
            {/* SA Forecast */}
            {saForecast.length > 0 && (
              <div className="sa-forecast">
                <h4>Monthly Revenue Forecast {new Date().getFullYear()}</h4>
                <div className="forecast-grid">
                  {saForecast.filter(m => m.confirmed > 0).map(month => (
                    <div key={month.month} className="forecast-month">
                      <div className="month-name">{month.monthName}</div>
                      <div className="month-revenue">£{month.confirmed.toFixed(0)}</div>
                      <div className="month-bookings">{month.bookings} bookings</div>
                      <div className="month-status" style={{
                        color: month.received > 0 ? '#059669' : '#f59e0b'
                      }}>
                        {month.received > 0 ? '✓ Received' : 'Pending'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* SA Bookings List */}
            {saBookings.length > 0 ? (
              <div className="sa-bookings-list">
                <table className="bookings-table">
                  <thead>
                    <tr>
                      <th>Guest</th>
                      <th>Dates</th>
                      <th>Platform</th>
                      <th>Net Revenue</th>
                      <th>Status</th>
                      <th>Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saBookings
                      .filter(b => b.status !== 'cancelled')
                      .sort((a, b) => new Date(b.check_in) - new Date(a.check_in))
                      .map(booking => (
                        <tr key={booking.id} className={booking.payment_status === 'received' ? 'received' : 'pending'}>
                          <td>
                            <div className="guest-name">{booking.guest_name}</div>
                            {booking.reservation_id && (
                              <div className="res-id">{booking.reservation_id}</div>
                            )}
                          </td>
                          <td>
                            <div className="booking-dates">
                              {new Date(booking.check_in).toLocaleDateString('en-GB')}
                              <br/>
                              <small>→ {new Date(booking.check_out).toLocaleDateString('en-GB')}</small>
                            </div>
                            <div className="nights">{booking.total_nights} nights</div>
                          </td>
                          <td>
                            <span className={`platform-tag ${booking.platform}`}>
                              {booking.platform}
                            </span>
                          </td>
                          <td>£{parseFloat(booking.net_revenue).toFixed(2)}</td>
                          <td>
                            <span className={`status-badge ${booking.status}`}>
                              {booking.status === 'confirmed' ? '✓' : '●'} {booking.status}
                            </span>
                          </td>
                          <td>
                            <div className="payment-status">
                              {booking.payment_status === 'received' ? (
                                <span className="paid">✓ Received</span>
                              ) : (
                                <span className="pending">⏳ Pending</span>
                              )}
                            </div>
                            {property?.is_managed && booking.total_pm_deduction > 0 && (
                              <div className="pm-status">
                                {booking.pm_payment_status === 'paid' ? (
                                  <small className="pm-paid">PM Paid</small>
                                ) : (
                                  <small className="pm-owed">PM Owed: £{booking.total_pm_deduction}</small>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">📅</div>
                <p>No bookings added yet</p>
                <button className="btn-primary" onClick={() => setShowAddSABooking(true)}>
                  Add Your First Booking
                </button>
              </div>
            )}
          </div>
        )}

        {/* Upcoming Payments Section */}
        <div className="section-card">
          <h3>💰 Upcoming Rent Payments</h3>
          <div className="upcoming-payments">
            {/* Rent Summary - Shows BOTH Total Income & Outstanding */}
            <div className="rent-summary-cards">
              <div className="summary-card income">
                <span className="summary-label">Monthly Income</span>
                <span className="summary-value">£{totalIncome.toLocaleString()}</span>
                <span className="summary-hint">Total from {property?.tenancies?.filter(t => t.status === 'active').length || 0} tenancies</span>
              </div>
              <div className="summary-card outstanding">
                <span className="summary-label">Outstanding</span>
                <span className="summary-value">£{totalMonthlyRent.toLocaleString()}</span>
                <span className="summary-hint">{upcomingPayments.length} payments due</span>
              </div>
            </div>

            {upcomingPayments.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">✅</div>
                <p>All rents paid for this month! 🎉</p>
              </div>
            ) : (
              <>
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

        {/* Document Management Section */}
        <div className="section-card documents-section" style={{ gridColumn: '1 / -1' }}>
          <div className="documents-header">
            <h3>📁 Integrations</h3>
            <div className="drive-status" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {/* Google Drive */}
              {driveConnected ? (
                <span className="drive-connected">
                  ✅ Drive: {driveEmail}
                  <button onClick={disconnectGoogleDrive} className="disconnect-btn">Disconnect</button>
                </span>
              ) : (
                <button onClick={connectGoogleDrive} className="connect-drive-btn">
                  🔗 Connect Google Drive
                </button>
              )}
              
              {/* QuickBooks */}
              {qbConnected ? (
                <span className="drive-connected" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#2ca01c' }}>📊</span>
                  <span>QuickBooks: {qbCompanyName}</span>
                  <button onClick={disconnectQuickBooks} className="disconnect-btn">Disconnect</button>
                </span>
              ) : (
                <button onClick={connectQuickBooks} className="connect-drive-btn" style={{ background: '#2ca01c!important' }}>
                  🔗 Connect QuickBooks
                </button>
              )}
            </div>
          </div>

          {/* Document Category Tabs */}
          <div className="document-tabs">
            <button 
              className={`tab ${activeDocumentsTab === 'compliance' ? 'active' : ''}`}
              onClick={() => setActiveDocumentsTab('compliance')}
            >
              📋 Compliance
            </button>
            <button 
              className={`tab ${activeDocumentsTab === 'property' ? 'active' : ''}`}
              onClick={() => setActiveDocumentsTab('property')}
            >
              🏠 Property Documents
            </button>
            {property.tenancies?.some(t => t.status === 'active') && (
              <button 
                className={`tab ${activeDocumentsTab === 'tenancy' ? 'active' : ''}`}
                onClick={() => setActiveDocumentsTab('tenancy')}
              >
                👥 Tenancy Documents
              </button>
            )}
          </div>

          {/* Compliance Documents Tab */}
          {activeDocumentsTab === 'compliance' && (
            <div className="document-category">
              <div className="category-header">
                <h4>Compliance Certificates</h4>
                <p className="category-desc">EPC, Gas Safety, Electrical, Fire Safety, etc.</p>
                {driveConnected && (
                  <DriveFolderMapping 
                    propertyId={id} 
                    propertyName={property.name || property.address_line_1}
                  />
                )}
              </div>
              
              {complianceDocuments.length === 0 ? (
                <div className="empty-documents">
                  <div className="upload-prompt">
                    <p>No compliance certificates uploaded yet.</p>
                    {driveConnected ? (
                      <DocumentUpload 
                        propertyId={id}
                        category="compliance"
                        allowedTypes={['.pdf', '.jpg', '.png']}
                        onUploadComplete={loadPropertyDocuments}
                      />
                    ) : (
                      <p className="hint">Connect Google Drive to upload documents</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="documents-list">
                  {complianceDocuments.map(doc => (
                    <div key={doc.id} className="document-item">
                      <span className="doc-icon">📄</span>
                      <div className="doc-info">
                        <span className="doc-name">{doc.drive_file_name}</span>
                        <span className="doc-date">
                          {new Date(doc.upload_date).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                      <a 
                        href={doc.drive_file_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="view-btn"
                      >
                        View
                      </a>
                    </div>
                  ))}
                  {driveConnected && (
                    <DocumentUpload 
                      propertyId={id}
                      category="compliance"
                      allowedTypes={['.pdf', '.jpg', '.png']}
                      onUploadComplete={loadPropertyDocuments}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Property Documents Tab */}
          {activeDocumentsTab === 'property' && (
            <div className="document-category">
              <div className="category-header">
                <h4>Property Documents</h4>
                <p className="category-desc">Mortgage statements, agreements, planning, architectural drawings</p>
              </div>
              
              <div className="document-subcategories">
                <div className="subcategory">
                  <h5>🏦 Mortgage & Finance</h5>
                  <p>Mortgage agreements, statements, valuation reports</p>
                  {driveConnected && (
                    <DocumentUpload 
                      propertyId={id}
                      category="mortgage"
                      allowedTypes={['.pdf', '.jpg', '.png']}
                      onUploadComplete={loadPropertyDocuments}
                    />
                  )}
                </div>
                
                <div className="subcategory">
                  <h5>⚖️ Legal Documents</h5>
                  <p>Deeds, contracts, insurance policies</p>
                  {driveConnected && (
                    <DocumentUpload 
                      propertyId={id}
                      category="legal"
                      allowedTypes={['.pdf', '.jpg', '.png']}
                      onUploadComplete={loadPropertyDocuments}
                    />
                  )}
                </div>
                
                <div className="subcategory">
                  <h5>📐 Planning & Drawings</h5>
                  <p>Planning permission, architectural drawings, floor plans</p>
                  {driveConnected && (
                    <DocumentUpload 
                      propertyId={id}
                      category="planning"
                      allowedTypes={['.pdf', '.jpg', '.png', '.dwg']}
                      onUploadComplete={loadPropertyDocuments}
                    />
                  )}
                </div>
              </div>

              {propertyDocuments.length > 0 && (
                <div className="documents-list">
                  <h5>📂 All Property Documents</h5>
                  {propertyDocuments.map(doc => (
                    <div key={doc.id} className="document-item">
                      <span className="doc-icon">📄</span>
                      <div className="doc-info">
                        <span className="doc-name">{doc.drive_file_name}</span>
                        <span className="doc-category">{doc.category}</span>
                        <span className="doc-date">
                          {new Date(doc.upload_date).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                      <a 
                        href={doc.drive_file_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="view-btn"
                      >
                        View
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tenancy Documents Tab */}
          {activeDocumentsTab === 'tenancy' && (
            <div className="document-category">
              <h4>Tenancy Documents</h4>
              <p>AST agreements, inventories, reference checks per tenancy</p>
              
              {property.tenancies?.filter(t => t.status === 'active').map(tenancy => (
                <div key={tenancy.id} className="tenancy-docs-card">
                  <div className="tenancy-docs-header">
                    <h5>
                      {tenancy.tenants?.map(t => `${t.first_name} ${t.last_name}`).join(', ') || 'Unnamed Tenancy'}
                      {tenancy.room_number && ` - Room ${tenancy.room_number}`}
                    </h5>
                    <span className="tenancy-status-badge">{tenancy.status}</span>
                  </div>
                  {driveConnected && (
                    <DocumentUpload 
                      tenancyId={tenancy.id}
                      category="tenancy"
                      allowedTypes={['.pdf', '.jpg', '.png']}
                      onUploadComplete={loadPropertyDocuments}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expenses & Profit/Loss Section */}
        <div className="section-card expenses-section" style={{ gridColumn: '1 / -1' }}>
          <div className="expenses-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3>💰 Income & Expenses</h3>
            <button
              onClick={() => setShowAddExpense(true)}
              style={{
                background: '#dc2626',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>+</span> Add Expense
            </button>
          </div>

          {/* Profit/Loss Card */}
          <div className={`profit-loss-card ${totalIncome - expenseSummary.totalThisMonth >= 0 ? 'profit' : 'loss'}`}>
            <h3>📊 This Month</h3>
            <div className="amount">
              {totalIncome - expenseSummary.totalThisMonth >= 0 ? '+' : ''}£{(totalIncome - expenseSummary.totalThisMonth).toLocaleString()}
            </div>
            <div className="breakdown">
              💵 Income: £{totalIncome.toLocaleString()} | 📉 Expenses: £{expenseSummary.totalThisMonth.toLocaleString()}
            </div>
          </div>

          {/* Expense Summary */}
          <div className="expense-summary">
            <h4>Expense Breakdown</h4>
            <div className="summary-grid">
              <div className="summary-item">
                <div className="label">Recurring</div>
                <div className="value">£{expenseSummary.monthlyRecurring.toLocaleString()}</div>
              </div>
              <div className="summary-item">
                <div className="label">One-off</div>
                <div className="value">£{expenseSummary.oneOff.toLocaleString()}</div>
              </div>
              <div className="summary-item">
                <div className="label">Total</div>
                <div className="value negative">£{expenseSummary.totalThisMonth.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Recent Expenses List */}
          {expenses.length > 0 && (
            <div className="expense-list">
              <h4>Recent Expenses</h4>
              {expenses.slice(0, 5).map(expense => (
                <div key={expense.id} className={`expense-item ${expense.frequency}`}>
                  <div className="expense-info">
                    <div className="expense-category">
                      {expense.category.replace(/_/g, ' ').toUpperCase()}
                    </div>
                    {expense.description && (
                      <div className="expense-description">{expense.description}</div>
                    )}
                    <div className="expense-meta">
                      {new Date(expense.expense_date).toLocaleDateString('en-GB')} • {expense.frequency}
                      {expense.is_tax_deductible && ' • Tax deductible'}
                    </div>
                  </div>
                  <div className="expense-amount">
                    <div className="amount">£{parseFloat(expense.amount).toLocaleString()}</div>
                    <div className="frequency">{expense.frequency === 'one-off' ? 'One-off' : expense.frequency}</div>
                    <button
                      className="btn-secondary edit-expense-btn"
                      onClick={() => handleEditExpense(expense)}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Expense Forecast */}
          {expenseForecast.length > 0 && (
            <div className="expense-forecast" style={{marginTop: '24px', marginTop: '24px'}}>
              <h4>📅 6-Month Expense Forecast</h4>
              <p style={{fontSize: '13px', color: '#6b7280', marginBottom: '16px'}}>
                Recurring expenses repeat monthly · One-off expenses show only in their month
              </p>
              <div className="forecast-table" style={{overflowX: 'auto'}}>
                <table style={{width: '100%', fontSize: '14px', borderCollapse: 'collapse'}}>
                  <thead>
                    <tr style={{background: '#f3f4f6'}}>
                      <th style={{padding: '10px', textAlign: 'left', borderBottom: '2px solid #e5e7eb'}}>Month</th>
                      <th style={{padding: '10px', textAlign: 'right', borderBottom: '2px solid #e5e7eb'}}>Recurring</th>
                      <th style={{padding: '10px', textAlign: 'right', borderBottom: '2px solid #e5e7eb'}}>One-off</th>
                      <th style={{padding: '10px', textAlign: 'right', borderBottom: '2px solid #e5e7eb', fontWeight: 600}}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenseForecast.map((month, i) => (
                      <tr key={i} style={{borderBottom: '1px solid #f3f4f6'}}>
                        <td style={{padding: '10px', fontWeight: i === 0 ? 600 : 400}}>
                          {month.month} {i === 0 && <span style={{color: '#10b981', fontSize: '12px'}}>(This month)</span>}
                        </td>
                        <td style={{padding: '10px', textAlign: 'right', color: '#6b7280'}}>
                          £{month.recurring.toLocaleString()}
                        </td>
                        <td style={{padding: '10px', textAlign: 'right', color: month.oneOff > 0 ? '#dc2626' : '#9ca3af'}}>
                          {month.oneOff > 0 ? `£${month.oneOff.toLocaleString()}` : '—'}
                        </td>
                        <td style={{padding: '10px', textAlign: 'right', fontWeight: 600, color: month.total > 0 ? '#374151' : '#9ca3af'}}>
                          £{month.total.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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

      {/* Add Tenancy Modal */}
      {showAddTenancy && (
        <AddTenancy
          propertyId={id}
          onClose={() => setShowAddTenancy(false)}
          onSuccess={() => {
            fetchProperty(); // Refresh property data
            checkDriveStatus(); // Refresh any related data
          }}
        />
      )}

      {/* Add Expense Modal */}
      {showAddExpense && (
        <AddExpense
          propertyId={id}
          onClose={() => setShowAddExpense(false)}
          onSuccess={() => {
            fetchExpenses(); // Refresh expense data
          }}
        />
      )}

      {/* Add SA Booking Modal */}
      {showAddSABooking && property && (
        <AddSABooking
          property={property}
          onClose={() => setShowAddSABooking(false)}
          onSuccess={() => {
            fetchSABookings(); // Refresh SA booking data
          }}
        />
      )}

      {/* Edit Expense Modal */}
      {editingExpense && (
        <div className="modal-overlay" onClick={handleCloseEditExpense}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{color: '#dc2626', marginBottom: '20px'}}>Edit Expense</h3>
            
            <div className="form-group">
              <label>Category</label>
              <select
                value={editExpenseForm.category}
                onChange={(e) => setEditExpenseForm({...editExpenseForm, category: e.target.value})}
              >
                <option value="mortgage">Mortgage</option>
                <option value="council_tax">Council Tax</option>
                <option value="utilities">Utilities</option>
                <option value="insurance">Insurance</option>
                <option value="repairs">Repairs</option>
                <option value="maintenance">Maintenance</option>
                <option value="cleaning">Cleaning</option>
                <option value="furnishings">Furnishings</option>
                <option value="agency_fees">Agency Fees</option>
                <option value="legal">Legal</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Description</label>
              <input
                type="text"
                value={editExpenseForm.description}
                onChange={(e) => setEditExpenseForm({...editExpenseForm, description: e.target.value})}
                placeholder="e.g., Boiler repair"
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Amount (£) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={editExpenseForm.amount}
                  onChange={(e) => setEditExpenseForm({...editExpenseForm, amount: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Date *</label>
                <input
                  type="date"
                  value={editExpenseForm.expense_date}
                  onChange={(e) => setEditExpenseForm({...editExpenseForm, expense_date: e.target.value})}
                  required
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Frequency</label>
                <select
                  value={editExpenseForm.frequency}
                  onChange={(e) => setEditExpenseForm({...editExpenseForm, frequency: e.target.value})}
                >
                  <option value="one-off">One-off</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              
              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={editExpenseForm.is_tax_deductible}
                    onChange={(e) => setEditExpenseForm({...editExpenseForm, is_tax_deductible: e.target.checked})}
                  />
                  Tax Deductible
                </label>
              </div>
            </div>
            
            <div className="modal-actions" style={{marginTop: '24px'}}>
              <button 
                className="btn-primary"
                onClick={handleSaveExpense}
              >
                Save Changes
              </button>
              <button 
                className="btn-secondary"
                onClick={handleCloseEditExpense}
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
