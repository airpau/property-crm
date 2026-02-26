import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './MTDDashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://property-crm-api-8t0r.onrender.com';

const QUARTER_LABELS = {
  1: 'Q1 (Apr 6 – Jul 5)',
  2: 'Q2 (Jul 6 – Oct 5)',
  3: 'Q3 (Oct 6 – Jan 5)',
  4: 'Q4 (Jan 6 – Apr 5)',
};

function MTDDashboard() {
  const { session } = useAuth();
  const [taxYear, setTaxYear] = useState('2026-27');
  const [quarters, setQuarters] = useState([]);
  const [selectedQuarter, setSelectedQuarter] = useState(null);
  const [quarterDetail, setQuarterDetail] = useState(null);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token}`,
  };

  const fetchQuarters = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/mtd/quarters?tax_year=${taxYear}`, { headers });
      if (!res.ok) throw new Error('Failed to load quarters');
      const data = await res.json();
      setQuarters(data);
    } catch (err) {
      setError(err.message);
    }
  }, [taxYear, session]);

  const fetchProperties = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/properties`, { headers });
      if (!res.ok) throw new Error('Failed to load properties');
      const data = await res.json();
      setProperties(data);
    } catch (err) {
      console.error('Failed to load properties:', err);
    }
  }, [session]);

  useEffect(() => {
    Promise.all([fetchQuarters(), fetchProperties()]).finally(() => setLoading(false));
  }, [fetchQuarters, fetchProperties]);

  const fetchQuarterDetail = async (quarterId) => {
    try {
      const res = await fetch(`${API_URL}/api/mtd/quarters/${quarterId}/summary`, { headers });
      if (!res.ok) throw new Error('Failed to load quarter detail');
      const data = await res.json();
      setQuarterDetail(data);
      setSelectedQuarter(quarterId);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleExportCSV = async (quarterId) => {
    try {
      const res = await fetch(`${API_URL}/api/mtd/quarters/${quarterId}/export?format=csv`, { headers });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mtd-quarter-${quarterId}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      draft: { bg: '#fef3c7', color: '#92400e', label: 'Draft' },
      ready: { bg: '#dbeafe', color: '#1e40af', label: 'Ready' },
      submitted: { bg: '#d1fae5', color: '#065f46', label: 'Submitted' },
      overdue: { bg: '#fef2f2', color: '#dc2626', label: 'Overdue' },
    };
    const s = styles[status] || styles.draft;
    return <span className="mtd-status-badge" style={{ background: s.bg, color: s.color }}>{s.label}</span>;
  };

  if (loading) return <div className="mtd-dash-loading">Loading MTD data...</div>;

  return (
    <div className="mtd-dashboard">
      <div className="mtd-dash-header">
        <div>
          <h1>📊 Making Tax Digital</h1>
          <p>Quarterly income &amp; expense reports for HMRC</p>
        </div>
        <div className="mtd-dash-controls">
          <select value={taxYear} onChange={(e) => setTaxYear(e.target.value)}>
            <option value="2026-27">2026/27</option>
            <option value="2027-28">2027/28</option>
          </select>
        </div>
      </div>

      {error && <div className="mtd-dash-error">{error}</div>}

      {/* Quarter Cards */}
      <div className="mtd-quarters-grid">
        {[1, 2, 3, 4].map((q) => {
          const quarter = quarters.find((qr) => qr.quarter_number === q);
          return (
            <div
              key={q}
              className={`mtd-quarter-card ${selectedQuarter === quarter?.id ? 'active' : ''}`}
              onClick={() => quarter && fetchQuarterDetail(quarter.id)}
            >
              <div className="mtd-quarter-label">{QUARTER_LABELS[q]}</div>
              {quarter ? (
                <>
                  {getStatusBadge(quarter.status)}
                  <div className="mtd-quarter-amounts">
                    <div className="mtd-q-income">
                      <label>Income</label>
                      <span>£{(quarter.total_income || 0).toLocaleString()}</span>
                    </div>
                    <div className="mtd-q-expense">
                      <label>Expenses</label>
                      <span>£{(quarter.total_expenses || 0).toLocaleString()}</span>
                    </div>
                    <div className="mtd-q-profit">
                      <label>Profit</label>
                      <span>£{((quarter.total_income || 0) - (quarter.total_expenses || 0)).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="mtd-quarter-actions">
                    <button onClick={(e) => { e.stopPropagation(); handleExportCSV(quarter.id); }} className="btn-sm">
                      📥 Export CSV
                    </button>
                  </div>
                </>
              ) : (
                <div className="mtd-quarter-empty">No data yet</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quarter Detail */}
      {quarterDetail && (
        <div className="mtd-detail-section">
          <h2>Quarter Breakdown</h2>
          
          {/* By Property */}
          <div className="mtd-detail-grid">
            {quarterDetail.by_property?.map((prop) => (
              <div key={prop.property_id} className="mtd-property-card">
                <h3>{prop.property_name || 'Unknown Property'}</h3>
                <div className="mtd-prop-summary">
                  <div className="mtd-prop-income">
                    <label>Income</label>
                    <span>£{(prop.total_income || 0).toLocaleString()}</span>
                  </div>
                  <div className="mtd-prop-expense">
                    <label>Expenses</label>
                    <span>£{(prop.total_expenses || 0).toLocaleString()}</span>
                  </div>
                  <div className="mtd-prop-profit">
                    <label>Profit</label>
                    <span>£{((prop.total_income || 0) - (prop.total_expenses || 0)).toLocaleString()}</span>
                  </div>
                </div>

                {/* Category breakdown */}
                {prop.income_categories?.length > 0 && (
                  <div className="mtd-categories">
                    <h4>Income</h4>
                    {prop.income_categories.map((cat, i) => (
                      <div key={i} className="mtd-cat-row">
                        <span>{cat.category_name}</span>
                        <span>£{(cat.amount || 0).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
                {prop.expense_categories?.length > 0 && (
                  <div className="mtd-categories">
                    <h4>Expenses</h4>
                    {prop.expense_categories.map((cat, i) => (
                      <div key={i} className="mtd-cat-row">
                        <span>{cat.category_name}</span>
                        <span>£{(cat.amount || 0).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default MTDDashboard;
