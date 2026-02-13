-- Seed data for initial testing
-- Run after schema.sql: psql -d property_crm -f seed.sql

-- Insert test landlord
INSERT INTO landlords (id, name, email, company_name) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Paul', 'aireypaul@googlemail.com', 'AIRPROP');

-- Insert test properties (placeholders for your 3 properties)
INSERT INTO properties (id, landlord_id, name, address_line_1, city, postcode, property_type, bedrooms, bathrooms, is_hmo, status) VALUES
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Woodstock', 'Woodstock Road', 'London', 'W1', 'house', 4, 2, true, 'active'),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', '1 Mill Farm House', '1 Mill Farm Lane', 'Village', 'AB1 2CD', 'house', 3, 1, false, 'active'),
('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', '2 Mill Farm House', '2 Mill Farm Lane', 'Village', 'AB1 2CD', 'house', 3, 1, false, 'active');