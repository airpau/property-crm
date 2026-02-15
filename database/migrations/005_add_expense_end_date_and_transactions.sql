-- Migration: Add end_date to expenses and create monthly transactions log
-- Created: 2026-02-15

-- Add end_date column for recurring expenses
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'property_expenses' AND column_name = 'end_date') THEN
    ALTER TABLE property_expenses ADD COLUMN end_date DATE;
  END IF;
END $$;

-- Create table for monthly expense transactions (for reporting)
CREATE TABLE IF NOT EXISTS expense_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID NOT NULL REFERENCES property_expenses(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Transaction details
  transaction_date DATE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  
  -- Reference to original expense
  category VARCHAR(50) NOT NULL,
  original_expense_date DATE NOT NULL,
  
  -- Status
  is_paid BOOLEAN DEFAULT false,
  paid_date DATE,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE expense_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own transactions"
  ON expense_transactions FOR SELECT
  USING (auth.uid() = landlord_id);

CREATE POLICY "Users can insert own transactions"
  ON expense_transactions FOR INSERT
  WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "Users can update own transactions"
  ON expense_transactions FOR UPDATE
  USING (auth.uid() = landlord_id)
  WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "Users can delete own transactions"
  ON expense_transactions FOR DELETE
  USING (auth.uid() = landlord_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_expense_id ON expense_transactions(expense_id);
CREATE INDEX IF NOT EXISTS idx_transactions_property ON expense_transactions(property_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON expense_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_landlord ON expense_transactions(landlord_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_transactions_timestamp ON expense_transactions;
CREATE TRIGGER update_transactions_timestamp
  BEFORE UPDATE ON expense_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_transactions_updated_at();

-- Function to generate monthly transactions for recurring expenses
CREATE OR REPLACE FUNCTION generate_monthly_transactions()
RETURNS void AS $$
DECLARE
  expense_record RECORD;
  current_month DATE;
  month_start DATE;
  month_end DATE;
BEGIN
  current_month := DATE_TRUNC('month', CURRENT_DATE);
  month_start := current_month;
  month_end := (current_month + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  
  -- For each recurring expense that's still active
  FOR expense_record IN
    SELECT * FROM property_expenses
    WHERE frequency IN ('monthly', 'quarterly')
      AND (end_date IS NULL OR end_date >= month_start)
      AND expense_date <= month_end
  LOOP
    -- Check if transaction already exists for this month
    IF NOT EXISTS (
      SELECT 1 FROM expense_transactions
      WHERE expense_id = expense_record.id
        AND transaction_date >= month_start
        AND transaction_date <= month_end
    ) THEN
      -- Insert new transaction
      INSERT INTO expense_transactions (
        expense_id, property_id, landlord_id, transaction_date, amount,
        description, category, original_expense_date
      ) VALUES (
        expense_record.id,
        expense_record.property_id,
        expense_record.landlord_id,
        month_start,
        expense_record.amount,
        expense_record.description,
        expense_record.category,
        expense_record.expense_date
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
