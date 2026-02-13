const express = require('express');
const router = express.Router();

// GET all rent payments for authenticated landlord
router.get('/', async (req, res) => {
  try {
    const { property_id, status, limit = 100 } = req.query;

    let query = req.supabase
      .from('rent_payments')
      .select(`
        *,
        property:properties(name, address_line_1),
        tenancy:tenancies(rent_amount, room_number)
      `)
      .eq('landlord_id', req.landlord_id)
      .order('due_date', { ascending: false })
      .limit(parseInt(limit));

    if (property_id) {
      query = query.eq('property_id', property_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: payments, error } = await query;

    if (error) throw error;

    res.json(payments || []);
  } catch (err) {
    console.error('Error fetching payments:', err);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// GET payment by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: payment, error } = await req.supabase
      .from('rent_payments')
      .select(`
        *,
        property:properties(*),
        tenancy:tenancies(*)
      `)
      .eq('id', id)
      .eq('landlord_id', req.landlord_id)
      .single();

    if (error || !payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(payment);
  } catch (err) {
    console.error('Error fetching payment:', err);
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
});

// GET summary for current month (for RentTracker component)
router.get('/summary/current-month', async (req, res) => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 1);

    // Get all payments for current month
    const { data: payments, error } = await req.supabase
      .from('rent_payments')
      .select('amount_due, amount_paid, status')
      .eq('landlord_id', req.landlord_id)
      .gte('due_date', startOfMonth.toISOString())
      .lt('due_date', endOfMonth.toISOString());

    if (error) throw error;

    // Calculate totals
    let totalReceived = 0;
    let totalPending = 0;
    let totalLate = 0;
    let totalMissed = 0;

    (payments || []).forEach(p => {
      const dueAmount = parseFloat(p.amount_due || 0);
      const paidAmount = parseFloat(p.amount_paid || 0);
      
      switch (p.status) {
        case 'paid':
          totalReceived += paidAmount;
          break;
        case 'pending':
          totalPending += dueAmount;
          break;
        case 'late':
          totalLate += dueAmount - paidAmount;
          break;
        case 'missed':
          totalMissed += dueAmount;
          break;
      }
    });

    res.json({
      total_received: totalReceived,
      total_pending: totalPending,
      total_late: totalLate,
      total_missed: totalMissed
    });
  } catch (err) {
    console.error('Error fetching summary:', err);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// GET dashboard stats
router.get('/dashboard/stats', async (req, res) => {
  try {
    // Pending payments
    const { data: pending } = await req.supabase
      .from('rent_payments')
      .select('amount_due')
      .eq('landlord_id', req.landlord_id)
      .eq('status', 'pending')
      .gte('due_date', new Date().toISOString().split('T')[0]);

    // Late payments
    const { data: late } = await req.supabase
      .from('rent_payments')
      .select('amount_due, amount_paid')
      .eq('landlord_id', req.landlord_id)
      .eq('status', 'late');

    // This month's expected revenue
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const { data: thisMonth } = await req.supabase
      .from('rent_payments')
      .select('amount_due, amount_paid, status')
      .eq('landlord_id', req.landlord_id)
      .gte('due_date', startOfMonth.toISOString())
      .lt('due_date', new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 1).toISOString());

    const pendingAmount = pending?.reduce((sum, p) => sum + parseFloat(p.amount_due || 0), 0) || 0;
    const lateAmount = late?.reduce((sum, p) => sum + (parseFloat(p.amount_due || 0) - parseFloat(p.amount_paid || 0)), 0) || 0;
    const expected = thisMonth?.reduce((sum, p) => sum + parseFloat(p.amount_due || 0), 0) || 0;
    const collected = thisMonth?.filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0) || 0;

    res.json({
      pending_payments: pending?.length || 0,
      pending_amount: pendingAmount,
      late_payments: late?.length || 0,
      late_amount: lateAmount,
      this_month_expected: expected,
      this_month_collected: collected,
      collection_rate: expected > 0 ? Math.round((collected / expected) * 100) : 0
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// CREATE payment
router.post('/', async (req, res) => {
  try {
    const paymentData = {
      ...req.body,
      landlord_id: req.landlord_id
    };

    const { data: payment, error } = await req.supabase
      .from('rent_payments')
      .insert([paymentData])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(payment);
  } catch (err) {
    console.error('Error creating payment:', err);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// UPDATE payment (mark as paid, etc.)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const allowedFields = [
      'amount_paid', 'paid_date', 'status', 'payment_method', 'payment_reference', 'notes'
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

    const { data: payment, error } = await req.supabase
      .from('rent_payments')
      .update({ ...updates, updated_at: new Date() })
      .eq('id', id)
      .eq('landlord_id', req.landlord_id)
      .select()
      .single();

    if (error) throw error;
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(payment);
  } catch (err) {
    console.error('Error updating payment:', err);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

// DELETE payment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await req.supabase
      .from('rent_payments')
      .delete()
      .eq('id', id)
      .eq('landlord_id', req.landlord_id);

    if (error) throw error;

    res.json({ message: 'Payment deleted successfully' });
  } catch (err) {
    console.error('Error deleting payment:', err);
    res.status(500).json({ error: 'Failed to delete payment' });
  }
});

module.exports = router;
