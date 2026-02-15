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

function AddSABooking({ property, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
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
    net_revenue: '',
    status: 'confirmed',
    payment_status: 'pending',
    notes: ''
  });
  
  // Auto-calculate nights and totals when dates change
  useEffect(() => {
    if (booking.check_in && booking.check_out) {
      const checkIn = new Date(booking.check_in);
      const checkOut = new Date(booking.check_out);
      const diffTime = Math.abs(checkOut - checkIn);
      const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      setBooking(prev => ({
        ...prev,
        total_nights: nights,
        gross_booking_value: (nights * (parseFloat(prev.nightly_rate) || 0)).toFixed(2)
      }));
    }
  }, [booking.check_in, booking.check_out, booking.nightly_rate]);
  
  // Auto-calculate net revenue
  useEffect(() => {
    const gross = parseFloat(booking.gross_booking_value) || 0;
    const fee = parseFloat(booking.platform_fee) || 0;
    setBooking(prev => ({
      ...prev,
      net_revenue: (gross - fee).toFixed(2)
    }));
  }, [booking.gross_booking_value, booking.platform_fee]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setBooking({ ...booking, [name]: value });
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
        nightly_rate: parseFloat(booking.nightly_rate),
        total_nights: parseInt(booking.total_nights),
        gross_booking_value: parseFloat(booking.gross_booking_value),
        platform_fee: parseFloat(booking.platform_fee) || 0,
        net_revenue: parseFloat(booking.net_revenue)
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
  
  const calculatePMDeduction = () => {
    if (!property.is_managed) return 0;
    
    const net = parseFloat(booking.net_revenue) || 0;
    const cleaningFee = parseFloat(property.fixed_cleaning_fee) || 0;
    const pmPercent = parseFloat(property.management_fee_percent) || 0;
    
    const revenueAfterCleaning = Math.max(0, net - cleaningFee);
    const pmFee = (revenueAfterCleaning * pmPercent) / 100;
    
    return {
      cleaningFee,
      pmFee,
      total: cleaningFee + pmFee,
      yourNet: net - cleaningFee - pmFee
    };
  };
  
  const pmDeduction = calculatePMDeduction();
  
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
            
            <div className="form-row">
              <div className="form-group">
                <label>Nightly Rate (£) *</label>
                <input
                  type="number"
                  name="nightly_rate"
                  value={booking.nightly_rate}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Gross Booking Value (£)</label>
                <input
                  type="number"
                  name="gross_booking_value"
                  value={booking.gross_booking_value}
                  readOnly
                  style={{ background: '#f3f4f6', fontWeight: 600 }}
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Platform Fee (£)</label>
                <input
                  type="number"
                  name="platform_fee"
                  value={booking.platform_fee}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                />
              </div>
              
              <div className="form-group">
                <label>Net Revenue (£)</label>
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
              </div>
            </div>
            
            <div className="form-group checkbox">
              <label>
                <input
                  type="checkbox"
                  name="payment_received"
                  checked={booking.payment_status === 'received'}
                  onChange={(e) => setBooking({ 
                    ...booking, 
                    payment_status: e.target.checked ? 'received' : 'pending',
                    received_date: e.target.checked ? new Date().toISOString().split('T')[0] : ''
                  })}
                />
                Payment Already Received
              </label>
            </div>
          </div>
          
          {property.is_managed && pmDeduction.total > 0 && (
            <div className="form-section pm-summary">
              <h3>🏢 Property Manager Deduction</h3>
              <div className="pm-calc">
                <div className="pm-row">
                  <span>Net Revenue:</span>
                  <span>£{parseFloat(booking.net_revenue || 0).toFixed(2)}</span>
                </div>
                <div className="pm-row">
                  <span>- Cleaning Fee:</span>
                  <span>£{pmDeduction.cleaningFee.toFixed(2)}</span>
                </div>
                <div className="pm-row">
                  <span>- PM Fee ({property.management_fee_percent}%):</span>
                  <span>£{pmDeduction.pmFee.toFixed(2)}</span>
                </div>
                <div className="pm-row total">
                  <span>Total PM Deduction:</span>
                  <span>£{pmDeduction.total.toFixed(2)}</span>
                </div>
                <div className="pm-row net">
                  <span>Your Net:</span>
                  <span>£{pmDeduction.yourNet.toFixed(2)}</span>
                </div>
              </div>
              <small className="hint">
                PM: {property.property_manager_name || 'Not named'}
              </small>
            </div>
          )}
          
          <div className="form-group">
            <label>Notes</label>
            <textarea
              name="notes"
              value={booking.notes}
              onChange={handleChange}
              rows="2"
              placeholder="Any special requests or notes..."
            />
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
              {loading ? 'Adding...' : 'Add Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddSABooking;
