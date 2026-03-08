// Config-driven tenant updates
// Usage: CONFIG_FILE=./config/tenant-changes.json node update-tenants.js

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CONFIG_FILE = process.env.CONFIG_FILE || './config/tenant-changes.json';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Load configuration
function loadConfig() {
  const configPath = path.resolve(CONFIG_FILE);
  if (!fs.existsSync(configPath)) {
    console.error(`Config file not found: ${configPath}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

async function getLandlordId() {
  const { data, error } = await supabase.from('landlords').select('id').limit(1).single();
  if (error) {
    console.error('Error getting landlord:', error);
    return null;
  }
  return data.id;
}

async function listProperties(landlordId) {
  const { data, error } = await supabase.from('properties').select('id, name').eq('landlord_id', landlordId);
  if (error) {
    console.error('Error listing properties:', error);
    return [];
  }
  return data || [];
}

async function getPropertyId(properties, configProperty) {
  const match = properties.find(p => p.name.toLowerCase().includes(configProperty.nameMatch.toLowerCase()));
  return match?.id || null;
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

async function endTenancy(landlordId, propertyId, roomNumber, tenantId, endDate) {
  const { data: tenancies, error: findError } = await supabase
    .from('tenancies')
    .select('id')
    .eq('landlord_id', landlordId)
    .eq('property_id', propertyId)
    .eq('room_number', roomNumber)
    .eq('status', 'active');
  
  if (findError) {
    console.error('Error finding tenancies:', findError);
    return false;
  }
  
  if (!tenancies?.length) {
    console.log(`No active tenancy found for room ${roomNumber}`);
    return false;
  }

  const tenancyId = tenancies[0].id;

  const { error: updateError } = await supabase
    .from('tenancies')
    .update({ 
      status: 'ended', 
      end_date: endDate,
      updated_at: new Date().toISOString()
    })
    .eq('id', tenancyId);

  if (updateError) {
    console.error(`Error ending tenancy:`, updateError);
    return false;
  }
  console.log(`✅ Ended tenancy for room ${roomNumber} on ${endDate}`);
  return true;
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
    return false;
  }
  console.log(`✅ Linked tenant to tenancy`);
  return true;
}

async function main() {
  console.log('Starting tenant updates...\n');
  
  const config = loadConfig();
  
  const landlordId = await getLandlordId();
  if (!landlordId) {
    console.error('Could not find landlord');
    return;
  }
  console.log(`Landlord ID: ${landlordId}\n`);

  // Map property keys to IDs
  console.log('=== Resolving Properties ===');
  const allProperties = await listProperties(landlordId);
  const propertyMap = {};
  
  for (const [key, propConfig] of Object.entries(config.properties)) {
    const id = await getPropertyId(allProperties, propConfig);
    propertyMap[key] = id;
    console.log(`  ${key}: ${id ? '✅ ' + id : '❌ NOT FOUND'}`);
  }
  console.log('');

  // Process tenancy endings
  if (config.tenantChanges?.endTenancies?.length > 0) {
    console.log('=== Ending Tenancies ===');
    for (const endConfig of config.tenantChanges.endTenancies) {
      const propertyId = propertyMap[endConfig.propertyKey];
      if (!propertyId) {
        console.log(`❌ Property ${endConfig.propertyKey} not found, skipping`);
        continue;
      }
      
      const tenantId = await getTenantId(landlordId, endConfig.tenantFirstName, endConfig.tenantLastName);
      if (!tenantId) {
        console.log(`❌ Tenant ${endConfig.tenantFirstName} ${endConfig.tenantLastName} not found`);
        continue;
      }
      
      await endTenancy(landlordId, propertyId, endConfig.roomNumber, tenantId, endConfig.endDate);
    }
    console.log('');
  }

  // Process new tenancies
  if (config.tenantChanges?.newTenancies?.length > 0) {
    console.log('=== Creating New Tenancies ===');
    for (const newConfig of config.tenantChanges.newTenancies) {
      const propertyId = propertyMap[newConfig.propertyKey];
      if (!propertyId) {
        console.log(`❌ Property ${newConfig.propertyKey} not found, skipping`);
        continue;
      }
      
      // Try to find existing tenant first
      let tenantId = await getTenantId(landlordId, newConfig.tenantFirstName, newConfig.tenantLastName);
      
      // Create if not exists
      if (!tenantId) {
        tenantId = await createTenant(landlordId, newConfig.tenantFirstName, newConfig.tenantLastName);
      } else {
        console.log(`ℹ️ Using existing tenant: ${newConfig.tenantFirstName} ${newConfig.tenantLastName}`);
      }
      
      if (tenantId) {
        const tenancyId = await createTenancy(
          landlordId, 
          propertyId, 
          newConfig.roomNumber, 
          newConfig.rentAmount, 
          newConfig.startDate
        );
        
        if (tenancyId) {
          await linkTenantToTenancy(tenancyId, tenantId);
        }
      }
    }
    console.log('');
  }
  
  console.log('✅ All tenant changes completed!');
}

main().catch(console.error);
