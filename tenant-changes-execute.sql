-- PROPERTY ANGEL CRM - TENANT CHANGES (March 8, 2026)
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/ptkzpaukpknualqnyspq/sql

-- ============================================
-- STEP 0: Get Landlord ID (for reference)
-- ============================================
-- Note your landlord_id from this query, then replace [LANDLORD_ID] below
-- SELECT id FROM landlords LIMIT 1;

-- ============================================
-- STEP 1: Get Property IDs
-- ============================================
-- Verify property IDs (for reference)
-- SELECT id, name FROM properties WHERE name ILIKE '%Lockerley%' OR name ILIKE '%Woodstock%';

-- ============================================
-- STEP 2: End Gav Mytton's Tenancy (Lockerley Room 5)
-- ============================================
UPDATE tenancies t
SET status = 'ended', 
    end_date = '2026-02-28',
    updated_at = NOW()
FROM tenants tn
JOIN tenancy_tenants tt ON tt.tenant_id = tn.id
WHERE t.id = tt.tenancy_id
  AND t.status = 'active'
  AND tn.first_name ILIKE 'Gav'
  AND tn.last_name ILIKE 'Mytton'
  AND t.room_number = 'Room 5';

-- Verify: Check Gav Mytton's tenancy ended
-- SELECT t.id, t.room_number, t.status, t.end_date, tn.first_name, tn.last_name
-- FROM tenancies t
-- JOIN tenancy_tenants tt ON tt.tenancy_id = t.id
-- JOIN tenants tn ON tn.id = tt.tenant_id
-- WHERE tn.last_name ILIKE 'Mytton';

-- ============================================
-- STEP 3: End Jude Dibia's Room 5 Tenancy (Woodstock)
-- ============================================
UPDATE tenancies t
SET status = 'ended', 
    end_date = '2026-02-28',
    updated_at = NOW()
FROM tenants tn
JOIN tenancy_tenants tt ON tt.tenant_id = tn.id
WHERE t.id = tt.tenancy_id
  AND t.status = 'active'
  AND tn.first_name ILIKE 'Jude'
  AND tn.last_name ILIKE 'Dibia'
  AND t.room_number = 'Room 5';

-- ============================================
-- STEP 4: Create Jude Dibia's Room 1 Tenancy (Woodstock)
-- ============================================
-- First get Jude's tenant_id
DO $$
DECLARE
    jude_id UUID;
    woodstock_id UUID;
    new_tenancy_id UUID;
BEGIN
    -- Get Jude's tenant ID
    SELECT id INTO jude_id FROM tenants WHERE first_name ILIKE 'Jude' AND last_name ILIKE 'Dibia' LIMIT 1;
    
    -- Get Woodstock property ID
    SELECT id INTO woodstock_id FROM properties WHERE name ILIKE '%Woodstock%' LIMIT 1;
    
    -- Create new tenancy for Room 1
    INSERT INTO tenancies (
        landlord_id, property_id, tenancy_type, status, start_date, 
        rent_amount, rent_frequency, rent_due_day, room_number, created_at, updated_at
    )
    SELECT 
        l.id, woodstock_id, 'single', 'active', '2026-03-01',
        800.00, 'monthly', 1, 'Room 1', NOW(), NOW()
    FROM landlords l
    WHERE l.id = (
        SELECT landlord_id FROM tenants WHERE id = jude_id
    )
    RETURNING id INTO new_tenancy_id;
    
    -- Link Jude to new tenancy
    INSERT INTO tenancy_tenants (tenancy_id, tenant_id, is_primary, created_at)
    VALUES (new_tenancy_id, jude_id, true, NOW());
    
    RAISE NOTICE 'Created Room 1 tenancy for Jude Dibia (ID: %)', new_tenancy_id;
END $$;

-- ============================================
-- STEP 5: Create Rikki Newnham Tenant & Room 5 Tenancy
-- ============================================
DO $$
DECLARE
    rikki_id UUID;
    woodstock_id UUID;
    landlord_uuid UUID;
    new_tenancy_id UUID;
