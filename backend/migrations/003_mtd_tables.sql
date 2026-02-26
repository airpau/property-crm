-- ============================================================
-- MTD (Making Tax Digital) Tables
-- Run against Supabase/PostgreSQL
-- ============================================================

-- Waitlist for MTD landing page signups
CREATE TABLE IF NOT EXISTS mtd_waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  property_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  contacted BOOLEAN DEFAULT FALSE,
  notes TEXT
);

-- HMRC-approved income and expense categories
CREATE TABLE IF NOT EXISTS mtd_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  name TEXT NOT NULL,
  hmrc_code TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quarterly periods per landlord per tax year
CREATE TABLE IF NOT EXISTS mtd_quarters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id UUID NOT NULL,
  tax_year TEXT NOT NULL, -- e.g. '2026-27'
  quarter_number INTEGER NOT NULL CHECK (quarter_number BETWEEN 1 AND 4),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  submission_deadline DATE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'submitted', 'overdue')),
  submitted_at TIMESTAMPTZ,
  hmrc_submission_id TEXT, -- future: HMRC API reference
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (landlord_id, tax_year, quarter_number)
);

-- Individual income/expense transactions mapped to HMRC categories
CREATE TABLE IF NOT EXISTS mtd_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id UUID NOT NULL,
  quarter_id UUID NOT NULL REFERENCES mtd_quarters(id) ON DELETE CASCADE,
  property_id UUID NOT NULL,
  category_id UUID REFERENCES mtd_categories(id),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC(12, 2) NOT NULL,
  description TEXT,
  transaction_date DATE NOT NULL,
  source TEXT DEFAULT 'manual', -- manual, rent_payment, sa_booking, expense, bank_import
  source_id TEXT, -- reference to original record
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mtd_quarters_landlord ON mtd_quarters(landlord_id, tax_year);
CREATE INDEX IF NOT EXISTS idx_mtd_transactions_quarter ON mtd_transactions(quarter_id);
CREATE INDEX IF NOT EXISTS idx_mtd_transactions_landlord ON mtd_transactions(landlord_id);
CREATE INDEX IF NOT EXISTS idx_mtd_transactions_source ON mtd_transactions(source, source_id);
CREATE INDEX IF NOT EXISTS idx_mtd_waitlist_email ON mtd_waitlist(email);

-- ============================================================
-- Seed HMRC Categories
-- Based on SA105 (UK Property) supplementary pages
-- ============================================================

INSERT INTO mtd_categories (type, name, hmrc_code, description, sort_order) VALUES
  -- Income categories
  ('income', 'Rental Income', 'RENT', 'Rent from tenants (BTL, HMO)', 1),
  ('income', 'SA/Holiday Let Income', 'SA_INCOME', 'Serviced accommodation & holiday let income', 2),
  ('income', 'Other Property Income', 'OTHER_INCOME', 'Other income (e.g. parking, storage)', 3),
  ('income', 'Premiums for Granting a Lease', 'LEASE_PREMIUM', 'Premiums received for granting a lease', 4),
  ('income', 'Reverse Premiums', 'REVERSE_PREMIUM', 'Reverse premiums and inducements', 5),
  
  -- Expense categories (per SA105)
  ('expense', 'Rent, Rates & Insurance', 'INSURANCE', 'Buildings/contents insurance, council tax when empty', 10),
  ('expense', 'Property Repairs & Maintenance', 'REPAIRS', 'Repairs, maintenance, renewals (not improvements)', 11),
  ('expense', 'Finance Costs', 'FINANCE_COSTS', 'Mortgage interest (restricted to 20% tax credit)', 12),
  ('expense', 'Legal & Professional Fees', 'LEGAL_FEES', 'Solicitors, surveyors, accountants for letting', 13),
  ('expense', 'Professional/Management Fees', 'PROFESSIONAL_FEES', 'Letting agent fees, property management', 14),
  ('expense', 'Cost of Services', 'SERVICES', 'Cleaning, gardening, utility costs you pay', 15),
  ('expense', 'Rents/Ground Rent', 'RENTS_GROUND_RENT', 'Lease payments, ground rent', 16),
  ('expense', 'Replacing Domestic Items', 'REPLACING_FURNISHINGS', 'Replacing furnishings, appliances, kitchenware', 17),
  ('expense', 'Council Tax / Business Rates', 'RATES', 'Council tax or business rates payable', 18),
  ('expense', 'Travel Expenses', 'TRAVEL', 'Travel to inspect/manage properties', 19),
  ('expense', 'Other Allowable Expenses', 'OTHER_EXPENSE', 'Other allowable property expenses', 20)
ON CONFLICT (hmrc_code) DO NOTHING;

-- Enable RLS
ALTER TABLE mtd_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE mtd_quarters ENABLE ROW LEVEL SECURITY;
ALTER TABLE mtd_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Waitlist: anyone can insert, only service role can read
CREATE POLICY "Anyone can join waitlist" ON mtd_waitlist FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role reads waitlist" ON mtd_waitlist FOR SELECT USING (auth.role() = 'service_role');

-- Quarters: landlords see their own
CREATE POLICY "Landlords manage own quarters" ON mtd_quarters FOR ALL USING (landlord_id = auth.uid());

-- Transactions: landlords see their own
CREATE POLICY "Landlords manage own transactions" ON mtd_transactions FOR ALL USING (landlord_id = auth.uid());

-- Categories: everyone can read
ALTER TABLE mtd_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read categories" ON mtd_categories FOR SELECT USING (true);
