import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Reports.css';

const API_URL = process.env.REACT_APP_API_URL || '';

function Reports() {
  const [reportType, setReportType] = useState('income');
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/properties`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProperties(res.data || []);
    } catch (err) {
      console.error('Error fetching properties:', err);
    }
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = {
        start_date: startDate,
        end_date: endDate,
        property_id: selectedProperty === 'all' ? undefined : selectedProperty
      };

      const endpoint = reportType === 'income' ? '/api/reports/income' : '/api/reports/expenses';
      const res = await axios.get(`${API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setReportData(res.data);
    } catch (err) {
      console.error('Error generating report:', err);
      alert('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!reportData) return;
    
    let csv = '';
    if (reportType === 'income') {
      csv = 'Date,Property,Tenant,Amount,Status\n';
      reportData.payments.forEach(p => {
        csv += `${p.paid_date || p.due_date},${p.property_name},"${p.tenant_name}",${p.amount},${p.status}\n`;
      });
      csv += `\nTotal,,,${reportData.total},\n`;
    } else {
      csv = 'Date,Property,Category,Description,Amount\n';
      reportData.expenses.forEach(e => {
        csv += `${e.expense_date},${e.property_name},${e.category},"${e.description}",${e.amount}\n`;
      });
      csv += `\nTotal,,,,${reportData.total},\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}-report-${startDate}-to-${endDate}.csv`;
    a.click();
  };

  const formatCurrency = (amount) => `£${parseFloat(amount || 0).toFixed(2)}`;
  const formatDate = (date) => new Date(date).toLocaleDateString('en-GB');

  return (
    <div className="reports-container">
      <h2>📊 Financial Reports</h2>
      
      <div className="report-filters">
        <div className="filter-group">
          <label>Report Type</label>
          <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
            <option value="income">Income / Rent Payments</option>
            <option value="expenses">Expenses / Costs</option>
            <option value="net">Net Income (Income - Expenses)</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Property</label>
          <select value={selectedProperty} onChange={(e) => setSelectedProperty(e.target.value)}>
            <option value="all">All Properties</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>

        <div className="filter-group">
          <label>End Date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>

        <button className="generate-btn" onClick={generateReport} disabled={loading}>
          {loading ? '⏳ Generating...' : '🔍 Generate Report'}
        </button>
      </div>

      {reportData && (
        <div className="report-results">
          <div className="report-header">
            <h3>{reportType === 'income' ? '💰 Income Report' : '💸 Expense Report'}</h3>
            <button className="export-btn" onClick={exportCSV}>📥 Export CSV</button>
          </div>

          {reportType === 'income' && (
            <>
              <div className="summary-cards">
                <div className="summary-card">
                  <span className="label">Total Received</span>
                  <span className="value">{formatCurrency(reportData.total)}</span>
                </div>
                <div className="summary-card">
                  <span className="label">Payments</span>
                  <span className="value">{reportData.payments?.length || 0}</span>
                </div>
              </div>

              <table className="report-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Property</th>
                    <th>Tenant</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.payments?.map((p, idx) => (
                    <tr key={idx}>
                      <td>{formatDate(p.paid_date || p.due_date)}</td>
                      <td>{p.property_name}</td>
                      <td>{p.tenant_name}</td>
                      <td>{formatCurrency(p.amount)}</td>
                      <td><span className={`status-${p.status}`}>{p.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {reportType === 'expenses' && (
            <>
              <div className="summary-cards">
                <div className="summary-card">
                  <span className="label">Total Expenses</span>
                  <span className="value">{formatCurrency(reportData.total)}</span>
                </div>
                <div className="summary-card">
                  <span className="label">Entries</span>
                  <span className="value">{reportData.expenses?.length || 0}</span>
                </div>
              </div>

              <table className="report-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Property</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.expenses?.map((e, idx) => (
                    <tr key={idx}>
                      <td>{formatDate(e.expense_date)}</td>
                      <td>{e.property_name}</td>
                      <td>{e.category}</td>
                      <td>{e.description}</td>
                      <td>{formatCurrency(e.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default Reports;
