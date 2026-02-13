-- Property CRM Seed Data - Paul's 3 Properties
-- Run: psql -d property_crm -f seed-paul-data.sql

-- Landlord
INSERT INTO landlords (id, name, email, company_name) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Paul Airey', 'aireypaul@googlemail.com', 'AIRPROP');

-- ============================================
-- PROPERTY 1: WOODSTOCK (HMO - Winchester)
-- ============================================
INSERT INTO properties (
  id, landlord_id, name, address_line_1, city, postcode, property_type, 
  total_rooms, bedrooms, bathrooms, is_hmo, hmo_license_number, status
) VALUES 
('11111111-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 
 'Woodstock', 'Woodstock, Mortimer Close', 'Winchester', 'SO23 7QX', 
 'house', 9, 9, 4, true, 'Suis Generis', 'active');

-- Tenants for Woodstock
INSERT INTO tenants (id, landlord_id, first_name, last_name) VALUES
('a01e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Jude', 'Dibia'),
('a02e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Raj', 'Edupuganti'),
('a03e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'Richard', 'Osadebe'),
('a06e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440000', 'Ben', 'Fraser'),
('a07e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440000', 'Chris', 'Baird'),
('a08e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440000', 'Marvin', 'Simon'),
('a09e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440000', 'Sam', 'Airey');

-- Tenancies for Woodstock
INSERT INTO tenancies (id, landlord_id, property_id, tenancy_type, start_date, end_date, rent_amount, rent_frequency, rent_due_day, room_number, deposit_amount, status) VALUES
('b01e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', '11111111-e29b-41d4-a716-446655440001', 'room_only', '2025-11-01', null, 800, 'monthly', 1, '1', 0, 'active'),
('b02e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', '11111111-e29b-41d4-a716-446655440001', 'room_only', '2025-11-01', '2025-04-30', 650, 'monthly', 10, '2', 0, 'active'),
('b03e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', '11111111-e29b-41d4-a716-446655440001', 'room_only', '2025-11-01', null, 800, 'monthly', 1, '3', 0, 'active'),
('b06e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440000', '11111111-e29b-41d4-a716-446655440001', 'room_only', '2025-11-01', null, 750, 'monthly', 1, '6', 0, 'active'),
('b07e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440000', '11111111-e29b-41d4-a716-446655440001', 'room_only', '2025-11-01', null, 850, 'monthly', 28, '7', 0, 'active'),
('b08e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440000', '11111111-e29b-41d4-a716-446655440001', 'room_only', '2025-11-01', null, 800, 'monthly', 1, '8', 0, 'active'),
('b09e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440000', '11111111-e29b-41d4-a716-446655440001', 'room_only', '2025-11-01', null, 360, 'monthly', 1, '9', 0, 'active');

-- Link tenants to tenancies
INSERT INTO tenancy_tenants (tenancy_id, tenant_id, is_primary) VALUES
('b01e8400-e29b-41d4-a716-446655440001', 'a01e8400-e29b-41d4-a716-446655440001', true),
('b02e8400-e29b-41d4-a716-446655440002', 'a02e8400-e29b-41d4-a716-446655440002', true),
('b03e8400-e29b-41d4-a716-446655440003', 'a03e8400-e29b-41d4-a716-446655440003', true),
('b06e8400-e29b-41d4-a716-446655440006', 'a06e8400-e29b-41d4-a716-446655440006', true),
('b07e8400-e29b-41d4-a716-446655440007', 'a07e8400-e29b-41d4-a716-446655440007', true),
('b08e8400-e29b-41d4-a716-446655440008', 'a08e8400-e29b-41d4-a716-446655440008', true),
('b09e8400-e29b-41d4-a716-446655440009', 'a09e8400-e29b-41d4-a716-446655440009', true);

-- Rent payments for Woodstock (Nov 2025 - Feb 2026)
INSERT INTO rent_payments (id, landlord_id, property_id, tenancy_id, due_date, amount_due, amount_paid, paid_date, status) VALUES
-- November 2025
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '11111111-e29b-41d4-a716-446655440001', 'b01e8400-e29b-41d4-a716-446655440001', '2025-11-01', 800, 800, '2025-11-01', 'paid'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '11111111-e29b-41d4-a716-446655440001', 'b02e8400-e29b-41d4-a716-446655440002', '2025-11-10', 650, 650, '2025-11-10', 'paid'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '11111111-e29b-41d4-a716-446655440001', 'b03e8400-e29b-41d4-a716-446655440003', '2025-11-01', 800, 800, '2025-11-01', 'paid'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '11111111-e29b-41d4-a716-446655440001', 'b06e8400-e29b-41d4-a716-446655440006', '2025-11-01', 750, 750, '2025-11-01', 'paid'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '11111111-e29b-41d4-a716-446655440001', 'b07e8400-e29b-41d4-a716-446655440007', '2025-11-28', 850, 850, '2025-11-28', 'paid'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '11111111-e29b-41d4-a716-446655440001', 'b08e8400-e29b-41d4-a716-446655440008', '2025-11-01', 800, 800, '2025-11-01', 'paid'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '11111111-e29b-41d4-a716-446655440001', 'b09e8400-e29b-41d4-a716-446655440009', '2025-11-01', 360, 360, '2025-11-01', 'paid'),

