-- Migration: Add currency support for SA bookings
-- Created: 2026-02-16

-- Add currency column to sa_bookings with GBP default
ALTER TABLE sa_bookings
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'GBP'
  CHECK (currency IN ('GBP', 'USD', 'EUR', 'CAD', 'AUD'));

-- Add currency column to properties for default property currency
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'GBP'
  CHECK (currency IN ('GBP', 'USD', 'EUR', 'CAD', 'AUD'));

-- Update existing bookings to GBP
UPDATE sa_bookings SET currency = 'GBP' WHERE currency IS NULL;

-- Update existing properties to GBP
UPDATE properties SET currency = 'GBP' WHERE currency IS NULL;
