const express = require('express');
const router = express.Router();

// GET all SA bookings for a property
router.get('/property/:propertyId', async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { startDate, endDate, status, platform } = req.query;
    
    let query = req.supabase
      .from('sa_bookings')
      .select('*')
      .eq('property_id', propertyId)
      .eq('landlord_id', req.landlord_id)
      .order('check_in', { ascending: false });
    
    if (startDate) query = query.gte('check_in', startDate);
    if (endDate) query = query.lte('check_out', endDate);
    if (status) query = query.eq('status', status);
    if (platform) query = query.eq('platform', platform);
    
    const { data: bookings, error } = await query;
    
    if (error) throw error;
    
    res.json(bookings || []);
  } catch (err) {
    console.error('Error fetching SA bookings:', err);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// GET monthly revenue forecast for a property
router.get('/property/:propertyId/forecast', async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { year } = req.query;
    
    const targetYear = year || new Date().getFullYear();
    
    // Get all bookings for the year
    const { data: bookings, error } = await req.supabase
      .from('sa_bookings')
      .select('*')
      .eq('property_id', propertyId)
      .eq('landlord_id', req.landlord_id)
      .gte('check_in', `${targetYear}-01-01`)
      .lte('check_in', `${targetYear}-12-31`);
    
    if (error) throw error;
    
    // Calculate monthly totals
    const monthly = {};
    for (let i = 1; i <= 12; i++) {
      monthly[i] = {
        month: i,
        monthName: new Date(targetYear, i - 1, 1).toLocaleString('en-GB', { month: 'long' }),
        confirmed: 0,
        pending_payment: 0,
        received: 0,
        total_nights: 0,
        bookings: 0
      };
    }
    
    (bookings || []).forEach(booking => {
      const checkIn = new Date(booking.check_in);
      const month = checkIn.getMonth() + 1;
      
      monthly[month].bookings++;
      monthly[month].total_nights += booking.total_nights;
      
      if (booking.status !== 'cancelled') {
        monthly[month].confirmed += parseFloat(booking.net_revenue) || 0;
        
        if (booking.payment_status === 'received') {
          monthly[month].received += parseFloat(booking.net_revenue) || 0;
        } else {
          monthly[month].pending_payment += parseFloat(booking.net_revenue) || 0;
        }
      }
    });
    
    res.json(Object.values(monthly));
  } catch (err) {
    console.error('Error fetching forecast:', err);
    res.status(500).json({ error: 'Failed to fetch forecast' });
  }
});

