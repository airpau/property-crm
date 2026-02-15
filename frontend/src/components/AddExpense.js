import React, { useState } from 'react';
import axios from 'axios';
import './AddExpense.css';

const API_URL = process.env.REACT_APP_API_URL || '';

const EXPENSE_CATEGORIES = [
  { value: 'mortgage', label: '🏦 Mortgage', defaultRecurring: true },
  { value: 'council_tax', label: '🏛️ Council Tax', defaultRecurring: true },
  { value: 'utilities', label: '⚡ Utilities (Gas/Elec/Water)', defaultRecurring: true },
  { value: 'insurance', label: '🛡️ Insurance', defaultRecurring: true },
  { value: 'finance', label: '💳 Finance Payments', defaultRecurring: true },
  { value: 'maintenance', label: '🔧 Maintenance', defaultRecurring: false },
  { value: 'repairs', label: '🔨 Repairs', defaultRecurring: false },
  { value: 'cleaning', label: '🧹 Cleaning', defaultRecurring: true },
  { value: 'agency_fees', label: '👔 Agency/Letting Fees', defaultRecurring: true },
  { value: 'legal', label: '⚖️ Legal/Accounting', defaultRecurring: false },
  { value: 'other', label: '📝 Other', defaultRecurring: false }
];

function AddExpense({ propertyId, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [expense, setExpense] = useState({
    category: 'mortgage',
    description: '',
    amount: '',
    is_recurring: true,
    frequency: 'monthly',
    expense_date: new Date().toISOString().split('T')[0],
    end_date: '',
    receipt_url: '',
    is_tax_deductible: true
  });
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setExpense({ 
      ...expense, 
      [name]: type === 'checkbox' ? checked : value 
    });
  };
  
  const handleRecurringChange = (isRecurring) => {
    setExpense({
      ...expense,
      is_recurring: isRecurring,
      frequency: isRecurring ? 'monthly' : 'one-off',
      end_date: isRecurring ? expense.end_date : ''
    });
  };
  
  const handleCategoryChange = (e) => {
    const category = EXPENSE_CATEGORIES.find(c => c.value === e.target.value);
    const isRecurring = category?.defaultRecurring || false;
    setExpense({
      ...expense,
      category: e.target.value,
      is_recurring: isRecurring,
      frequency: isRecurring ? 'monthly' : 'one-off',
      end_date: isRecurring ? expense.end_date : ''
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      await axios.post(
        `${API_URL}/api/expenses`,
        {
          property_id: propertyId,
          category: expense.category,
          description: expense.description,
          amount: parseFloat(expense.amount),
          frequency: expense.frequency,
          expense_date: expense.expense_date,
          end_date: expense.end_date || null,
          receipt_url: expense.receipt_url || null,
          is_tax_deductible: expense.is_tax_deductible
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setLoading(false);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating expense:', err);
      setError(err.response?.data?.error || 'Failed to create expense');
      setLoading(false);
    }
  };
  
  const selectedCategory = EXPENSE_CATEGORIES.find(c => c.value === expense.category);
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content expense-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Expense</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {/* Category */}
          <div className="form-row">
            <div className="form-group">
              <label>Category *</label>
              <select
                name="category"
                value={expense.category}
                onChange={handleCategoryChange}
                required
              >
                {EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Amount (£) *</label>
              <input
                type="number"
                name="amount"
                value={expense.amount}
                onChange={handleChange}
                placeholder="e.g., 850.00"
                step="0.01"
                min="0"
                required
              />
            </div>
          </div>
          
          {/* Recurring vs One-Off Toggle */}
          <div className="form-section recurring-section">
            <label>Expense Type</label>
            <div className="recurring-toggle">
              <button
                type="button"
                className={`toggle-btn ${!expense.is_recurring ? 'active' : ''}`}
                onClick={() => handleRecurringChange(false)}
              >
                <span className="toggle-icon">📅</span>
                <span className="toggle-label">One-Off</span>
                <span className="toggle-desc">Single payment</span>
              </button>
              
              <button
                type="button"
                className={`toggle-btn ${expense.is_recurring ? 'active' : ''}`}
                onClick={() => handleRecurringChange(true)}
              >
                <span className="toggle-icon">🔄</span>
                <span className="toggle-label">Recurring</span>
                <span className="toggle-desc">Regular payment</span>
              </button>
            </div>
          </div>
          
          {/* Frequency (only for recurring) */}
          {expense.is_recurring && (
            <div className="form-row">
              <div className="form-group">
                <label>Frequency *</label>
                <select
                  name="frequency"
                  value={expense.frequency}
                  onChange={handleChange}
                  required
                >
                  <option value="monthly">📅 Monthly</option>
                  <option value="quarterly">📊 Quarterly</option>
                  <option value="yearly">📆 Yearly</option>
                </select>
                {selectedCategory?.defaultRecurring && (
                  <small className="hint">{selectedCategory.label.split(' ')[0]} payments are typically monthly</small>
                )}
              </div>
              
              <div className="form-group">
                <label>End Date (Optional)</label>
                <input
                  type="date"
                  name="end_date"
                  value={expense.end_date}
                  onChange={handleChange}
                  placeholder="When payments stop"
                />
                <small className="hint">Leave blank if ongoing indefinitely</small>
              </div>
            </div>
          )}
          
          {/* Dates */}
          <div className="form-row">
            <div className="form-group">
              <label>{expense.is_recurring ? 'First Payment Date *' : 'Payment Date *'}</label>
              <input
                type="date"
                name="expense_date"
                value={expense.expense_date}
                onChange={handleChange}
                required
              />
            </div>
            
            {!expense.is_recurring && (
              <div className="form-group">
                <label style={{visibility: 'hidden'}}>Placeholder</label>
                <div className="one-off-badge">📅 One-time expense on {new Date(expense.expense_date).toLocaleDateString('en-GB')}</div>
              </div>
            )}
          </div>
          
          {/* Description */}
          <div className="form-group">
            <label>Description</label>
            <input
              type="text"
              name="description"
              value={expense.description}
              onChange={handleChange}
              placeholder={expense.is_recurring ? "e.g., Monthly mortgage to Barclays" : "e.g., Kitchen repair - new tap"}
            />
          </div>
          
          {/* Tax Deductible */}
          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                name="is_tax_deductible"
                checked={expense.is_tax_deductible}
                onChange={handleChange}
              />
              ✅ Tax Deductible
            </label>
            <small className="hint">Most property expenses are tax deductible</small>
          </div>
          
          {/* Summary Preview */}
          {expense.is_recurring && expense.amount && (
            <div className="expense-preview">
              <h4>📊 Payment Preview</h4>
              <div className="preview-row">
                <span>Amount:</span>
                <strong>£{parseFloat(expense.amount).toFixed(2)} / {expense.frequency}</strong>
              </div>
              <div className="preview-row">
                <span>Starts:</span>
                <strong>{new Date(expense.expense_date).toLocaleDateString('en-GB')}</strong>
              </div>
              {expense.end_date && (
                <div className="preview-row">
                  <span>Ends:</span>
                  <strong>{new Date(expense.end_date).toLocaleDateString('en-GB')}</strong>
                </div>
              )}
              {!expense.end_date && (
                <div className="preview-row">
                  <span>Ends:</span>
                  <strong>Ongoing (no end date)</strong>
                </div>
              )}
            </div>
          )}
          
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
              {loading ? 'Adding...' : expense.is_recurring ? 'Add Recurring Expense' : 'Add One-Off Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddExpense;
