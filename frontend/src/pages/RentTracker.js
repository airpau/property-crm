import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './RentTracker.css';

const API_URL = process.env.REACT_APP_API_URL || '';

function RentTracker() {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('all'); // 'all', 'paid', 'pending', 'overdue'
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const fetchData = async () => {
    try {
      // Parse selected month
      const [year, month] = selectedMonth.split('-').map(Number);
      const startOfMonth = new Date(year, month - 1, 1).toISOString();
      const endOfMonth = new Date(year, month, 0).toISOString();

      // Fetch payments for the selected month
      const paymentsRes = await axios.get(`${API_URL}/api/rent-payments`, {
        params: {
          start_date: startOfMonth,
          end_date: endOfMonth
        }
      });

      // Calculate summary for the month
      const monthPayments = paymentsRes.data || [];
      const summaryData = monthPayments.reduce((acc, p) => {
        const dueAmount = parseFloat(p.amount_due || 0);
        const paidAmount = parseFloat(p.amount_paid || 0);
        
        acc.total_due += dueAmount;
        
        switch (p.status) {
          case 'paid':
            acc.total_received += paidAmount;
            break;
          case 'pending':
            acc.total_pending += dueAmount;
            break;
          case 'late':
            acc.total_late += (dueAmount - paidAmount);
            break;
          case 'missed':
            acc.total_missed += dueAmount;
            break;
        }
        return acc;
      }, {
        total_due: 0,
        total_received: 0,
        total_pending: 0,
        total_late: 0,
        total_missed: 0
      });

      setPayments(monthPayments);
      setSummary(summaryData);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching rent data:', err);
      setLoading(false);
    }
  };

  const recordPayment = async (paymentId, amount) => {
    try {
      await axios.put(`${API_URL}/api/rent-payments/${paymentId}`, {
        amount_paid: amount,
        paid_date: new Date().toISOString().split('T')[0],
        status: 'paid'
      });
      fetchData();
    } catch (err) {
      alert('Failed to record payment');
    }
  };

  const getFilteredPayments = () => {
    switch (viewMode) {
      case 'paid':
        return payments.filter(p => p.status === 'paid');
      case 'pending':
        return payments.filter(p => p.status === 'pending');
      case 'overdue':
        return payments.filter(p => p.status === 'late' || p.status === 'missed');
      default:
        return payments;
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const getDueDay = (dateStr) => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const suffix = ['th', 'st', 'nd', 'rd'][(day % 10 > 3) ? 0 : (day % 10)];
    return `${day}${suffix}`;
  };

  const isOverdue = (payment) => {
    if (payment.status !== 'pending') return false;
    const dueDate = new Date(payment.due_date);
    const today = new Date();
    return dueDate < today;
  };

  if (loading) return <div className="loading">Loading rent data...</div>;

  const filteredPayments = getFilteredPayments();

  return (
    <div className="rent-tracker-container">
      <div className="rent-tracker-header">
        <h2>Rent Tracker</h2>
        
        {/* Month Selector */}
        <div className="month-selector">
          <label>View Month:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="month-input"
          />
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="summary-stats-grid">
          <div className="summary-card">
            <div className="summary-icon">💰</div>
            <div className="summary-info">
              <label>Total Due</label>
              <span className="stat-value">£{summary.total_due.toLocaleString()}</span>
            </div>
          </div>
          <div className="summary-card received">
            <div className="summary-icon">✅</div>
            <div className="summary-info">
              <label>Received</label>
              <span className="stat-value">£{summary.total_received.toLocaleString()}</span>
            </div>
          </div>
          <div className="summary-card pending">
            <div className="summary-icon">⏳</div>
            <div className="summary-info">
              <label>Pending</label>
              <span className="stat-value">£{summary.total_pending.toLocaleString()}</span>
            </div>
          </div>
          <div className="summary-card late">
            <div className="summary-icon">⚠️</div>
            <div className="summary-info">
              <label>Late/Missed</label>
              <span className="stat-value">£{(summary.total_late + summary.total_missed).toLocaleString()}</span>
            </div>
          </div>
          <div className="summary-card collection">
            <div className="summary-icon">📊</div>
            <div className="summary-info">
              <label>Collection Rate</label>
              <span className="stat-value">{summary.total_due > 0 ? Math.round((summary.total_received / summary.total_due) * 100) : 0}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button 
          className={viewMode === 'all' ? 'active' : ''}
          onClick={() => setViewMode('all')}
        >
          All Payments ({payments.length})
        </button>
        <button 
          className={viewMode === 'paid' ? 'active' : ''}
          onClick={() => setViewMode('paid')}
        >
          Paid ({payments.filter(p => p.status === 'paid').length})
        </button>
        <button 
          className={viewMode === 'pending' ? 'active' : ''}
          onClick={() => setViewMode('pending')}
        >
          Pending ({payments.filter(p => p.status === 'pending').length})
        </button>
        <button 
          className={viewMode === 'overdue' ? 'active' : ''}
          onClick={() => setViewMode('overdue')}
        >
          Overdue ({payments.filter(p => p.status === 'late' || p.status === 'missed').length})
        </button>
      </div>

      {/* Timeline View */}
      <div className="payments-timeline">
        <h3>Payment Timeline</h3>
        
        {filteredPayments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📅</div>
            <p>No payments in this category</p>
          </div>
        ) : (
          <div className="timeline">
            {/* Group by due date */}
            {[...filteredPayments]
              .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
              .map((payment, index) => {
                const isPaid = payment.status === 'paid';
                const isOverduePayment = isOverdue(payment);
                
                return (
                  <div 
                    key={payment.id} 
                    className={`timeline-item ${payment.status} ${isOverduePayment ? 'overdue' : ''}`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="timeline-date">
                      <span className="day">{getDueDay(payment.due_date)}</span>
                      <span className="month">
                        {new Date(payment.due_date).toLocaleString('en-GB', { month: 'short' })}
                      </span>
                    </div>
                    
                    <div className="timeline-content">
                      <div className="payment-header">
                        <div className="property-tenant">
                          <span className="property-name">{payment.property?.name || 'Unknown Property'}</span>
                          <span className="tenant-name">
                            {payment.tenants?.map(t => `${t.first_name} ${t.last_name}`).join(', ') || 'No tenant'}
                          </span>
                        </div>
                        <div className="payment-amount">
                          £{parseFloat(payment.amount_due).toLocaleString()}
                        </div>
                      </div>
                      
                      <div className="payment-status-row">
                        <span className={`status-badge ${payment.status} ${isOverduePayment ? 'overdue-badge' : ''}`}>
                          {isOverduePayment ? '⚠️ OVERDUE' : payment.status.toUpperCase()}
                        </span>
                        
                        {isPaid && payment.paid_date && (
                          <span className="paid-date">
                            Paid on {formatDate(payment.paid_date)}
                          </span>
                        )}
                        
                        {payment.status === 'pending' && !isOverduePayment && (
                          <span className="due-soon">
                            Due {formatDate(payment.due_date)}
                          </span>
                        )}
                      </div>
                      
                      {payment.status === 'pending' && (
                        <button 
                          className="record-payment-btn"
                          onClick={() => recordPayment(payment.id, payment.amount_due)}
                        >
                          Record Payment
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Summary by Property */}
      {payments.length > 0 && (
        <div className="property-summary">
          <h3>Summary by Property</h3>
          <div className="property-grid">
            {Object.entries(
              payments.reduce((acc, p) => {
                const propName = p.property?.name || 'Unknown';
                if (!acc[propName]) {
                  acc[propName] = { total: 0, received: 0, pending: 0 };
                }
                acc[propName].total += parseFloat(p.amount_due);
                if (p.status === 'paid') {
                  acc[propName].received += parseFloat(p.amount_paid || 0);
                } else {
                  acc[propName].pending += parseFloat(p.amount_due);
                }
                return acc;
              }, {})
            ).map(([propName, data]) => (
              <div key={propName} className="property-card">
                <h4>{propName}</h4>
                <div className="property-stats">
                  <div>
                    <label>Total Due</label>
                    <span>£{data.total.toLocaleString()}</span>
                  </div>
                  <div className="received">
                    <label>Received</label>
                    <span>£{data.received.toLocaleString()}</span>
                  </div>
                  <div className={data.pending > 0 ? 'pending' : ''}>
                    <label>Outstanding</label>
                    <span>£{data.pending.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default RentTracker;
