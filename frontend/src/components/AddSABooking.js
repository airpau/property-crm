import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AddSABooking.css';

const API_URL = process.env.REACT_APP_API_URL || '';

const PLATFORMS = [
  { value: 'airbnb', label: '🏠 Airbnb', color: '#FF5A5F' },
  { value: 'vrbo', label: '🌴 VRBO', color: '#3D8B37' },
  { value: 'booking_com', label: '🔵 Booking.com', color: '#003580' },
  { value: 'direct', label: '📧 Direct', color: '#6366f1' },
  { value: 'other', label: '📝 Other', color: '#6b7280' }
];

const CURRENCY_SYMBOLS = {
  GBP: '£',
  USD: '$',
  EUR: '€',
  CAD: 'C$',
  AUD: 'A$'
};

function AddSABooking({ property, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasEditedGross, setHasEditedGross] = useState(false);
  
  const [booking, setBooking] = useState({
    reservation_id: '',
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    platform: 'airbnb',
    check_in: '',
    check_out: '',
    booking_date: new Date().toISOString().split('T')[0],
    nightly_rate: '',
    total_nights: 0,
    gross_booking_value: '',
    platform_fee: '',
    cleaning_fee: '',
    net_revenue: '',
    status: 'confirmed',
    payment_status: 'pending',
    notes: '',
    currency: property?.currency || 'GBP'
  });
  
  // Calculate nights from dates
  useEffect(() => {
    if (booking.check_in && booking.check_out) {
      const checkIn = new Date(booking.check_in);
      const checkOut = new Date(booking.check_out);
      const diffTime = checkOut - checkIn;
      const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (nights > 0) {
        setBooking(prev => ({
          ...prev,
          total_nights: nights
        }));
        
        // Auto-suggest gross if user hasn't entered it manually
        if (!hasEditedGross && !prev.gross_booking_value && prev.nightly_rate) {
          const suggested = (nights * parseFloat(prev.nightly_rate)).toFixed(2);
          setBooking(prev => ({
            ...prev,
            total_nights: nights,
            gross_booking_value: suggested
          }));
        }
      }
    }
  }, [hasEditedGross, booking.check_in, booking.check_out, booking.nightly_rate]);
  
  // Recalculate net revenue when any value changes
  useEffect(() => {
    const gross = parseFloat(booking.gross_booking_value) || 0;
    const platformFee = parseFloat(booking.platform_fee) || 0;
    const cleaningFee = parseFloat(booking.cleaning_fee) || 0;
    const net = gross - platformFee - cleaningFee;
    
    setBooking(prev => ({
      ...prev,
      net_revenue: net > 0 ? net.toFixed(2) : '0.00'
    }));
  }, [booking.gross_booking_value, booking.platform_fee, booking.cleaning_fee]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'gross_booking_value') {
      setHasEditedGross(true);
    }
    setBooking(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      const bookingData = {
        property_id: property.id,
        ...booking,
        nightly_rate: parseFloat(booking.nightly_rate) || 0,
        total_nights: parseInt(booking.total_nights) || 0,
        gross_booking_value: parseFloat(booking.gross_booking_value) || 0,
        platform_fee: parseFloat(booking.platform_fee) || 0,
        cleaning_fee: parseFloat(booking.cleaning_fee) || 0,
        net_revenue: parseFloat(booking.net_revenue) || 0
      };
      
      await axios.post(
        `${API_URL}/api/sa-bookings`,
        bookingData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setLoading(false);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating booking:', err);
      setError(err.response?.data?.error || 'Failed to create booking');
      setLoading(false);
    }
  };
  
  // Calculate PM deductions based on net revenue
  const calculatePMDeduction = () => {
    if (!property.is_managed) return null;
    
    const net = parseFloat(booking.net_revenue) || 0;
    const pmPercent = parseFloat(property.management_fee_percent) || 0;
    
    // PM fee is based on net revenue (after platform and cleaning fees already deducted)
    const pmFee = (net * pmPercent) / 100;
    
    return {
      pmFee,
      yourNet: net - pmFee,
      pmPercent
    };
  };
  
  const pmDeduction = calculatePMDeduction();
  
  // Quick fill helpers
  const fillSuggestedGross = () => {
    if (booking.nightly_rate && booking.total_nights) {
      const suggested = (booking.total_nights * parseFloat(booking.nightly_rate)).toFixed(2);
      setBooking(prev => ({ ...prev, gross_booking_value: suggested }));
    }
  };
  
  const fillAutoCleaning = () => {
    if (property.fixed_cleaning_fee) {
      setBooking(prev => ({ ...prev, cleaning_fee: property.fixed_cleaning_fee }));
    }
  };
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content sa-booking-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Booking - {property.name || property.address_line_1}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h3>Guest Details</h3>
            
            <div className="form-group">
              <label>Reservation ID</label>
              <input
                type="text"
                name="reservation_id"
                value={booking.reservation_id}
                onChange={handleChange}
                placeholder="e.g., HMABC123"
              />
            </div>
            
            <div className="form-group">
              <label>Guest Name *</label>
              <input
                type="text"
                name="guest_name"
                value={booking.guest_name}
                onChange={handleChange}
                placeholder="e.g., John Smith"
                required
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Guest Email</label>
                <input
                  type="email"
                  name="guest_email"
                  value={booking.guest_email}
                  onChange={handleChange}
                  placeholder="guest@email.com"
                />
              </div>
              
              <div className="form-group">
                <label>Guest Phone</label>
                <input
                  type="tel"
                  name="guest_phone"
                  value={booking.guest_phone}
                  onChange={handleChange}
                  placeholder="+44..."
                />
              </div>
            </div>
          </div>
          
          <div className="form-section">
            <h3>Booking Details</h3>
            
            <div className="platform-selector">
              <label>Platform *</label>
              <div className="platform-buttons">
                {PLATFORMS.map(plat => (
                  <button
                    key={plat.value}
                    type="button"
                    className={`platform-btn ${booking.platform === plat.value ? 'selected' : ''}`}
                    style={{ 
                      borderColor: booking.platform === plat.value ? plat.color : '#e5e7eb',
                      background: booking.platform === plat.value ? `${plat.color}15` : 'white'
                    }}
                    onClick={() => setBooking({ ...booking, platform: plat.value })}
                  >
                    {plat.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group" style={{flex: '0 0 150px'}}>
                <label>Currency *</label>
                <select
                  name="currency"
                  value={booking.currency}
                  onChange={handleChange}
                  required
                  className="currency-select"
                >
                  <option value="GBP">🇬🇧 GBP (£)</option>
                  <option value="USD">🇺🇸 USD ($)</option>
                  <option value="EUR">🇪🇺 EUR (€)</option>
                  <option value="CAD">🇨🇦 CAD ($)</option>
                  <option value="AUD">🇦🇺 AUD ($)</option>
                </select>
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Check-in Date *</label>
                <input
                  type="date"
                  name="check_in"
                  value={booking.check_in}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Check-out Date *</label>
                <input
                  type="date"
                  name="check_out"
                  value={booking.check_out}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Nights</label>
                <input
                  type="number"
                  name="total_nights"
                  value={booking.total_nights}
                  readOnly
                  style={{ background: '#f3f4f6' }}
                />
              </div>
              
              <div className="form-group">
                <label>Booking Date</label>
                <input
                  type="date"
                  name="booking_date"
                  value={booking.booking_date}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
          
          <div className="form-section">
            <h3>Financials</h3>
            <p className="section-hint" style={{color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem'}}>
              Enter values as shown on your platform statement. Net is calculated automatically.
            </p>
            
            <div className="form-row">
              <div className="form-group">
                <label>Nightly Rate ({CURRENCY_SYMBOLS[booking.currency]})</label>
                <input
                  type="number"
                  name="nightly_rate"
                  value={booking.nightly_rate}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  placeholder="For reference"
                />
              </div>
              
              <div className="form-group">
                <label>Gross Booking Value ({CURRENCY_SYMBOLS[booking.currency]}) *</label>
                <div style={{display: 'flex', gap: '8px'}}>
                  <input
                    type="number"
                    name="gross_booking_value"
                    value={booking.gross_booking_value}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    placeholder="Total from platform"
                    required
                    style={{flex: 1}}
                  />
                  {booking.nightly_rate && booking.total_nights && (
                    <button 
                      type="button" 
                      onClick={fillSuggestedGross}
                      className="btn-suggest"
                      title="Autofill: nights × rate"
                    >
                      ✨
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Platform Fee ({CURRENCY_SYMBOLS[booking.currency]})</label>
                <input
                  type="number"
                  name="platform_fee"
                  value={booking.platform_fee}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  placeholder="Service fee"
                />
              </div>
              
              <div className="form-group">
                <label>Cleaning Fee Paid ({CURRENCY_SYMBOLS[booking.currency]})</label>
                <div style={{display: 'flex', gap: '8px'}}>
                  <input
                    type="number"
                    name="cleaning_fee"
                    value={booking.cleaning_fee}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    placeholder="Amount paid out"
                    style={{flex: 1}}
                  />
                  {property.is_managed && property.fixed_cleaning_fee && (
                    <button 
                      type="button" 
                      onClick={fillAutoCleaning}
                      className="btn-suggest"
                      title={`Autofill: £${property.fixed_cleaning_fee}`}
                    >
                      🧹
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Net Revenue ({CURRENCY_SYMBOLS[booking.currency]})</label>
                <input
                  type="number"
                  name="net_revenue"
                  value={booking.net_revenue}
                  readOnly
                  style={{ 
                    background: '#ecfdf5', 
                    color: '#059669',
                    fontWeight: 700,
                    fontSize: '1.1rem'
                  }}
                />
                <small style={{color: '#6b7280', display: 'block', marginTop: '4px'}}>
                  Gross − Platform Fee − Cleaning Fee
                </small>
              </div>
            </div>
            
            <div className="form-group checkbox">
              <label>
                <input
                  type="checkbox"
                  name="payment_received"
                  checked={booking.payment_status === 'received'}
                  onChange={(e) => setBooking(prev => ({ 
                    ...prev, 
                    payment_status: e.target.checked ? 'received' : 'pending'
                  }))}
                />
                Payment Already Received
              </label>
            </div>
          </div>
          
          {property.is_managed && pmDeduction && parseFloat(booking.net_revenue) > 0 && (
            <div className="form-section pm-summary">
              <h3>🏢 Property Manager Deduction</h3>
              <div className="pm-calc">
                <div className="pm-row">
                  <span>Net Revenue (your income):</span>
                  <span>£{parseFloat(booking.net_revenue || 0).toFixed(2)}</span>
                </div>
                <div className="pm-row">
                  <span>− PM Fee ({pmDeduction.pmPercent}%):</span>
                  <span>£{pmDeduction.pmFee.toFixed(2)}</span>
                </div>
                <div className="pm-row total highlight">
                  <span>Your Final Take-Home:</span>
                  <span>£{pmDeduction.yourNet.toFixed(2)}</span>
                </div>
              </div>
              <p className="pm-note" style={{fontSize: '0.8rem', color: '#6b7280', marginTop: '8px'}}>
                PM fee calculated on net revenue after platform & cleaning fees.
              </p>
            </div>
          )}
          
          {error && (
            <div className="error-message" style={{color: '#dc2626', marginBottom: '1rem', padding: '0.75rem', background: '#fef2f2', borderRadius: '6px'}}>
              {error}
            </div>
          )}
          
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Add Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddSABooking;
