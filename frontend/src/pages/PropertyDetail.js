import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import DocumentUpload from '../components/DocumentUpload';
import DriveFolderMapping from '../components/DriveFolderMapping';
import AddTenancy from '../components/AddTenancy';
import AddExpense from '../components/AddExpense';
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
  const [expenseSummary, setExpenseSummary] = useState({
    oneOff: 0,
    monthlyRecurring: 0,
    totalThisMonth: 0,
    byCategory: {}
  });

  useEffect(() => {
    fetchProperty();
    checkDriveStatus();
    checkQuickBooksStatus();
    loadPropertyDocuments();
    fetchExpenses();
  }, [id]);

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
      
      setExpenseSummary(summary);
    } catch (error) {
      console.error('Error fetching expenses:', error);
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
  
  // Calculate total rental income from active tenancies that have STARTED
  const today = new Date();
  const totalIncome = property?.tenancies
    ?.filter(t => t.status === 'active' && new Date(t.start_date) <= today)
    ?.reduce((sum, t) => sum + parseFloat(t.rent_amount || 0), 0) || 0;

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
        </div>

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
                      {expense.category.replace('_', ' ').toUpperCase()}
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
                    <div className="frequency">{expense.frequency === 'one-off' ? 'One-off' : 'Recurring'}</div>
                  </div>
                </div>
              ))}
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
    </div>
  );
}

export default PropertyDetail;
