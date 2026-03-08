// This script uses environment variables for Supabase credentials
// Run with: SUPABASE_URL=https://... SUPABASE_KEY=sb_secret_... node update-tenants.js

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables required');
  console.error('Run with: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node update-tenants.js');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function getLandlordId() {
  const { data, error } = await supabase
    .from('landlords')
    .select('id')
    .limit(1)
    .single();
  
  if (error) {
    console.error('Error getting landlord:', error);
    return null;
  }
  return data.id;
}

async function listProperties(landlordId) {
  const { data, error } = await supabase
    .from('properties')
    .select('id, name')
    .eq('landlord_id', landlordId);
  
  if (error) {
    console.error('Error listing properties:', error);
    return [];
  }
  return data || [];
}

async function getTenantId(landlordId, firstName, lastName) {
  const { data, error } = await supabase
    .from('tenants')
    .select('id')
    .eq('landlord_id', landlordId)
    .ilike('first_name', firstName)
    .ilike('last_name', lastName)
    .single();
  
  if (error) {
    console.error(`Error getting tenant ${firstName} ${lastName}:`, error);
    return null;
  }
  return data.id;
}

async function endTenancy(landlordId, propertyId, roomNumber, tenantId) {
  const { data: tenancies, error: findError } = await supabase
    .from('tenancies')
    .select('id')
    .eq('landlord_id', landlordId)
    .eq('property_id', propertyId)
    .eq('room_number', roomNumber)
    .eq('status', 'active');
  
  if (findError) {
    console.error('Error finding tenancies:', findError);
    return;
  }
  
  if (!tenancies?.length) {
    console.log(`No active tenancy found for room ${roomNumber}`);
    return;
  }

  const tenancyId = tenancies[0].id;

  const { error: updateError } = await supabase
    .from('tenancies')
    .update({ 
      status: 'ended', 
      end_date: '2026-02-28',
      updated_at: new Date().toISOString()
    })
    .eq('id', tenancyId);

  if (updateError) {
    console.error(`Error ending tenancy:`, updateError);
  } else {
    console.log(`✅ Ended tenancy for room ${roomNumber}`);
  }
}

async function createTenant(landlordId, firstName, lastName) {
  const { data, error } = await supabase
    .from('tenants')
    .insert({
      landlord_id: landlordId,
      first_name: firstName,
      last_name: lastName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) {
    console.error(`Error creating tenant ${firstName} ${lastName}:`, error);
    return null;
  }
  console.log(`✅ Created tenant: ${firstName} ${lastName} (${data.id})`);
  return data.id;
}

async function createTenancy(landlordId, propertyId, roomNumber, rentAmount, startDate) {
  const { data, error } = await supabase
    .from('tenancies')
    .insert({
      landlord_id: landlordId,
      property_id: propertyId,
      tenancy_type: 'single',
      status: 'active',
      start_date: startDate,
      rent_amount: rentAmount,
      rent_frequency: 'monthly',
      rent_due_day: 1,
      room_number: roomNumber,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) {
    console.error(`Error creating tenancy for room ${roomNumber}:`, error);
    return null;
  }
  console.log(`✅ Created tenancy: Room ${roomNumber} £${rentAmount} from ${startDate}`);
  return data.id;
}

async function linkTenantToTenancy(tenancyId, tenantId) {
  const { error } = await supabase
    .from('tenancy_tenants')
    .insert({
      tenancy_id: tenancyId,
      tenant_id: tenantId,
      is_primary: true,
      created_at: new Date().toISOString()
    });
  
  if (error) {
    console.error(`Error linking tenant to tenancy:`, error);
  } else {
    console.log(`✅ Linked tenant to tenancy`);
  }
}

async function main() {
  console.log('Starting tenant updates...\n');
  
  const landlordId = await getLandlordId();
  if (!landlordId) {
    console.error('Could not find landlord');
    return;
  }
  console.log(`Landlord ID: ${landlordId}\n`);

  // List all properties first
  console.log('=== Available Properties ===');
  const allProperties = await listProperties(landlordId);
  allProperties.forEach(p => console.log(`  - ${p.name} (${p.id})`));
  console.log('');

  // Get properties by exact match or partial
  // "2 Mill Farm House" is the Lockerley property
  const lockerley = allProperties.find(p => p.name.toLowerCase().includes('2 mill farm'));
  const woodstock = allProperties.find(p => p.name.toLowerCase().includes('woodstock'));
  
  console.log('Matched Properties:');
  console.log(`  Lockerley: ${lockerley?.id || 'NOT FOUND'}`);
  console.log(`  Woodstock: ${woodstock?.id || 'NOT FOUND'}\n`);

  if (!woodstock) {
    console.error('Woodstock property not found');
    return;
  }

  // Note: Lockerley not found in database - property may need to be created first
  if (!lockerley) {
    console.log('⚠️ Lockerley property not found - skipping Gav Mytton update\n');
  } else {
    // End Gav Mytton's tenancy at Lockerley
    console.log('=== Lockerley Changes ===');
    const gavId = await getTenantId(landlordId, 'Gav', 'Mytton');
    if (gavId) {
      await endTenancy(landlordId, lockerley.id, 'Room 5', gavId);
    }
    console.log('');
  }

  // 2. Woodstock Changes
  console.log('=== Woodstock Changes ===');
  
  // End Jude Dibia's Room 5 tenancy
  const judeId = await getTenantId(landlordId, 'Jude', 'Dibia');
  if (judeId) {
    await endTenancy(landlordId, woodstock.id, 'Room 5', judeId);
    
    // Create Jude's Room 1 tenancy
    const judeTenancyId = await createTenancy(landlordId, woodstock.id, 'Room 1', 800.00, '2026-03-01');
    if (judeTenancyId) {
      await linkTenantToTenancy(judeTenancyId, judeId);
    }
  }
  
  // Create Rikki Newnham tenant and tenancy
  const rikkiId = await createTenant(landlordId, 'Rikki', 'Newnham');
  if (rikkiId) {
    const rikkiTenancyId = await createTenancy(landlordId, woodstock.id, 'Room 5', 750.00, '2026-03-02');
    if (rikkiTenancyId) {
      await linkTenantToTenancy(rikkiTenancyId, rikkiId);
    }
  }
  
  // Create Jack Harris tenant and tenancy
  const jackId = await createTenant(landlordId, 'Jack', 'Harris');
  if (jackId) {
    const jackTenancyId = await createTenancy(landlordId, woodstock.id, 'Room 4', 650.00, '2026-03-22');
    if (jackTenancyId) {
      await linkTenantToTenancy(jackTenancyId, jackId);
    }
  }
  
  console.log('\n✅ All tenant changes completed!');
}

main().catch(console.error);
