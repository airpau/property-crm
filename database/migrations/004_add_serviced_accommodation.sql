-- Migration: Add property types and serviced accommodation support
-- Created: 2026-02-15

-- Add property_type column to properties (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'properties' AND column_name = 'property_category') THEN
    ALTER TABLE properties ADD COLUMN property_category VARCHAR(20) DEFAULT 'btr' 
      CHECK (property_category IN ('hmo', 'btr', 'sa', 'commercial'));
  END IF;
END $$;

-- Add management columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'properties' AND column_name = 'is_managed') THEN
    ALTER TABLE properties ADD COLUMN is_managed BOOLEAN DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'properties' AND column_name = 'management_fee_percent') THEN
    ALTER TABLE properties ADD COLUMN management_fee_percent DECIMAL(5,2);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'properties' AND column_name = 'fixed_cleaning_fee') THEN
    ALTER TABLE properties ADD COLUMN fixed_cleaning_fee DECIMAL(10,2);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'properties' AND column_name = 'property_manager_name') THEN
    ALTER TABLE properties ADD COLUMN property_manager_name VARCHAR(255);
  END IF;
END $$;

-- Create table for SA bookings
CREATE TABLE IF NOT EXISTS sa_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Booking details
  reservation_id VARCHAR(100),
  guest_name VARCHAR(255),
  platform VARCHAR(50) NOT NULL, -- 'airbnb', 'vrbo', 'booking_com', 'direct'
  
  -- Dates
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  booking_date DATE NOT NULL, -- when booked
  
  -- Financials
  nightly_rate DECIMAL(10,2) NOT NULL,
  total_nights INTEGER NOT NULL,
  gross_booking_value DECIMAL(10,2) NOT NULL, -- before platform fees
  platform_fee DECIMAL(10,2) DEFAULT 0, -- Airbnb/VRBO commission
  net_revenue DECIMAL(10,2) NOT NULL, -- what you receive
  
  -- Status
  status VARCHAR(20) DEFAULT 'confirmed' 
    CHECK (status IN ('confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show')),
  payment_status VARCHAR(20) DEFAULT 'pending' 
    CHECK (payment_status IN ('pending', 'received', 'disputed', 'refunded')),
  received_date DATE, -- when payout was received
  
  -- Property manager calculations (auto-calculated)
  cleaning_fee DECIMAL(10,2) DEFAULT 0,
  pm_fee_amount DECIMAL(10,2) DEFAULT 0,
  total_pm_deduction DECIMAL(10,2) DEFAULT 0,
  pm_payment_status VARCHAR(20) DEFAULT 'pending' 
    CHECK (pm_payment_status IN ('pending', 'paid')),
  pm_paid_date DATE,
  
  -- Notes
  guest_email VARCHAR(255),
  guest_phone VARCHAR(50),
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE sa_bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own bookings"
  ON sa_bookings FOR SELECT
  USING (auth.uid() = landlord_id);

CREATE POLICY "Users can insert own bookings"
  ON sa_bookings FOR INSERT
  WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "Users can update own bookings"
  ON sa_bookings FOR UPDATE
  USING (auth.uid() = landlord_id)
  WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "Users can delete own bookings"
  ON sa_bookings FOR DELETE
  USING (auth.uid() = landlord_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sa_bookings_property ON sa_bookings(property_id);
CREATE INDEX IF NOT EXISTS idx_sa_bookings_dates ON sa_bookings(check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_sa_bookings_status ON sa_bookings(status);
CREATE INDEX IF NOT EXISTS idx_sa_bookings_payment ON sa_bookings(payment_status);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_sa_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_sa_bookings_timestamp ON sa_bookings;
CREATE TRIGGER update_sa_bookings_timestamp
  BEFORE UPDATE ON sa_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_sa_bookings_updated_at();
