const { createClient } = require('@supabase/supabase-js');

// Lazy load Supabase client
let supabase = null;
function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }
  return supabase;
}

/**
 * Auto-update tenancy status based on dates
 * - pending: start_date is in the future
 * - active: start_date <= today <= end_date (or no end_date)
 * - ended: end_date < today
 */
async function updateTenancyStatuses(landlordId) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Update pending tenancies (future start date)
    await getSupabase()
      .from('tenancies')
      .update({ status: 'pending', updated_at: new Date() })
      .eq('landlord_id', landlordId)
      .is('deleted_at', null)
      .gt('start_date', today)
      .neq('status', 'pending');
    
    // Update active tenancies (started, not ended)
    await getSupabase()
      .from('tenancies')
      .update({ status: 'active', updated_at: new Date() })
      .eq('landlord_id', landlordId)
      .is('deleted_at', null)
      .lte('start_date', today)
      .or(`end_date.is.null,end_date.gte.${today}`)
      .neq('status', 'active');
    
    // Update ended tenancies (past end date)
    await getSupabase()
      .from('tenancies')
      .update({ status: 'ended', updated_at: new Date() })
      .eq('landlord_id', landlordId)
      .is('deleted_at', null)
      .lt('end_date', today)
      .neq('status', 'ended');
    
    return { success: true };
  } catch (error) {
    console.error('Error updating tenancy statuses:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate rent payments for a tenancy
 * Creates payment records for current month + next 2 months
 */
async function generateRentPayments(tenancyId, landlordId) {
  try {
    // Get tenancy details
    const { data: tenancy, error } = await getSupabase()
      .from('tenancies')
      .select('*')
      .eq('id', tenancyId)
      .eq('landlord_id', landlordId)
      .single();
    
    if (error || !tenancy) {
      return { success: false, error: 'Tenancy not found' };
    }
    
    const today = new Date();
    const payments = [];
    
    // Generate for current month and next 2 months (3 total)
    for (let i = 0; i < 3; i++) {
      const dueDate = new Date(today.getFullYear(), today.getMonth() + i, tenancy.rent_due_day || 1);
      
      // Skip if before start date
      if (dueDate < new Date(tenancy.start_date)) {
        continue;
      }
      
      // Skip if after end date
      if (tenancy.end_date && dueDate > new Date(tenancy.end_date)) {
        continue;
      }
      
      // Check if payment already exists
      const { data: existing } = await getSupabase()
        .from('rent_payments')
        .select('id')
        .eq('tenancy_id', tenancyId)
        .eq('due_date', dueDate.toISOString().split('T')[0])
        .single();
      
      if (!existing) {
        payments.push({
          tenancy_id: tenancyId,
          amount_due: tenancy.rent_amount,
          due_date: dueDate.toISOString().split('T')[0],
          status: dueDate < today ? 'late' : 'pending',
          created_at: new Date()
        });
      }
    }
    
    if (payments.length > 0) {
      const { error: insertError } = await getSupabase()
        .from('rent_payments')
        .insert(payments);
      
      if (insertError) throw insertError;
    }
    
    return { success: true, created: payments.length };
  } catch (error) {
    console.error('Error generating rent payments:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get calculated tenancy status based on dates
 */
function calculateTenancyStatus(startDate, endDate) {
  const today = new Date();
  const start = new Date(startDate);
  
  if (start > today) {
    return 'pending';
  }
  
  if (endDate) {
    const end = new Date(endDate);
    if (end < today) {
      return 'ended';
    }
  }
  
  return 'active';
}

module.exports = {
  updateTenancyStatuses,
  generateRentPayments,
  calculateTenancyStatus
};