-- December 2025
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '11111111-e29b-41d4-a716-446655440001', 'b01e8400-e29b-41d4-a716-446655440001', '2025-12-01', 800, 800, '2025-12-01', 'paid'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '11111111-e29b-41d4-a716-446655440001', 'b02e8400-e29b-41d4-a716-446655440002', '2025-12-10', 650, 650, '2025-12-10', 'paid'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '11111111-e29b-41d4-a716-446655440001', 'b03e8400-e29b-41d4-a716-446655440003', '2025-12-01', 800, 800, '2025-12-01', 'paid'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '11111111-e29b-41d4-a716-446655440001', 'b06e8400-e29b-41d4-a716-446655440006', '2025-12-01', 750, 750, '2025-12-01', 'paid'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '11111111-e29b-41d4-a716-446655440001', 'b07e8400-e29b-41d4-a716-446655440007', '2025-12-28', 850, 850, '2025-12-28', 'paid'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '11111111-e29b-41d4-a716-446655440001', 'b08e8400-e29b-41d4-a716-446655440008', '2025-12-01', 800, 800, '2025-12-01', 'paid'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '11111111-e29b-41d4-a716-446655440001', 'b09e8400-e29b-41d4-a716-446655440009', '2025-12-01', 360, 360, '2025-12-01', 'paid'),

-- January 2026
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '11111111-e29b-41d4-a716-446655440001', 'b01e8400-e29b-41d4-a716-446655440001', '2026-01-01', 800, 800, '2026-01-01', 'paid'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '11111111-e29b-41d4-a716-446655440001', 'b02e8400-e29b-41d4-a716-446655440002', '2026-01-10', 650, 650, '2026-01-10', 'paid'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '11111111-e29b-41d4-a716-446655440001', 'b03e8400-e29b-41d4-a716-446655440003', '2026-01-01', 800, 800, '2026-01-01', 'paid'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '11111111-e29b-41d4-a716-446655440001', 'b06e8400-e29b-41d4-a716-446655440006', '2026-01-01', 750, 750, '2026-01-01', 'paid'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '11111111-e29b-41d4-a716-446655440001', 'b07e8400-e29b-41d4-a716-446655440007', '2026-01-28', 850, 850, '2026-01-28', 'paid'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '11111111-e29b-41d4-a716-446655440001', 'b08e8400-e29b-41d4-a716-446655440008', '2026-01-01', 800, 800, '2026-01-01', 'paid'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '11111111-e29b-41d4-a716-446655440001', 'b09e8400-e29b-41d4-a716-446655440009', '2026-01-01', 360, 360, '2026-01-01', 'paid'),

