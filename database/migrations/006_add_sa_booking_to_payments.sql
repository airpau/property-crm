-- Migration: Add sa_booking_id support to rent_payments for SA bookings
-- Created: 2026-02-16

-- Add sa_booking_id column to rent_payments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'rent_payments' AND column_name = 'sa_booking_id') THEN
    ALTER TABLE rent_payments ADD COLUMN sa_booking_id UUID REFERENCES sa_bookings(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_rent_payments_sa_booking ON rent_payments(sa_booking_id);

-- Make tenancy_id nullable since SA bookings don't have tenancies
ALTER TABLE rent_payments ALTER COLUMN tenancy_id DROP NOT NULL;

-- Add trigger for updated_at on rent_payments (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_rent_payments_timestamp'
  ) THEN
    CREATE TRIGGER update_rent_payments_timestamp
      BEFORE UPDATE ON rent_payments
      FOR EACH ROW
      EXECUTE FUNCTION update_tenants_updated_at();
  END IF;
END $$;