// GET property manager payment summary
router.get('/property/:propertyId/pm-summary', async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { month, year } = req.query;
    
    const targetMonth = month || (new Date().getMonth() + 1);
    const targetYear = year || new Date().getFullYear();
    
    // Get property details for PM calculations
    const { data: property, error: propError } = await req.supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .eq('landlord_id', req.landlord_id)
      .single();
    
    if (propError || !property) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    // Get all bookings for the month
    const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
    const endDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-31`;
    
    const { data: bookings, error } = await req.supabase
      .from('sa_bookings')
      .select('*')
      .eq('property_id', propertyId)
      .eq('landlord_id', req.landlord_id)
      .gte('check_in', startDate)
      .lte('check_in', endDate)
      .neq('status', 'cancelled');
    
    if (error) throw error;
    
    // Calculate PM totals
    let totalNetRevenue = 0;
    let totalCleaningFees = 0;
    let totalPMFees = 0;
    let totalPMDeduction = 0;
    
    (bookings || []).forEach(booking => {
      totalNetRevenue += parseFloat(booking.net_revenue) || 0;
      totalCleaningFees += parseFloat(booking.cleaning_fee) || 0;
      totalPMFees += parseFloat(booking.pm_fee_amount) || 0;
      totalPMDeduction += parseFloat(booking.total_pm_deduction) || 0;
    });
    
    // Calculate what PM should be paid
    const pmShouldPay = totalPMDeduction;
    
    // Get already paid amount
    const { data: paidBookings } = await req.supabase
      .from('sa_bookings')
      .select('total_pm_deduction')
      .eq('property_id', propertyId)
      .eq('landlord_id', req.landlord_id)
      .eq('pm_payment_status', 'paid')
      .gte('check_in', startDate)
      .lte('check_in', endDate);
    
    const alreadyPaid = (paidBookings || []).reduce((sum, b) => 
      sum + (parseFloat(b.total_pm_deduction) || 0), 0);
    
    res.json({
      month: targetMonth,
      year: targetYear,
      total_bookings: bookings?.length || 0,
      total_net_revenue: totalNetRevenue,
      total_cleaning_fees: totalCleaningFees,
      total_pm_fees: totalPMFees,
      total_pm_deduction: totalPMDeduction,
      pm_should_pay: pmShouldPay,
      already_paid: alreadyPaid,
      remaining_to_pay: pmShouldPay - alreadyPaid,
      property_manager: property.property_manager_name,
      payment_timing: getPaymentTiming(property)
    });
  } catch (err) {
    console.error('Error fetching PM summary:', err);
    res.status(500).json({ error: 'Failed to fetch PM summary' });
  }
});

// Helper function
function getPaymentTiming(property) {
  // Based on property address, return payment rules
  const address = property.address_line_1 || '';
  
  if (address.includes('Westbourne Terrace') || address.includes('Devonshire Street')) {
    return {
      description: '15% of net + cleaning fee, paid following month',
      cleaning_fee: property.fixed_cleaning_fee || 0,
      percentage: property.management_fee_percent || 15,
      timing: 'Following month'
    };
  }
  
  if (address.includes('Exuma') || address.includes('Bahamas')) {
    return {
      description: '18% of net + $285 cleaning, paid last day of month',
      cleaning_fee: property.fixed_cleaning_fee || 285,
      percentage: property.management_fee_percent || 18,
      timing: 'Last day of month',
      currency: 'USD'
    };
  }
  
  return {
    description: `${property.management_fee_percent || 0}% of net`,
    percentage: property.management_fee_percent || 0,
    timing: 'As agreed'
  };
}

// CREATE booking
router.post('/', async (req, res) => {
  try {
    const bookingData = {
      ...req.body,
      landlord_id: req.landlord_id
    };
    
    // Verify property belongs to landlord
    const { data: property, error: propError } = await req.supabase
      .from('properties')
      .select('*')
      .eq('id', bookingData.property_id)
      .eq('landlord_id', req.landlord_id)
      .single();
    
    if (propError || !property) {
      return res.status(403).json({ error: 'Property not found or access denied' });
    }
    
    // Auto-calculate PM fees if managed
    if (property.is_managed && property.property_category === 'sa') {
      const netRevenue = parseFloat(bookingData.net_revenue) || 0;
      const cleaningFee = parseFloat(bookingData.cleaning_fee) || 0;
      const pmPercent = parseFloat(property.management_fee_percent) || 0;
      
      // PM fee is percentage of net revenue (already has platform and cleaning deducted)
      const pmFee = (netRevenue * pmPercent) / 100;
      
      bookingData.cleaning_fee = cleaningFee;
      bookingData.pm_fee_amount = pmFee;
      bookingData.total_pm_deduction = cleaningFee + pmFee;
    }
    
    // Calculate total nights if not provided
    if (!bookingData.total_nights && bookingData.check_in && bookingData.check_out) {
      const checkIn = new Date(bookingData.check_in);
      const checkOut = new Date(bookingData.check_out);
      const diffTime = Math.abs(checkOut - checkIn);
      bookingData.total_nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    const { data: booking, error } = await req.supabase
      .from('sa_bookings')
      .insert([bookingData])
      .select()
      .single();
    
    if (error) throw error;
    
    res.status(201).json(booking);
  } catch (err) {
    console.error('Error creating booking:', err);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// UPDATE booking
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const allowedFields = [
      'reservation_id', 'guest_name', 'platform', 'check_in', 'check_out',
      'booking_date', 'nightly_rate', 'total_nights', 'gross_booking_value',
      'platform_fee', 'net_revenue', 'status', 'payment_status', 'received_date',
      'cleaning_fee', 'pm_fee_amount', 'total_pm_deduction', 'pm_payment_status',
      'pm_paid_date', 'guest_email', 'guest_phone', 'notes'
    ];
    
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    const { data: booking, error } = await req.supabase
      .from('sa_bookings')
      .update({ ...updates, updated_at: new Date() })
      .eq('id', id)
      .eq('landlord_id', req.landlord_id)
      .select()
      .single();
    
    if (error) throw error;
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    res.json(booking);
  } catch (err) {
    console.error('Error updating booking:', err);
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

// DELETE booking
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await req.supabase
      .from('sa_bookings')
      .delete()
      .eq('id', id)
      .eq('landlord_id', req.landlord_id);
    
    if (error) throw error;
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting booking:', err);
    res.status(500).json({ error: 'Failed to delete booking' });
  }
});

// Mark payment as received
router.post('/:id/mark-received', async (req, res) => {
  try {
    const { id } = req.params;
    const { received_date } = req.body;
    
    const { data: booking, error } = await req.supabase
      .from('sa_bookings')
      .update({ 
        payment_status: 'received', 
        received_date: received_date || new Date().toISOString().split('T')[0],
        updated_at: new Date()
      })
      .eq('id', id)
      .eq('landlord_id', req.landlord_id)
      .select()
      .single();
    
    if (error) throw error;
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    res.json(booking);
  } catch (err) {
    console.error('Error marking received:', err);
    res.status(500).json({ error: 'Failed to mark as received' });
  }
});

// Mark PM payment as paid
router.post('/:id/mark-pm-paid', async (req, res) => {
  try {
    const { id } = req.params;
    const { paid_date } = req.body;
    
    const { data: booking, error } = await req.supabase
      .from('sa_bookings')
      .update({ 
        pm_payment_status: 'paid', 
        pm_paid_date: paid_date || new Date().toISOString().split('T')[0],
        updated_at: new Date()
      })
      .eq('id', id)
      .eq('landlord_id', req.landlord_id)
      .select()
      .single();
    
    if (error) throw error;
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    res.json(booking);
  } catch (err) {
    console.error('Error marking PM paid:', err);
    res.status(500).json({ error: 'Failed to mark PM as paid' });
  }
});

module.exports = router;