-- February 2026
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '11111111-e29b-41d4-a716-446655440001', 'b01e8400-e29b-41d4-a716-446655440001', '2026-02-01', 800, 800, '2026-02-01', 'paid'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '11111111-e29b-41d4-a716-446655440001', 'b02e8400-e29b-41d4-a716-446655440002', '2026-02-10', 650, 650, '2026-02-10', 'paid'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '11111111-e29b-41d4-a716-446655440001', 'b03e8400-e29b-41d4-a716-446655440003', '2026-02-01', 800, 800, '2026-02-01', 'paid'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '11111111-e29b-41d4-a716-446655440001', 'b06e8400-e29b-41d4-a716-446655440006', '2026-02-01', 750, 750, '2026-02-01', 'paid'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '11111111-e29b-41d4-a716-446655440001', 'b07e8400-e29b-41d4-a716-446655440007', '2026-02-28', 850, null, null, 'pending'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '11111111-e29b-41d4-a716-446655440001', 'b08e8400-e29b-41d4-a716-446655440008', '2026-02-01', 800, 800, '2026-02-01', 'paid'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '11111111-e29b-41d4-a716-446655440001', 'b09e8400-e29b-41d4-a716-446655440009', '2026-02-01', 360, 360, '2026-02-01', 'paid');

-- ============================================
-- PROPERTY 2: 1 Mill Farm House (Mini HMO - Lockerley)
-- ============================================
INSERT INTO properties (id, landlord_id, name, address_line_1, city, postcode, property_type, bedrooms, bathrooms, is_hmo, status) VALUES 
('22222222-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 
 '1 Mill Farm House', '1 Mill Farm House, East Tytherley Road', 'Lockerley', 'SO51 0LW', 
 'house', 3, 1, true, 'active');

-- Tenants
INSERT INTO tenants (id, landlord_id, first_name, last_name) VALUES
('a10e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440000', 'Gary', 'Jackson'),
('a11e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440000', 'Scott', 'Hines');

-- Tenancies
INSERT INTO tenancies (id, landlord_id, property_id, tenancy_type, start_date, rent_amount, rent_frequency, rent_due_day, room_number, deposit_amount, status) VALUES
('b10e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440000', '22222222-e29b-41d4-a716-446655440002', 'room_only', '2023-01-01', 700, 'monthly', 23, '1', 0, 'active'),
('b11e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440000', '22222222-e29b-41d4-a716-446655440002', 'room_only', '2023-01-01', 700, 'monthly', 1, '2', 0, 'active');

-- Link tenants
INSERT INTO tenancy_tenants (tenancy_id, tenant_id, is_primary) VALUES
('b10e8400-e29b-41d4-a716-446655440101', 'a10e8400-e29b-41d4-a716-446655440101', true),
('b11e8400-e29b-41d4-a716-446655440102', 'a11e8400-e29b-41d4-a716-446655440102', true);

-- Rent payments (3 months history)
INSERT INTO rent_payments (id, landlord_id, property_id, tenancy_id, due_date, amount_due, amount_paid, paid_date, status) VALUES
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '22222222-e29b-41d4-a716-446655440002', 'b10e8400-e29b-41d4-a716-446655440101', '2026-01-23', 700, 700, '2026-01-23', 'paid'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '22222222-e29b-41d4-a716-446655440002', 'b11e8400-e29b-41d4-a716-446655440102', '2026-01-01', 700, 700, '2026-01-01', 'paid'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '22222222-e29b-41d4-a716-446655440002', 'b10e8400-e29b-41d4-a716-446655440101', '2026-02-23', 700, 700, '2026-02-23', 'paid'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '22222222-e29b-41d4-a716-446655440002', 'b11e8400-e29b-41d4-a716-446655440102', '2026-02-01', 700, 700, '2026-02-01', 'paid');

