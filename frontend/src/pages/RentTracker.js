import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '';

function RentTracker() {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [paymentsRes, summaryRes] = await Promise.all([
        axios.get(`${API_URL}/api/rent-payments`),
        axios.get(`${API_URL}/api/rent-payments/summary/current-month`)
      ]);
      setPayments(paymentsRes.data);
      setSummary(summaryRes.data);
      setLoading(false);
    } catch (err) {
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

  if (loading) return <div className="loading">Loading rent data...</div>;

  return (
    <div className="rent-tracker">
      <h2>Rent Tracker</h2>
      
      {summary && (
        <div className="rent-summary-cards">
          <div className="summary-card received">
            <h3>Received</h3>
            <div className="amount">£{parseFloat(summary.total_received).toLocaleString()}</div>
          </div>
          <div className="summary-card pending">
            <h3>Pending</h3>
            <div className="amount">£{parseFloat(summary.total_pending).toLocaleString()}</div>
          </div>
          <div className="summary-card arrears">
            <h3>Arrears</h3>
            <div className="amount">£{parseFloat(summary.total_late + summary.total_missed).toLocaleString()}</div>
          </div>
        </div>
      )}

      <h3>Recent Payments</h3>
      <table className="payments-table">
        <thead>
          <tr>
            <th>Property</th>
            <th>Tenant</th>
            <th>Due Date</th>
            <th>Amount Due</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {payments.map(payment => (
            <tr key={payment.id}>
              <td>{payment.property_name}</td>
              <td>
                {payment.tenants?.map(t => `${t.first_name} ${t.last_name}`).join(', ')}
              </td>
              <td>{new Date(payment.due_date).toLocaleDateString()}</td>
              <td>£{payment.amount_due}</td>
              <td>
                <span className={`status-badge status-${payment.status}`}>
                  {payment.status}
                </span>
              </td>
              <td>
                {payment.status === 'pending' && (
                  <button 
                    onClick={() => recordPayment(payment.id, payment.amount_due)}
                    className="record-btn"
                  >
                    Record Payment
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default RentTracker;