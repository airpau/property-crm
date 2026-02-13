-- Property CRM Seed Data for Supabase
-- Paul's Properties, Tenants, and Tenancies
-- Run this after creating the Supabase project and running schema-supabase.sql

-- ============================================
-- SEED DATA INSTRUCTIONS:
-- 1. First, create a user in Supabase Auth via the dashboard or API
-- 2. Get the user's UUID and replace '7e78d39c-fabf-4099-b2d7-bf96064581f6' below
-- 3. Run this seed file
-- ============================================

-- NOTE: Replace this with the actual UUID from Supabase Auth after registration
-- DO NOT run this until you've created a user in Supabase Auth!

/*
-- STEP 1: Create landlord profile manually after user registration
INSERT INTO landlords (id, name, email, company_name) VALUES
('7e78d39c-fabf-4099-b2d7-bf96064581f6', 'Paul Airey', 'aireypaul@googlemail.com', 'AIRPROP');

-- ============================================
-- PROPERTY 1: WOODSTOCK (HMO - Winchester)
-- ============================================
INSERT INTO properties (
  id, landlord_id, name, address_line_1, city, postcode, property_type, 
  total_rooms, bedrooms, bathrooms, is_hmo, hmo_license_number, status
) VALUES 
('11111111-e29b-41d4-a716-446655440001', '7e78d39c-fabf-4099-b2d7-bf96064581f6', 
 'Woodstock', 'Woodstock, Mortimer Close', 'Winchester', 'SO23 7QX', 
 'house', 9, 9, 4, true, 'Suis Generis', 'active');

-- Tenants for Woodstock
INSERT INTO tenants (id, landlord_id, first_name, last_name) VALUES
('a01e8400-e29b-41d4-a716-446655440001', '7e78d39c-fabf-4099-b2d7-bf96064581f6', 'Jude', 'Dibia'),
('a02e8400-e29b-41d4-a716-446655440002', '7e78d39c-fabf-4099-b2d7-bf96064581f6', 'Raj', 'Edupuganti'),
('a03e8400-e29b-41d4-a716-446655440003', '7e78d39c-fabf-4099-b2d7-bf96064581f6', 'Richard', 'Osadebe'),
('a06e8400-e29b-41d4-a716-446655440006', '7e78d39c-fabf-4099-b2d7-bf96064581f6', 'Ben', 'Fraser'),
('a07e8400-e29b-41d4-a716-446655440007', '7e78d39c-fabf-4099-b2d7-bf96064581f6', 'Chris', 'Baird'),
('a08e8400-e29b-41d4-a716-446655440008', '7e78d39c-fabf-4099-b2d7-bf96064581f6', 'Marvin', 'Simon'),
('a09e8400-e29b-41d4-a716-446655440009', '7e78d39c-fabf-4099-b2d7-bf96064581f6', 'Sam', 'Airey');

-- Tenancies for Woodstock
INSERT INTO tenancies (id, landlord_id, property_id, tenancy_type, start_date, end_date, rent_amount, rent_frequency, rent_due_day, room_number, deposit_amount, status) VALUES
('b01e8400-e29b-41d4-a716-446655440001', '7e78d39c-fabf-4099-b2d7-bf96064581f6', '11111111-e29b-41d4-a716-446655440001', 'room_only', '2025-11-01', null, 800, 'monthly', 1, '1', 0, 'active'),
('b02e8400-e29b-41d4-a716-446655440002', '7e78d39c-fabf-4099-b2d7-bf96064581f6', '11111111-e29b-41d4-a716-446655440001', 'room_only', '2025-11-01', '2025-04-30', 650, 'monthly', 10, '2', 0, 'active'),
('b03e8400-e29b-41d4-a716-446655440003', '7e78d39c-fabf-4099-b2d7-bf96064581f6', '11111111-e29b-41d4-a716-446655440001', 'room_only', '2025-11-01', null, 800, 'monthly', 1, '3', 0, 'active'),
('b06e8400-e29b-41d4-a716-446655440006', '7e78d39c-fabf-4099-b2d7-bf96064581f6', '11111111-e29b-41d4-a716-446655440001', 'room_only', '2025-11-01', null, 750, 'monthly', 1, '6', 0, 'active'),
('b07e8400-e29b-41d4-a716-446655440007', '7e78d39c-fabf-4099-b2d7-bf96064581f6', '11111111-e29b-41d4-a716-446655440001', 'room_only', '2025-11-01', null, 850, 'monthly', 28, '7', 0, 'active'),
('b08e8400-e29b-41d4-a716-446655440008', '7e78d39c-fabf-4099-b2d7-bf96064581f6', '11111111-e29b-41d4-a716-446655440001', 'room_only', '2025-11-01', null, 800, 'monthly', 1, '8', 0, 'active'),
('b09e8400-e29b-41d4-a716-446655440009', '7e78d39c-fabf-4099-b2d7-bf96064581f6', '11111111-e29b-41d4-a716-446655440001', 'room_only', '2025-11-01', null, 360, 'monthly', 1, '9', 0, 'active');

-- Link tenants to tenancies
INSERT INTO tenancy_tenants (tenancy_id, tenant_id, is_primary) VALUES
('b01e8400-e29b-41d4-a716-446655440001', 'a01e8400-e29b-41d4-a716-446655440001', true),
('b02e8400-e29b-41d4-a716-446655440002', 'a02e8400-e29b-41d4-a716-446655440002', true),
('b03e8400-e29b-41d4-a716-446655440003', 'a03e8400-e29b-41d4-a716-446655440003', true),
('b06e8400-e29b-41d4-a716-446655440006', 'a06e8400-e29b-41d4-a716-446655440006', true),
('b07e8400-e29b-41d4-a716-446655440007', 'a07e8400-e29b-41d4-a716-446655440007', true),
('b08e8400-e29b-41d4-a716-446655440008', 'a08e8400-e29b-41d4-a716-446655440008', true),
('b09e8400-e29b-41d4-a716-446655440009', 'a09e8400-e29b-41d4-a716-446655440009', true);

-- ============================================
-- PROPERTY 2: 1 Mill Farm House (Mini HMO - Lockerley)
-- ============================================
INSERT INTO properties (id, landlord_id, name, address_line_1, city, postcode, property_type, bedrooms, bathrooms, is_hmo, status) VALUES 
('22222222-e29b-41d4-a716-446655440002', '7e78d39c-fabf-4099-b2d7-bf96064581f6', 
 '1 Mill Farm House', '1 Mill Farm House, East Tytherley Road', 'Lockerley', 'SO51 0LW', 
 'house', 3, 1, true, 'active');

-- Tenants
INSERT INTO tenants (id, landlord_id, first_name, last_name) VALUES
('a10e8400-e29b-41d4-a716-446655440101', '7e78d39c-fabf-4099-b2d7-bf96064581f6', 'Gary', 'Jackson'),
('a11e8400-e29b-41d4-a716-446655440102', '7e78d39c-fabf-4099-b2d7-bf96064581f6', 'Scott', 'Hines');

-- Tenancies
INSERT INTO tenancies (id, landlord_id, property_id, tenancy_type, start_date, rent_amount, rent_frequency, rent_due_day, room_number, deposit_amount, status) VALUES
('b10e8400-e29b-41d4-a716-446655440101', '7e78d39c-fabf-4099-b2d7-bf96064581f6', '22222222-e29b-41d4-a716-446655440002', 'room_only', '2023-01-01', 700, 'monthly', 23, '1', 0, 'active'),
('b11e8400-e29b-41d4-a716-446655440102', '7e78d39c-fabf-4099-b2d7-bf96064581f6', '22222222-e29b-41d4-a716-446655440002', 'room_only', '2023-01-01', 700, 'monthly', 1, '2', 0, 'active');

-- Link tenants
INSERT INTO tenancy_tenants (tenancy_id, tenant_id, is_primary) VALUES
('b10e8400-e29b-41d4-a716-446655440101', 'a10e8400-e29b-41d4-a716-446655440101', true),
('b11e8400-e29b-41d4-a716-446655440102', 'a11e8400-e29b-41d4-a716-446655440102', true);

-- ============================================
-- PROPERTY 3: 2 Mill Farm House (HMO - Lockerley)
-- ============================================
INSERT INTO properties (id, landlord_id, name, address_line_1, city, postcode, property_type, total_rooms, bathrooms, is_hmo, hmo_license_number, status) VALUES 
('33333333-e29b-41d4-a716-446655440003', '7e78d39c-fabf-4099-b2d7-bf96064581f6', 
 '2 Mill Farm House', '2 Mill Farm House, East Tytherley Road', 'Lockerley', 'SO51 0LW', 
 'house', 5, 3, true, 'Test Valley License', 'active');

-- Tenants
INSERT INTO tenants (id, landlord_id, first_name, last_name) VALUES
('a20e8400-e29b-41d4-a716-446655440201', '7e78d39c-fabf-4099-b2d7-bf96064581f6', 'Neil', 'Hamilton'),
('a23e8400-e29b-41d4-a716-446655440203', '7e78d39c-fabf-4099-b2d7-bf96064581f6', 'Gav', 'Mytton'),
('a24e8400-e29b-41d4-a716-446655440204', '7e78d39c-fabf-4099-b2d7-bf96064581f6', 'John', 'Yalley'),
('a25e8400-e29b-41d4-a716-446655440205', '7e78d39c-fabf-4099-b2d7-bf96064581f6', 'Phil', 'Painter');

-- Tenancies
INSERT INTO tenancies (id, landlord_id, property_id, tenancy_type, start_date, end_date, rent_amount, rent_frequency, rent_due_day, room_number, deposit_amount, status, notes) VALUES
('b20e8400-e29b-41d4-a716-446655440201', '7e78d39c-fabf-4099-b2d7-bf96064581f6', '33333333-e29b-41d4-a716-446655440003', 'room_only', '2023-01-01', null, 700, 'monthly', 16, '2', 0, 'active', '£300 arrears from Nov 2025, paying back via overpayments'),
('b23e8400-e29b-41d4-a716-446655440203', '7e78d39c-fabf-4099-b2d7-bf96064581f6', '33333333-e29b-41d4-a716-446655440003', 'room_only', '2025-02-14', null, 700, 'monthly', 14, '3', 0, 'active', 'Moving in 14th Feb 2026'),
('b24e8400-e29b-41d4-a716-446655440204', '7e78d39c-fabf-4099-b2d7-bf96064581f6', '33333333-e29b-41d4-a716-446655440003', 'room_only', '2023-01-01', null, 700, 'monthly', 6, '4', 0, 'active', 'King ensuite attic room'),
('b25e8400-e29b-41d4-a716-446655440205', '7e78d39c-fabf-4099-b2d7-bf96064581f6', '33333333-e29b-41d4-a716-446655440003', 'room_only', '2026-01-31', null, 700, 'monthly', 6, '5', 0, 'active', 'Moved in 31st Jan 2026');

-- Link tenants
INSERT INTO tenancy_tenants (tenancy_id, tenant_id, is_primary) VALUES
('b20e8400-e29b-41d4-a716-446655440201', 'a20e8400-e29b-41d4-a716-446655440201', true),
('b23e8400-e29b-41d4-a716-446655440203', 'a23e8400-e29b-41d4-a716-446655440203', true),
('b24e8400-e29b-41d4-a716-446655440204', 'a24e8400-e29b-41d4-a716-446655440204', true),
('b25e8400-e29b-41d4-a716-446655440205', 'a25e8400-e29b-41d4-a716-446655440205', true);

SELECT 'Data seeded successfully! Total: 3 properties, 13 tenants, 11 tenancies' as status;
*/