-- ============================================
-- PROPERTY 3: 2 Mill Farm House (HMO - Lockerley)
-- ============================================
INSERT INTO properties (id, landlord_id, name, address_line_1, city, postcode, property_type, total_rooms, bathrooms, is_hmo, hmo_license_number, status) VALUES 
('33333333-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 
 '2 Mill Farm House', '2 Mill Farm House, East Tytherley Road', 'Lockerley', 'SO51 0LW', 
 'house', 5, 3, true, 'Test Valley License', 'active');

-- Tenants
INSERT INTO tenants (id, landlord_id, first_name, last_name) VALUES
('a20e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440000', 'Neil', 'Hamilton'),
('a23e8400-e29b-41d4-a716-446655440203', '550e8400-e29b-41d4-a716-446655440000', 'Gav', 'Mytton'),
('a24e8400-e29b-41d4-a716-446655440204', '550e8400-e29b-41d4-a716-446655440000', 'John', 'Yalley'),
('a25e8400-e29b-41d4-a716-446655440205', '550e8400-e29b-41d4-a716-446655440000', 'Phil', 'Painter');

-- Tenancies
INSERT INTO tenancies (id, landlord_id, property_id, tenancy_type, start_date, end_date, rent_amount, rent_frequency, rent_due_day, room_number, deposit_amount, status, notes) VALUES
('b20e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440000', '33333333-e29b-41d4-a716-446655440003', 'room_only', '2023-01-01', null, 700, 'monthly', 16, '2', 0, 'active', '£300 arrears from Nov 2025, paying back via overpayments'),
('b23e8400-e29b-41d4-a716-446655440203', '550e8400-e29b-41d4-a716-446655440000', '33333333-e29b-41d4-a716-446655440003', 'room_only', '2025-02-14', null, 700, 'monthly', 14, '3', 0, 'active', 'Moving in 14th Feb 2026'),
('b24e8400-e29b-41d4-a716-446655440204', '550e8400-e29b-41d4-a716-446655440000', '33333333-e29b-41d4-a716-446655440003', 'room_only', '2023-01-01', null, 700, 'monthly', 6, '4', 0, 'active', 'King ensuite attic room'),
('b25e8400-e29b-41d4-a716-446655440205', '550e8400-e29b-41d4-a716-446655440000', '33333333-e29b-41d4-a716-446655440003', 'room_only', '2026-01-31', null, 700, 'monthly', 6, '5', 0, 'active', 'Moved in 31st Jan 2026');

-- Link tenants
INSERT INTO tenancy_tenants (tenancy_id, tenant_id, is_primary) VALUES
('b20e8400-e29b-41d4-a716-446655440201', 'a20e8400-e29b-41d4-a716-446655440201', true),
('b23e8400-e29b-41d4-a716-446655440203', 'a23e8400-e29b-41d4-a716-446655440203', true),
('b24e8400-e29b-41d4-a716-446655440204', 'a24e8400-e29b-41d4-a716-446655440204', true),
('b25e8400-e29b-41d4-a716-446655440205', 'a25e8400-e29b-41d4-a716-446655440205', true);

-- Rent payments for 2 Mill Farm House
-- Neil Hamilton (Room 2) - £300 arrears from November
INSERT INTO rent_payments (id, landlord_id, property_id, tenancy_id, due_date, amount_due, amount_paid, paid_date, status) VALUES
-- November 2025 - Neil missed full payment
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '33333333-e29b-41d4-a716-446655440003', 'b20e8400-e29b-41d4-a716-446655440201', '2025-11-16', 700, 400, '2025-11-20', 'partial'),

-- December 2025 - Neil paid £1000 to start clearing arrears
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '33333333-e29b-41d4-a716-446655440003', 'b20e8400-e29b-41d4-a716-446655440201', '2025-12-16', 700, 1000, '2025-12-16', 'paid'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '33333333-e29b-41d4-a716-446655440003', 'b24e8400-e29b-41d4-a716-446655440204', '2025-12-06', 700, 700, '2025-12-06', 'paid'),

