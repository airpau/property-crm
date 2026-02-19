const express = require('express');
const router = express.Router();
const { updateTenancyStatuses } = require('../utils/tenancy-helpers');

// FX rates to GBP (approximate Feb 2026 rates - update as needed)
const FX_RATES = {
  GBP: 1.0,
  USD: 0.79,  // 1 USD = 0.79 GBP
  EUR: 0.83,  // 1 EUR = 0.83 GBP
  CAD: 0.56,  // 1 CAD = 0.56 GBP
  AUD: 0.49   // 1 AUD = 0.49 GBP
};

// Convert amount to GBP
function toGBP(amount, currency = 'GBP') {
  const rate = FX_RATES[currency] || 1.0;
  return parseFloat(amount || 0) * rate;
}

// GET all properties for authenticated landlord
router.get('/', async (req, res) => {
  try {
    // Auto-update tenancy statuses before returning
    await updateTenancyStatuses(req.landlord_id);
    
    console.log('Fetching properties for landlord:', req.landlord_id);
    
    const { data: properties, error } = await req.supabase
      .from('properties')
      .select(`
        *,
        tenancies!tenancies_property_id_fkey(
          id,
          status,
          rent_amount,
          tenancy_tenants(
            tenant:tenants(*)
          )
        )
      `)
      .eq('landlord_id', req.landlord_id)
      .is('deleted_at', null)
      .order('name', { ascending: true });

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    
    console.log('Found properties:', properties?.length || 0);

    // Format response with counts and monthly income
    const formattedProperties = await Promise.all(properties.map(async (p) => {
      const activeTenancies = p.tenancies?.filter(t => t.status === 'active') || [];
      let monthlyIncome = activeTenancies.reduce((sum, t) => sum + parseFloat(t.rent_amount || 0), 0);
      let saBookingRevenue = 0;
      let monthlyPMFees = 0;
      const activeTenants = activeTenancies.reduce((count, t) => count + (t.tenancy_tenants?.length || 0), 0);
      
      // For SA properties, also include booking revenue and PM fees for current month
      // Based on received_date (when payout arrives) or check_in if not yet marked as received
      if (p.property_category === 'sa') {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1;
        const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
        // Get actual last day of month
        const lastDay = new Date(year, month, 0).getDate();
        const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        
        // Get all non-cancelled bookings for this property with currency
        const { data: saBookings } = await req.supabase
          .from('sa_bookings')
          .select('net_revenue, received_date, check_in, payment_status, currency, total_pm_deduction')
          .eq('property_id', p.id)
          .eq('landlord_id', req.landlord_id)
          .not('status', 'eq', 'cancelled');
        
        // Filter bookings: count if received_date is this month, OR check_in is this month (if not yet received)
        const monthlyBookings = (saBookings || []).filter(b => {
          // If payment was received this month, count it
          if (b.received_date && b.received_date >= monthStart && b.received_date <= monthEnd) {
            return true;
          }
          // If check_in is this month and payment is pending (not yet received), count as expected income
          if (b.check_in >= monthStart && b.check_in <= monthEnd && b.payment_status === 'pending') {
            return true;
          }
          return false;
        });
        
        // Convert all booking revenues to GBP
        saBookingRevenue = monthlyBookings.reduce((sum, b) => {
          const gbpAmount = toGBP(b.net_revenue, b.currency);
          return sum + gbpAmount;
        }, 0);
        monthlyIncome += saBookingRevenue;
        
        // Calculate PM fees for this month (converted to GBP)
        // Use pm_fee_amount only (18% of net), NOT total_pm_deduction (which includes cleaning)
        monthlyPMFees = monthlyBookings.reduce((sum, b) => {
          const gbpAmount = toGBP(b.pm_fee_amount, b.currency);
          return sum + gbpAmount;
        }, 0);
        
        console.log(`[DEBUG] Property ${p.name}: tenancy income = ${activeTenancies.reduce((sum, t) => sum + parseFloat(t.rent_amount || 0), 0)}, SA bookings this month = ${monthlyBookings.length}/${saBookings?.length || 0}, SA revenue (GBP) = ${saBookingRevenue}, PM fees (GBP) = ${monthlyPMFees}`);
      }
      
      // Get regular expenses for this property
      const { data: expenses, error: expensesError } = await req.supabase
        .from('property_expenses')
        .select('amount, frequency, expense_date')
        .eq('property_id', p.id)
        .eq('landlord_id', req.landlord_id);
      
      if (expensesError) {
        console.log(`[EXPENSES ERROR] ${p.name}:`, expensesError.message);
      } else {
        console.log(`[EXPENSES] ${p.name}: found ${expenses?.length || 0} expenses`);
      }
      
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      let regularExpenses = 0;
      (expenses || []).forEach(expense => {
        console.log(`[EXPENSE] ${p.name}: £${expense.amount} ${expense.frequency} ${expense.expense_date}`);
        const amount = parseFloat(expense.amount) || 0;
        if (expense.frequency === 'monthly' || expense.frequency === 'quarterly' || expense.frequency === 'annual') {
          regularExpenses += amount;
        } else {
          const expenseDate = new Date(expense.expense_date);
          if (expenseDate >= firstDayOfMonth) {
            regularExpenses += amount;
          }
        }
      });
      
      const totalExpenses = regularExpenses + monthlyPMFees;
      const netIncome = monthlyIncome - totalExpenses;
      
      // Round to 2 decimal places for display
      const roundedMonthlyIncome = Math.round(monthlyIncome * 100) / 100;
      const roundedTotalExpenses = Math.round(totalExpenses * 100) / 100;
      const roundedNetIncome = Math.round(netIncome * 100) / 100;
      const roundedPMFees = Math.round(monthlyPMFees * 100) / 100;
      const roundedSARevenue = Math.round(saBookingRevenue * 100) / 100;
      
      console.log(`[LIST] ${p.name}: income=£${roundedMonthlyIncome.toFixed(2)}, expenses=£${regularExpenses.toFixed(2)}, pm=£${roundedPMFees.toFixed(2)}, total=£${roundedTotalExpenses.toFixed(2)}, net=£${roundedNetIncome.toFixed(2)}`);

      return {
        ...p,
        active_tenancies: activeTenancies.length,
        active_tenants: activeTenants,
        monthly_income: roundedMonthlyIncome,
        total_expenses: roundedTotalExpenses,
        net_income: roundedNetIncome,
        sa_booking_revenue: p.property_category === 'sa' ? roundedSARevenue : 0,
        pm_fees: p.property_category === 'sa' ? roundedPMFees : 0
      };
    }));

    res.json(formattedProperties);
  } catch (err) {
    console.error('Error fetching properties:', err);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

// GET single property with full details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[SINGLE-PROPERTY] Fetching property ${id}`);
    
    // Auto-update tenancy statuses before returning
    await updateTenancyStatuses(req.landlord_id);
    
    // Property details
    const { data: property, error: propertyError } = await req.supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .eq('landlord_id', req.landlord_id)
      .is('deleted_at', null)
      .single();

    if (propertyError || !property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Active tenancies with tenants
    const { data: tenancies, error: tenanciesError } = await req.supabase
      .from('tenancies')
      .select(`
        *,
        tenancy_tenants(
          is_primary,
          tenant:tenants(*)
        )
      `)
      .eq('property_id', id)
      .eq('landlord_id', req.landlord_id)
      .eq('status', 'active')
      .is('deleted_at', null);

    // Flatten tenancy_tenants to tenants
    const formattedTenancies = tenancies?.map(t => ({
      ...t,
      tenants: t.tenancy_tenants?.map(tt => ({
        ...tt.tenant,
        is_primary: tt.is_primary
      })) || []
    })) || [];

    // Compliance certificates
    const { data: compliance, error: complianceError } = await req.supabase
      .from('compliance_certificates')
      .select('*')
      .eq('property_id', id)
      .eq('landlord_id', req.landlord_id)
      .order('expiry_date', { ascending: true });

    // Recent rent payments
    const { data: payments, error: paymentsError } = await req.supabase
      .from('rent_payments')
      .select(`
        *,
        tenancy:tenancies(rent_amount)
      `)
      .eq('property_id', id)
      .eq('landlord_id', req.landlord_id)
      .order('due_date', { ascending: false })
      .limit(12);

    // Calculate monthly income
    let monthlyIncome = formattedTenancies.reduce((sum, t) => sum + parseFloat(t.rent_amount || 0), 0);
    const today = new Date();
    
    // For SA properties, add booking revenue for current month
    // Based on received_date (when payout arrives) or check_in if not yet marked as received
    if (property.property_category === 'sa') {
      const year = today.getFullYear();
      const month = today.getMonth() + 1;
      const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
      // Get actual last day of month
      const lastDay = new Date(year, month, 0).getDate();
      const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      
      // Get ALL non-cancelled bookings for this property with currency
      const { data: saBookings } = await req.supabase
        .from('sa_bookings')
        .select('net_revenue, received_date, check_in, payment_status, currency, pm_fee_amount, total_pm_deduction')
        .eq('property_id', id)
        .eq('landlord_id', req.landlord_id)
        .not('status', 'eq', 'cancelled');
      
      // Filter bookings: count if received_date is this month, OR check_in is this month (if not yet received)
      const monthlyBookings = (saBookings || []).filter(b => {
        // If payment was received this month, count it
        if (b.received_date && b.received_date >= monthStart && b.received_date <= monthEnd) {
          return true;
        }
        // If check_in is this month and payment is pending (not yet received), count as expected income
        if (b.check_in >= monthStart && b.check_in <= monthEnd && b.payment_status === 'pending') {
          return true;
        }
        return false;
      });
      
      // Convert foreign currency to GBP
      const saRevenue = monthlyBookings.reduce((sum, b) => {
        const gbpAmount = toGBP(b.net_revenue, b.currency);
        return sum + gbpAmount;
      }, 0);
      monthlyIncome += saRevenue;
      
      // Calculate PM fees for this month (in GBP)
      // Use pm_fee_amount only (18% of net), NOT total_pm_deduction (which includes cleaning)
      const monthlyPMFees = monthlyBookings.reduce((sum, b) => {
        const pmFee = b.pm_fee_amount ? toGBP(b.pm_fee_amount, b.currency) : 0;
        return sum + pmFee;
      }, 0);
      
      // Get regular expenses for this property
      const { data: expenses } = await req.supabase
        .from('property_expenses')
        .select('amount, frequency, expense_date')
        .eq('property_id', id)
        .eq('landlord_id', req.landlord_id);
      
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      let regularExpenses = 0;
      (expenses || []).forEach(expense => {
        const amount = parseFloat(expense.amount) || 0;
        if (expense.frequency === 'monthly' || expense.frequency === 'quarterly' || expense.frequency === 'annual') {
          regularExpenses += amount;
        } else {
          const expenseDate = new Date(expense.expense_date);
          if (expenseDate >= firstDayOfMonth) {
            regularExpenses += amount;
          }
        }
      });
      
      var totalExpenses = regularExpenses + monthlyPMFees;
      var netIncome = monthlyIncome - totalExpenses;
      var pmFees = monthlyPMFees;
      
      // Round all values to 2 decimal places
      monthlyIncome = Math.round(monthlyIncome * 100) / 100;
      totalExpenses = Math.round(totalExpenses * 100) / 100;
      netIncome = Math.round(netIncome * 100) / 100;
      pmFees = Math.round(pmFees * 100) / 100;
      
      console.log(`[SINGLE-SA] ${property.name}: income=£${monthlyIncome.toFixed(2)}, regular=£${regularExpenses.toFixed(2)}, pm=£${pmFees.toFixed(2)}, total=£${totalExpenses.toFixed(2)}, net=£${netIncome.toFixed(2)}`);
    } else {
      // Non-SA properties - still need expenses
      const { data: expenses } = await req.supabase
        .from('property_expenses')
        .select('amount, frequency, expense_date')
        .eq('property_id', id)
        .eq('landlord_id', req.landlord_id);
      
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      let regularExpenses = 0;
      (expenses || []).forEach(expense => {
        const amount = parseFloat(expense.amount) || 0;
        if (expense.frequency === 'monthly' || expense.frequency === 'quarterly' || expense.frequency === 'annual') {
          regularExpenses += amount;
        } else {
          const expenseDate = new Date(expense.expense_date);
          if (expenseDate >= firstDayOfMonth) {
            regularExpenses += amount;
          }
        }
      });
      
      var totalExpenses = regularExpenses;
      var netIncome = monthlyIncome - totalExpenses;
      var pmFees = 0;
    }
    
    // Round all financial values to 2 decimal places before sending
    monthlyIncome = Math.round(monthlyIncome * 100) / 100;
    totalExpenses = Math.round(totalExpenses * 100) / 100;
    netIncome = Math.round(netIncome * 100) / 100;
    pmFees = Math.round(pmFees * 100) / 100;
    const saBookingRevenue = property.property_category === 'sa' 
      ? Math.round((monthlyIncome - formattedTenancies.reduce((sum, t) => sum + parseFloat(t.rent_amount || 0), 0)) * 100) / 100
      : undefined;
    
    console.log(`[SINGLE-RESPONSE] ${property.name}: monthly_income=${monthlyIncome}, total_expenses=${totalExpenses}, pm_fees=${pmFees}, net_income=${netIncome}`);

    res.json({
      ...property,
      monthly_income: monthlyIncome,
      total_expenses: totalExpenses,
      net_income: netIncome,
      pm_fees: pmFees,
      sa_booking_revenue: saBookingRevenue,
      tenancies: formattedTenancies,
      compliance: compliance || [],
      recent_payments: payments || []
    });
  } catch (err) {
    console.error('Error fetching property:', err);
    res.status(500).json({ error: 'Failed to fetch property' });
  }
});

// CREATE property
router.post('/', async (req, res) => {
  try {
    const propertyData = {
      ...req.body,
      landlord_id: req.landlord_id
    };

    const { data: property, error } = await req.supabase
      .from('properties')
      .insert([propertyData])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(property);
  } catch (err) {
    console.error('Error creating property:', err);
    res.status(500).json({ error: 'Failed to create property' });
  }
});

// UPDATE property
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const allowedFields = [
      'name', 'address_line_1', 'address_line_2', 'city', 'postcode',
      'property_type', 'bedrooms', 'bathrooms', 'receptions', 'total_rooms',
      'purchase_price', 'purchase_date', 'current_value',
      'mortgage_lender', 'mortgage_reference', 'monthly_mortgage', 'interest_rate',
      'status', 'is_hmo', 'hmo_license_number', 'hmo_license_expiry', 'max_occupants',
      'epc_rating', 'epc_expiry', 'council_tax_band'
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

    const { data: property, error } = await req.supabase
      .from('properties')
      .update({ ...updates, updated_at: new Date() })
      .eq('id', id)
      .eq('landlord_id', req.landlord_id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.json(property);
  } catch (err) {
    console.error('Error updating property:', err);
    res.status(500).json({ error: 'Failed to update property' });
  }
});

