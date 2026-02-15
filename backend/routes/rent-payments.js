const express = require('express');
const router = express.Router();

// GET all rent payments for authenticated landlord
router.get('/', async (req, res) => {
  try {
    const { property_id, status, start_date, end_date, limit = 100 } = req.query;

    // First, get all payments with property info
    let query = req.supabase
      .from('rent_payments')
      .select(`
        *,
        property:properties(name, address_line_1),
        tenancy:tenancies(room_number)
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

    if (start_date) {
      query = query.gte('due_date', start_date);
    }

    if (end_date) {
      query = query.lte('due_date', end_date);
    }

    const { data: payments, error } = await query;

    if (error) throw error;

    // Get unique tenancy IDs from payments
    const tenancyIds = [...new Set((payments || []).map(p => p.tenancy_id).filter(Boolean))];
    
    // Fetch tenants for those tenancies
    let tenantsMap = {};
    if (tenancyIds.length > 0) {
      const { data: tenancyTenants } = await req.supabase
        .from('tenancy_tenants')
        .select(`
          tenancy_id,
          tenant:tenants(first_name, last_name)
        `)
        .in('tenancy_id', tenancyIds);
      
      // Build a map of tenancy_id -> tenants
      (tenancyTenants || []).forEach(tt => {
        if (!tenantsMap[tt.tenancy_id]) {
          tenantsMap[tt.tenancy_id] = [];
        }
        if (tt.tenant) {
          tenantsMap[tt.tenancy_id].push(tt.tenant);
        }
      });
    }

    // Merge tenants into payments
    const formattedPayments = (payments || []).map(payment => ({
      ...payment,
      tenants: tenantsMap[payment.tenancy_id] || []
    }));

    res.json(formattedPayments || []);
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

// POST generate rent payments from active tenancies
router.post('/generate', async (req, res) => {
  try {
    const { month = new Date().toISOString().slice(0, 7) } = req.body; // Format: "2026-02"
    
    // Parse year and month
    const [year, monthNum] = month.split('-').map(Number);
    const startOfMonth = new Date(year, monthNum - 1, 1);
    const endOfMonth = new Date(year, monthNum, 0);

    // Get all active tenancies
    const { data: tenancies, error: tenancyError } = await req.supabase
      .from('tenancies')
      .select(`
        id,
        landlord_id,
        property_id,
        rent_amount,
        rent_due_day
      `)
      .eq('landlord_id', req.landlord_id)
      .eq('status', 'active')
      .is('deleted_at', null);

    if (tenancyError) throw tenancyError;

    // Get existing payments for this month
    const monthStart = `${month}-01`;
    const monthEnd = `${month}-${new Date(year, monthNum, 0).getDate()}`;
    
    const { data: existingPayments, error: paymentError } = await req.supabase
      .from('rent_payments')
      .select('tenancy_id')
      .eq('landlord_id', req.landlord_id)
      .gte('due_date', monthStart)
      .lte('due_date', monthEnd);

    if (paymentError) throw paymentError;

    // Get set of tenancy IDs that already have payments this month
    const tenancyIdsWithPayments = new Set((existingPayments || []).map(p => p.tenancy_id));

    // Filter out tenancies that already have payments this month
    const tenanciesNeedingPayments = (tenancies || []).filter(t => {
      return !tenancyIdsWithPayments.has(t.id);
    });

    if (tenanciesNeedingPayments.length === 0) {
      return res.json({ 
        message: 'No new payments to generate',
        generated: 0,
        total: tenancies?.length || 0
      });
    }

    // Create payment records
    const paymentsToInsert = tenanciesNeedingPayments.map(t => {
      const dueDay = t.rent_due_day || 1;
      const dueDate = new Date(year, monthNum - 1, dueDay);
      
      // If due date has passed this month, mark as late
      const isLate = dueDate < new Date();
      
      return {
        landlord_id: t.landlord_id,
        tenancy_id: t.id,
        property_id: t.property_id,
        due_date: dueDate.toISOString().split('T')[0],
        amount_due: t.rent_amount,
        status: isLate ? 'late' : 'pending',
        created_at: new Date().toISOString()
      };
    });

    const { data: insertedPayments, error: insertError } = await req.supabase
      .from('rent_payments')
      .insert(paymentsToInsert)
      .select();

    if (insertError) throw insertError;

    res.json({
      message: `${insertedPayments?.length || 0} rent payments generated for ${month}`,
      generated: insertedPayments?.length || 0,
      total: tenancies?.length || 0,
      payments: insertedPayments
    });
  } catch (err) {
    console.error('Error generating payments:', err);
    res.status(500).json({ error: 'Failed to generate payments', details: err.message });
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