-- January 2026
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '33333333-e29b-41d4-a716-446655440003', 'b20e8400-e29b-41d4-a716-446655440201', '2026-01-16', 700, 800, '2026-01-16', 'paid'), -- £100 overpayment
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '33333333-e29b-41d4-a716-446655440003', 'b24e8400-e29b-41d4-a716-446655440204', '2026-01-06', 700, 700, '2026-01-06', 'paid'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '33333333-e29b-41d4-a716-446655440003', 'b25e8400-e29b-41d4-a716-446655440205', '2026-02-06', 700, 700, '2026-02-01', 'paid'), -- Phil moved in 31st Jan, first payment due Feb 6th

-- February 2026 - Arrears still £100 remaining
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '33333333-e29b-41d4-a716-446655440003', 'b20e8400-e29b-41d4-a716-446655440201', '2026-02-16', 700, 700, '2026-02-16', 'paid'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '33333333-e29b-41d4-a716-446655440003', 'b24e8400-e29b-41d4-a716-446655440204', '2026-02-06', 700, 700, '2026-02-06', 'paid'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '33333333-e29b-41d4-a716-446655440003', 'b25e8400-e29b-41d4-a716-446655440205', '2026-02-06', 700, 700, '2026-02-06', 'paid');

-- ============================================
-- REMINDERS / TASKS
-- ============================================

-- Raj Edupuganti tenancy expiring in April
INSERT INTO reminders (id, landlord_id, title, description, due_date, category, priority, status) VALUES
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 
 'Room 2 Tenancy Renewal Decision', 
 'Raj Edupuganti tenancy expires April 2025. Decide on renewal or find new tenant.',
 '2025-03-15', 'tenancy', 'high', 'pending');

-- Neil Hamilton arrears follow-up
INSERT INTO reminders (id, landlord_id, property_id, title, description, due_date, category, priority, status) VALUES
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '33333333-e29b-41d4-a716-446655440003',
 'Neil Hamilton - Confirm Arrears Cleared',
 '£300 arrears from November. Currently paying back via overpayments. Expected to clear by end of March.',
 '2025-03-31', 'financial', 'medium', 'pending');

-- Gav Mytton move-in confirmation
INSERT INTO reminders (id, landlord_id, property_id, title, description, due_date, category, priority, status) VALUES
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '33333333-e29b-41d4-a716-446655440003',
 'Gav Mytton Move-in Day',
 'Room 3 tenant moving in. Ensure rent due date (14th) is confirmed.',
 '2025-02-14', 'tenancy', 'high', 'pending');

-- Marketing void rooms
INSERT INTO reminders (id, landlord_id, property_id, title, description, due_date, category, priority, status) VALUES
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '11111111-e29b-41d4-a716-446655440001',
 'Market Woodstock Rooms 4 & 5',
 'Two empty rooms at £650 and £750. Potential £1,400/month income.',
 '2025-02-20', 'tenancy', 'high', 'pending'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '22222222-e29b-41d4-a716-446655440002',
 'Market 1 Mill Farm House Room 3',
 'Empty month at £650. Mini HMO licence pending from Test Valley.',
 '2025-02-20', 'tenancy', 'high', 'pending'),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '33333333-e29b-41d4-a716-446655440003',
 'Market 2 Mill Farm House Room 1',
 'Empty at £650 since last month. Good sized double room.',
 '2025-02-20', 'tenancy', 'high', 'pending');

-- HMO Licence follow-up for 1 Mill Farm House
INSERT INTO reminders (id, landlord_id, property_id, title, description, due_date, category, priority, status) VALUES
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '22222222-e29b-41d4-a716-446655440002',
 'Chase Test Valley Mini HMO Licence',
 'Licence application pending. Limit 2 unrelated occupants under Article 4 if not licensed.',
 '2025-02-28', 'compliance', 'high', 'pending');

SELECT 'Data seeded successfully' as status;