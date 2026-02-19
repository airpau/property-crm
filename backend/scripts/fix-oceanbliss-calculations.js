// Fix OceanBliss booking calculations
// PM fee should be 18% of (net - cleaning), not 18% of net

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixOceanBlissBookings() {
  try {
    // Get OceanBliss property
    const { data: property } = await supabase
      .from('properties')
      .select('id, name, management_fee_percent, fixed_cleaning_fee, currency')
      .ilike('name', '%OceanBliss%')
      .single();
    
    if (!property) {
      console.log('OceanBliss property not found');
      return;
    }
    
    console.log('Found property:', property.name, 'ID:', property.id);
    console.log('Currency:', property.currency, 'PM%:', property.management_fee_percent, 'Cleaning:', property.fixed_cleaning_fee);
    
    // Get all SA bookings for this property
    const { data: bookings, error } = await supabase
      .from('sa_bookings')
      .select('*')
      .eq('property_id', property.id);
    
    if (error) {
      console.error('Error fetching bookings:', error);
      return;
    }
    
    console.log(`Found ${bookings?.length || 0} bookings`);
    
    const fxRate = 0.79; // USD to GBP
    
    for (const booking of bookings || []) {
      const netRevenue = parseFloat(booking.net_revenue) || 0;
      const cleaningFee = parseFloat(booking.cleaning_fee) || 285; // Default $285
      const pmPercent = 18;
      
      // Calculate correct PM fee: 18% of (net - cleaning)
      const revenueAfterCleaning = netRevenue - cleaningFee;
      const pmFee = (revenueAfterCleaning * pmPercent) / 100;
      const totalPMDeduction = cleaningFee + pmFee;
      const yourTakeHome = netRevenue - pmFee; // You keep net minus PM fee only
      
      console.log('\n--- Booking:', booking.guest_name, '---');
      console.log('Check-in:', booking.check_in);
      console.log('Net revenue (USD):', netRevenue.toFixed(2));
      console.log('Cleaning fee (USD):', cleaningFee.toFixed(2));
      console.log('Revenue after cleaning (USD):', revenueAfterCleaning.toFixed(2));
      console.log('PM fee 18% (USD):', pmFee.toFixed(2));
      console.log('Total Char gets (USD):', totalPMDeduction.toFixed(2));
      console.log('YOUR TAKE-HOME (USD):', yourTakeHome.toFixed(2));
      console.log('YOUR TAKE-HOME (GBP):', (yourTakeHome * fxRate).toFixed(2));
      console.log('Old PM fee:', booking.pm_fee_amount, 'Old total:', booking.total_pm_deduction);
      
      // Update the booking
      const { error: updateError } = await supabase
        .from('sa_bookings')
        .update({
          cleaning_fee: cleaningFee,
          pm_fee_amount: pmFee.toFixed(2),
          total_pm_deduction: totalPMDeduction.toFixed(2)
        })
        .eq('id', booking.id);
      
      if (updateError) {
        console.error('Error updating booking:', updateError);
      } else {
        console.log('✓ Updated successfully');
      }
    }
    
    console.log('\n=== SUMMARY ===');
    const totalNet = bookings.reduce((sum, b) => sum + parseFloat(b.net_revenue || 0), 0);
    const totalCleaning = bookings.length * 285;
    const totalPM = bookings.reduce((sum, b) => {
      const net = parseFloat(b.net_revenue || 0);
      const cleaning = 285;
      return sum + ((net - cleaning) * 0.18);
    }, 0);
    const totalCharGets = totalCleaning + totalPM;
    const yourTotal = totalNet - totalPM;
    
    console.log('Total net from Airbnb (USD):', totalNet.toFixed(2));
    console.log('Total cleaning (USD):', totalCleaning.toFixed(2));
    console.log('Total PM fees (USD):', totalPM.toFixed(2));
    console.log('Total Char gets (USD):', totalCharGets.toFixed(2));
    console.log('YOUR TOTAL TAKE-HOME (USD):', yourTotal.toFixed(2));
    console.log('YOUR TOTAL TAKE-HOME (GBP):', (yourTotal * fxRate).toFixed(2));
    
  } catch (err) {
    console.error('Error:', err);
  }
}

fixOceanBlissBookings();
