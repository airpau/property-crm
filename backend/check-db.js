// Diagnostic script to check properties
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ptkzpaukpknualqnyspq.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

async function checkProperties() {
  try {
    // Get all properties (without filtering by landlord)
    const { data: properties, error } = await supabase
      .from('properties')
      .select('*')
      .is('deleted_at', null);

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('Total properties found:', properties.length);
    console.log('\nProperties:');
    properties.forEach(p => {
      console.log(`- ${p.name} (ID: ${p.id})`);
      console.log(`  Landlord ID: ${p.landlord_id}`);
      console.log(`  Address: ${p.address_line_1}`);
    });

    // Check auth users
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    if (!userError) {
      console.log('\n\nAuth users:');
      users.users.forEach(u => {
        console.log(`- ${u.email} (ID: ${u.id})`);
      });
    }

  } catch (err) {
    console.error('Failed:', err.message);
  }
}

checkProperties();
