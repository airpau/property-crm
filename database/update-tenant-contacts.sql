-- Property CRM Seed Data for Supabase - UPDATE TENANT CONTACTS
-- Add email and phone to existing tenants

-- ============================================
-- WOODSTOCK TENANTS - Update with contact info
-- ============================================
UPDATE tenants SET email = 'jude.dibia@example.com', phone = '07700 900001' WHERE first_name = 'Jude' AND last_name = 'Dibia';
UPDATE tenants SET email = 'raj.edupuganti@example.com', phone = '07700 900002' WHERE first_name = 'Raj' AND last_name = 'Edupuganti';
UPDATE tenants SET email = 'richard.osadebe@example.com', phone = '07700 900003' WHERE first_name = 'Richard' AND last_name = 'Osadebe';
UPDATE tenants SET email = 'ben.fraser@example.com', phone = '07700 900006' WHERE first_name = 'Ben' AND last_name = 'Fraser';
UPDATE tenants SET email = 'chris.baird@example.com', phone = '07700 900007' WHERE first_name = 'Chris' AND last_name = 'Baird';
UPDATE tenants SET email = 'marvin.simon@example.com', phone = '07700 900008' WHERE first_name = 'Marvin' AND last_name = 'Simon';
UPDATE tenants SET email = 'sam.airey@example.com', phone = '07700 900009' WHERE first_name = 'Sam' AND last_name = 'Airey';

-- ============================================
-- 1 MILL FARM HOUSE TENANTS
-- ============================================
UPDATE tenants SET email = 'gary.jackson@example.com', phone = '07700 900101' WHERE first_name = 'Gary' AND last_name = 'Jackson';
UPDATE tenants SET email = 'scott.hines@example.com', phone = '07700 900102' WHERE first_name = 'Scott' AND last_name = 'Hines';

-- ============================================
-- 2 MILL FARM HOUSE TENANTS  
-- ============================================
UPDATE tenants SET email = 'neil.hamilton@example.com', phone = '07700 900201' WHERE first_name = 'Neil' AND last_name = 'Hamilton';
UPDATE tenants SET email = 'gav.mytton@example.com', phone = '07700 900203' WHERE first_name = 'Gav' AND last_name = 'Mytton';
UPDATE tenants SET email = 'john.yalley@example.com', phone = '07700 900204' WHERE first_name = 'John' AND last_name = 'Yalley';
UPDATE tenants SET email = 'phil.painter@example.com', phone = '07700 900205' WHERE first_name = 'Phil' AND last_name = 'Painter';

-- ============================================
-- Create sample rent payments for current month
-- ============================================
-- This assumes the rent_payments table schema from your existing setup
-- If the table doesn't exist or has different structure, adjust accordingly

-- For now, this will work if you have the rent_payments table set up
-- Otherwise you can run this SQL separately after creating the table

-- Get property IDs for creating payments
DO $$
DECLARE
    prop1_id UUID := '11111111-e29b-41d4-a716-446655440001'; -- Woodstock
    prop2_id UUID := '22222222-e29b-41d4-a716-446655440002'; -- 1 Mill Farm
    prop3_id UUID := '33333333-e29b-41d4-a716-446655440003'; -- 2 Mill Farm
    today DATE := CURRENT_DATE;
    current_month_start DATE := DATE_TRUNC('month', CURRENT_DATE);
    landlord_uuid UUID := '7e78d39c-fabf-4099-b2d7-bf96064581f6';
BEGIN
    -- Create sample payments for current month (if table exists)
    -- These will be marked as 'pending' to show up in the tracker
    
    -- Only run if rent_payments table exists
    IF EXISTS (SELECT FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'rent_payments') THEN
        
        -- Woodstock tenancies - multiple room payments
        INSERT INTO rent_payments (landlord_id, property_id, tenancy_id, tenant_id, amount_due, due_date, status, created_at)
        SELECT 
            landlord_uuid,
            prop1_id,
            t.id,
            tt.tenant_id,
            t.rent_amount,
            current_month_start,
            'pending',
            NOW()
        FROM tenancies t
        JOIN tenancy_tenants tt ON t.id = tt.tenancy_id
        WHERE t.property_id = prop1_id AND t.status = 'active'
        ON CONFLICT DO NOTHING;
        
        -- 1 Mill Farm payments
        INSERT INTO rent_payments (landlord_id, property_id, tenancy_id, tenant_id, amount_due, due_date, status, created_at)
        SELECT 
            landlord_uuid,
            prop2_id,
            t.id,
            tt.tenant_id,
            t.rent_amount,
            current_month_start,
            'pending',
            NOW()
        FROM tenancies t
        JOIN tenancy_tenants tt ON t.id = tt.tenancy_id
        WHERE t.property_id = prop2_id AND t.status = 'active'
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
