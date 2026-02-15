import React, { useState } from 'react';
import axios from 'axios';
import './AddExpense.css';

const API_URL = process.env.REACT_APP_API_URL || '';

const EXPENSE_CATEGORIES = [
  { value: 'mortgage', label: '🏦 Mortgage', recurring: true },
  { value: 'council_tax', label: '🏛️ Council Tax', recurring: true },
  { value: 'utilities', label: '⚡ Utilities (Gas/Elec/Water)', recurring: true },
  { value: 'insurance', label: '🛡️ Insurance', recurring: true },
  { value: 'maintenance', label: '🔧 Maintenance', recurring: false },
  { value: 'repairs', label: '🔨 Repairs', recurring: false },
  { value: 'cleaning', label: '🧹 Cleaning', recurring: true },
  { value: 'furnishings', label: '🛋️ Furnishings/Appliances', recurring: false },
  { value: 'agency_fees', label: '👔 Agency/Letting Fees', recurring: true },
  { value: 'legal', label: '⚖️ Legal/Accounting', recurring: false },
  { value: 'other', label: '📝 Other', recurring: false }
];

const FREQUENCIES = [
  { value: 'one-off', label: 'One-off' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' }
];

function AddExpense({ propertyId, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [expense, setExpense] = useState({
    category: 'mortgage',
    description: '',
    amount: '',
    frequency: 'monthly',
    expense_date: new Date().toISOString().split('T')[0],
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
  
  const handleCategoryChange = (e) => {
    const category = EXPENSE_CATEGORIES.find(c => c.value === e.target.value);
    setExpense({
      ...expense,
      category: e.target.value,
      // Auto-suggest frequency based on category
      frequency: category?.recurring ? 'monthly' : 'one-off'
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
              <label>Frequency *</label>
              <select
                name="frequency"
                value={expense.frequency}
                onChange={handleChange}
                required
              >
                {FREQUENCIES.map(freq => (
                  <option key={freq.value} value={freq.value}>
                    {freq.label}
                  </option>
                ))}
              </select>
              {selectedCategory?.recurring && expense.frequency === 'one-off' && (
                <small className="hint">This is typically a recurring expense</small>
              )}
            </div>
          </div>
          
          <div className="form-row">
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
            
            <div className="form-group">
              <label>Date *</label>
              <input
                type="date"
                name="expense_date"
                value={expense.expense_date}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>Description</label>
            <input
              type="text"
              name="description"
              value={expense.description}
              onChange={handleChange}
              placeholder="e.g., Monthly mortgage payment, Boiler repair..."
            />
          </div>
          
          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                name="is_tax_deductible"
                checked={expense.is_tax_deductible}
                onChange={handleChange}
              />
              Tax Deductible
            </label>
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
              {loading ? 'Adding...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddExpense;
