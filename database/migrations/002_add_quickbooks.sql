-- Migration: Add QuickBooks token storage
-- Created: 2026-02-15

-- Create table for QuickBooks OAuth tokens
CREATE TABLE IF NOT EXISTS quickbooks_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  realm_id VARCHAR(255) NOT NULL, -- QuickBooks Company ID
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  company_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(landlord_id)
);

-- Enable RLS
ALTER TABLE quickbooks_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own tokens
CREATE POLICY "Users can view own QB tokens"
  ON quickbooks_tokens
  FOR SELECT
  USING (auth.uid() = landlord_id);

-- RLS Policy: Users can only insert/update their own tokens
CREATE POLICY "Users can manage own QB tokens"
  ON quickbooks_tokens
  FOR ALL
  USING (auth.uid() = landlord_id)
  WITH CHECK (auth.uid() = landlord_id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_qb_tokens_landlord_id ON quickbooks_tokens(landlord_id);
CREATE INDEX IF NOT EXISTS idx_qb_tokens_realm_id ON quickbooks_tokens(realm_id);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_qb_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_qb_tokens_timestamp ON quickbooks_tokens;
CREATE TRIGGER update_qb_tokens_timestamp
  BEFORE UPDATE ON quickbooks_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_qb_tokens_updated_at();
