const express = require('express');
const router = express.Router();

// Generate income report (rent payments)
router.get('/income', async (req, res) => {
  try {
    const { start_date, end_date, property_id } = req.query;

    let query = req.supabase
      .from('rent_payments')
      .select(`
        id,
        amount_due,
        amount_paid,
        paid_date,
        due_date,
        status,
        property:properties(name),
        tenancy:tenancies(room_number),
        sa_booking:sa_bookings(guest_name)
      `)
      .eq('landlord_id', req.landlord_id)
      .eq('status', 'paid');

    if (start_date) {
      query = query.gte('paid_date', start_date);
    }
    if (end_date) {
      query = query.lte('paid_date', end_date);
    }
    if (property_id) {
      query = query.eq('property_id', property_id);
    }

    const { data: payments, error } = await query.order('paid_date', { ascending: false });

    if (error) throw error;

    // Get tenant names for tenancy-based payments
    const paymentsWithTenants = await Promise.all((payments || []).map(async (p) => {
      let tenantName = 'SA Booking';
      
      // If it's a tenancy payment (not SA booking)
      if (p.tenancy) {
        const { data: tenants } = await req.supabase
          .from('tenancy_tenants')
          .select('tenant:tenants(first_name, last_name)')
          .eq('tenancy_id', p.tenancy_id)
          .eq('is_primary', true)
          .single();
        
        if (tenants?.tenant) {
          tenantName = `${tenants.tenant.first_name} ${tenants.tenant.last_name}`;
        }
      } else if (p.sa_booking?.guest_name) {
        tenantName = p.sa_booking.guest_name;
      }

      return {
        id: p.id,
        paid_date: p.paid_date,
        due_date: p.due_date,
        amount: p.amount_paid || p.amount_due,
        status: p.status,
        property_name: p.property?.name || 'Unknown',
        tenant_name: tenantName
      };
    }));

    const total = paymentsWithTenants.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    res.json({
      payments: paymentsWithTenants,
      total,
      count: paymentsWithTenants.length,
      period: { start_date, end_date }
    });
  } catch (err) {
    console.error('Error generating income report:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Generate expenses report
router.get('/expenses', async (req, res) => {
  try {
    const { start_date, end_date, property_id } = req.query;

    let query = req.supabase
      .from('property_expenses')
      .select(`
        id,
        amount,
        category,
        description,
        expense_date,
        frequency,
        property:properties(name)
      `)
      .eq('landlord_id', req.landlord_id);

    if (start_date) {
      query = query.gte('expense_date', start_date);
    }
    if (end_date) {
      query = query.lte('expense_date', end_date);
    }
    if (property_id) {
      query = query.eq('property_id', property_id);
    }

    const { data: expenses, error } = await query.order('expense_date', { ascending: false });

    if (error) throw error;

    const expensesFormatted = (expenses || []).map(e => ({
      id: e.id,
      expense_date: e.expense_date,
      category: e.category,
      description: e.description || '',
      amount: e.amount,
      frequency: e.frequency,
      property_name: e.property?.name || 'Unknown'
    }));

    const total = expensesFormatted.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

    res.json({
      expenses: expensesFormatted,
      total,
      count: expensesFormatted.length,
      period: { start_date, end_date }
    });
  } catch (err) {
    console.error('Error generating expenses report:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Generate net income report (income - expenses)
router.get('/net', async (req, res) => {
  try {
    const { start_date, end_date, property_id } = req.query;

    // Get income
    const { data: payments } = await req.supabase
      .from('rent_payments')
      .select('amount_paid')
      .eq('landlord_id', req.landlord_id)
      .eq('status', 'paid')
      .gte('paid_date', start_date)
      .lte('paid_date', end_date);

    if (property_id) {
      // TODO: filter by property
    }

    // Get expenses
    const { data: expenses } = await req.supabase
      .from('property_expenses')
      .select('amount')
      .eq('landlord_id', req.landlord_id)
      .gte('expense_date', start_date)
      .lte('expense_date', end_date);

    const totalIncome = (payments || []).reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0);
    const totalExpenses = (expenses || []).reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const netIncome = totalIncome - totalExpenses;

    res.json({
      income: totalIncome,
      expenses: totalExpenses,
      net: netIncome,
      period: { start_date, end_date }
    });
  } catch (err) {
    console.error('Error generating net report:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

module.exports = router;