BEGIN
    -- Get Woodstock and landlord
    SELECT id INTO woodstock_id FROM properties WHERE name ILIKE '%Woodstock%' LIMIT 1;
    SELECT landlord_id INTO landlord_uuid FROM properties WHERE id = woodstock_id;
    
    -- Check if Rikki already exists
    SELECT id INTO rikki_id FROM tenants 
    WHERE first_name ILIKE 'Rikki' AND last_name ILIKE 'Newnham' AND landlord_id = landlord_uuid;
    
    -- Create Rikki if doesn't exist
    IF rikki_id IS NULL THEN
        INSERT INTO tenants (landlord_id, first_name, last_name, created_at, updated_at)
        VALUES (landlord_uuid, 'Rikki', 'Newnham', NOW(), NOW())
        RETURNING id INTO rikki_id;
        RAISE NOTICE 'Created tenant: Rikki Newnham';
    ELSE
        RAISE NOTICE 'Rikki Newnham already exists (ID: %)', rikki_id;
    END IF;
    
    -- Create Room 5 tenancy
    INSERT INTO tenancies (
        landlord_id, property_id, tenancy_type, status, start_date, 
        rent_amount, rent_frequency, rent_due_day, room_number, created_at, updated_at
    )
    VALUES (
        landlord_uuid, woodstock_id, 'single', 'active', '2026-03-02',
        750.00, 'monthly', 1, 'Room 5', NOW(), NOW()
    )
    RETURNING id INTO new_tenancy_id;
    
    -- Link Rikki to tenancy
    INSERT INTO tenancy_tenants (tenancy_id, tenant_id, is_primary, created_at)
    VALUES (new_tenancy_id, rikki_id, true, NOW());
    
    RAISE NOTICE 'Created Room 5 tenancy for Rikki Newnham';
END $$;

-- ============================================
-- STEP 6: Create Jack Harris Tenant & Room 4 Tenancy
-- ============================================
DO $$
DECLARE
    jack_id UUID;
    woodstock_id UUID;
    landlord_uuid UUID;
    new_tenancy_id UUID;
BEGIN
    -- Get Woodstock and landlord
    SELECT id INTO woodstock_id FROM properties WHERE name ILIKE '%Woodstock%' LIMIT 1;
    SELECT landlord_id INTO landlord_uuid FROM properties WHERE id = woodstock_id;
    
    -- Check if Jack already exists
    SELECT id INTO jack_id FROM tenants 
    WHERE first_name ILIKE 'Jack' AND last_name ILIKE 'Harris' AND landlord_id = landlord_uuid;
    
    -- Create Jack if doesn't exist
    IF jack_id IS NULL THEN
        INSERT INTO tenants (landlord_id, first_name, last_name, created_at, updated_at)
        VALUES (landlord_uuid, 'Jack', 'Harris', NOW(), NOW())
        RETURNING id INTO jack_id;
        RAISE NOTICE 'Created tenant: Jack Harris';
    ELSE
        RAISE NOTICE 'Jack Harris already exists (ID: %)', jack_id;
    END IF;
    
    -- Create Room 4 tenancy  
    INSERT INTO tenancies (
        landlord_id, property_id, tenancy_type, status, start_date, 
        rent_amount, rent_frequency, rent_due_day, room_number, created_at, updated_at
    )
    VALUES (
        landlord_uuid, woodstock_id, 'single', 'active', '2026-03-22',
        650.00, 'monthly', 1, 'Room 4', NOW(), NOW()
    )
    RETURNING id INTO new_tenancy_id;
    
    -- Link Jack to tenancy
    INSERT INTO tenancy_tenants (tenancy_id, tenant_id, is_primary, created_at)
    VALUES (new_tenancy_id, jack_id, true, NOW());
    
    RAISE NOTICE 'Created Room 4 tenancy for Jack Harris';
END $$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check all Woodstock tenancies
-- SELECT t.id, t.room_number, t.rent_amount, t.status, t.start_date, tn.first_name, tn.last_name
-- FROM tenancies t
-- JOIN tenancy_tenants tt ON tt.tenancy_id = t.id
-- JOIN tenants tn ON tn.id = tt.tenant_id
-- JOIN properties p ON p.id = t.property_id
-- WHERE p.name ILIKE '%Woodstock%'
-- ORDER BY t.room_number;

-- Check Lockerley tenancies  
-- SELECT t.id, t.room_number, t.rent_amount, t.status, t.end_date, tn.first_name, tn.last_name
-- FROM tenancies t
-- JOIN tenancy_tenants tt ON tt.tenancy_id = t.id
-- JOIN tenants tn ON tn.id = tt.tenant_id
-- JOIN properties p ON p.id = t.property_id
-- WHERE p.name ILIKE '%Lockerley%'
-- ORDER BY t.room_number;

-- ============================================
-- INSTRUCTIONS
-- ============================================
-- 1. Go to https://supabase.com/dashboard/project/ptkzpaukpknualqnyspq/sql
-- 2. Copy this entire file contents
-- 3. Paste into SQL Editor
-- 4. Click "Run" 
-- 5. Look for "Success" and RAISE NOTICE messages in output
-- ============================================
