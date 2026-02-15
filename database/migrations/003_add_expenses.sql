-- Migration: Add expense tracking for properties
-- Created: 2026-02-15

-- Create table for property expenses
CREATE TABLE IF NOT EXISTS property_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL, -- 'mortgage', 'council_tax', 'utilities', 'insurance', 'repairs', 'maintenance', 'other'
  description TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  frequency VARCHAR(20) DEFAULT 'one-off', -- 'one-off', 'monthly', 'quarterly', 'yearly'
  expense_date DATE NOT NULL,
  receipt_url TEXT, -- optional link to receipt/document
  is_tax_deductible BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE property_expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own expenses
CREATE POLICY "Users can view own expenses"
  ON property_expenses
  FOR SELECT
  USING (auth.uid() = landlord_id);

-- RLS Policy: Users can only insert their own expenses
CREATE POLICY "Users can insert own expenses"
  ON property_expenses
  FOR INSERT
  WITH CHECK (auth.uid() = landlord_id);

-- RLS Policy: Users can only update their own expenses
CREATE POLICY "Users can update own expenses"
  ON property_expenses
  FOR UPDATE
  USING (auth.uid() = landlord_id)
  WITH CHECK (auth.uid() = landlord_id);

-- RLS Policy: Users can only delete their own expenses
CREATE POLICY "Users can delete own expenses"
  ON property_expenses
  FOR DELETE
  USING (auth.uid() = landlord_id);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_expenses_property_id ON property_expenses(property_id);
CREATE INDEX IF NOT EXISTS idx_expenses_landlord_id ON property_expenses(landlord_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON property_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON property_expenses(category);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_expenses_timestamp ON property_expenses;
CREATE TRIGGER update_expenses_timestamp
  BEFORE UPDATE ON property_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_expenses_updated_at();