// DELETE property (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await req.supabase
      .from('properties')
      .update({ deleted_at: new Date() })
      .eq('id', id)
      .eq('landlord_id', req.landlord_id);

    if (error) throw error;

    res.json({ message: 'Property deleted successfully' });
  } catch (err) {
    console.error('Error deleting property:', err);
    res.status(500).json({ error: 'Failed to delete property' });
  }
});

// GET property summary for dashboard
router.get('/:id/summary', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: property, error } = await req.supabase
      .from('properties')
      .select(`
        id,
        name,
        status,
        address_line_1,
        tenancies!tenancies_property_id_fkey(
          id,
          status,
          rent_amount,
          tenancy_tenants(
            tenant_id
          )
        ),
        compliance_certificates(
          id,
          expiry_date
        )
      `)
      .eq('id', id)
      .eq('landlord_id', req.landlord_id)
      .is('deleted_at', null)
      .single();

    if (error || !property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Calculate summary stats
    const activeTenancies = property.tenancies?.filter(t => t.status === 'active') || [];
    const totalMonthlyRent = activeTenancies.reduce((sum, t) => sum + parseFloat(t.rent_amount || 0), 0);
    const activeTenants = activeTenancies.reduce((count, t) => count + (t.tenancy_tenants?.length || 0), 0);
    const expiringCerts = property.compliance_certificates?.filter(c => {
      const expiry = new Date(c.expiry_date);
      const daysUntilExpiry = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry <= 60;
    }).length || 0;

    res.json({
      id: property.id,
      name: property.name,
      status: property.status,
      address_line_1: property.address_line_1,
      active_tenancies: activeTenancies.length,
      total_monthly_rent: totalMonthlyRent,
      active_tenants: activeTenants,
      expiring_certs: expiringCerts
    });
  } catch (err) {
    console.error('Error fetching property summary:', err);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

module.exports = router;
