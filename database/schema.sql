-- Property CRM Database Schema
-- PostgreSQL - Production Ready

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Landlords/Organizations table (for multi-tenancy)
CREATE TABLE landlords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    company_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Properties table
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    landlord_id UUID REFERENCES landlords(id),
    
    -- Basic Info
    name VARCHAR(255),
    address_line_1 VARCHAR(255) NOT NULL,
    address_line_2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    postcode VARCHAR(20) NOT NULL,
    country VARCHAR(100) DEFAULT 'UK',
    
    -- Property Details
    property_type VARCHAR(50), -- house, flat, hmo, commercial
    bedrooms INTEGER,
    bathrooms INTEGER,
    receptions INTEGER,
    total_rooms INTEGER, -- for HMOs
    square_footage DECIMAL(10,2),
    
    -- Financial
    purchase_price DECIMAL(12,2),
    purchase_date DATE,
    current_value DECIMAL(12,2),
    mortgage_lender VARCHAR(255),
    mortgage_reference VARCHAR(100),
    monthly_mortgage DECIMAL(10,2),
    interest_rate DECIMAL(5,2),
    
    -- Status
    status VARCHAR(50) DEFAULT 'active', -- active, void, maintenance, sold
    
    -- HMO Specific
    is_hmo BOOLEAN DEFAULT FALSE,
    hmo_license_number VARCHAR(100),
    hmo_license_expiry DATE,
    max_occupants INTEGER,
    
    -- Compliance
    epc_rating VARCHAR(10),
    epc_expiry DATE,
    council_tax_band VARCHAR(10),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- Tenants table
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    landlord_id UUID REFERENCES landlords(id),
    
    -- Personal Info
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    phone_secondary VARCHAR(50),
    date_of_birth DATE,
    
    -- Emergency Contact
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(50),
    emergency_contact_relationship VARCHAR(50),
    
    -- Employment
    employment_status VARCHAR(50), -- employed, self-employed, student, retired
    employer_name VARCHAR(255),
    employer_phone VARCHAR(50),
    annual_income DECIMAL(10,2),
    
    -- References
    previous_landlord_name VARCHAR(255),
    previous_landlord_phone VARCHAR(50),
    
    -- Documents
    right_to_rent_status VARCHAR(50),
    right_to_rent_expiry DATE,
    id_document_type VARCHAR(50),
    id_document_reference VARCHAR(100),
    
    -- Notes
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- Tenancies table
CREATE TABLE tenancies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    landlord_id UUID REFERENCES landlords(id),
    property_id UUID REFERENCES properties(id),
    
    -- Tenancy Details
    tenancy_type VARCHAR(50) NOT NULL, -- AST, periodic, company, room_only, license
    status VARCHAR(50) DEFAULT 'active', -- active, ended, notice_given
    
    -- Dates
    start_date DATE NOT NULL,
    end_date DATE,
    is_periodic BOOLEAN DEFAULT FALSE,
    
    -- Financial
    rent_amount DECIMAL(10,2) NOT NULL,
    rent_frequency VARCHAR(20) DEFAULT 'monthly', -- monthly, weekly, quarterly
    rent_due_day INTEGER DEFAULT 1, -- day of month rent is due
    
    -- Deposit
    deposit_amount DECIMAL(10,2),
    deposit_scheme VARCHAR(100), -- DPS, MyDeposits, TDS
    deposit_reference VARCHAR(100),
    deposit_protected_date DATE,
    
    -- Notices
    break_clause_date DATE,
    notice_given_date DATE,
    notice_expiry_date DATE,
    
    -- Documents
    tenancy_agreement_url TEXT,
    
    -- Room assignment (for HMOs)
    room_number VARCHAR(50),
    room_description TEXT,
    
    -- Notes
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Tenancy-Tenant junction (for multiple tenants per tenancy)
CREATE TABLE tenancy_tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenancy_id UUID REFERENCES tenancies(id),
    tenant_id UUID REFERENCES tenants(id),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenancy_id, tenant_id)
);

-- Rent Payments table
CREATE TABLE rent_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    landlord_id UUID REFERENCES landlords(id),
    tenancy_id UUID REFERENCES tenancies(id),
    property_id UUID REFERENCES properties(id),
    
    -- Payment Details
    due_date DATE NOT NULL,
    amount_due DECIMAL(10,2) NOT NULL,
    
    paid_date DATE,
    amount_paid DECIMAL(10,2),
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, paid, partial, late, missed
    
    -- Payment Method
    payment_method VARCHAR(50), -- standing_order, bank_transfer, cash, card
    payment_reference VARCHAR(100),
    
    -- Notes
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Compliance Certificates table
CREATE TABLE compliance_certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    landlord_id UUID REFERENCES landlords(id),
    property_id UUID REFERENCES properties(id),
    
    -- Certificate Details
    certificate_type VARCHAR(50) NOT NULL, -- gas_safety, eicr, epc, pat, fire_risk, legionella
    certificate_number VARCHAR(100),
    
    -- Provider
    provider_name VARCHAR(255),
    provider_phone VARCHAR(50),
    provider_email VARCHAR(255),
    
    -- Dates
    issue_date DATE,
    expiry_date DATE NOT NULL,
    
    -- Document
    document_url TEXT,
    
    -- Alert tracking
    alert_60_sent BOOLEAN DEFAULT FALSE,
    alert_30_sent BOOLEAN DEFAULT FALSE,
    alert_7_sent BOOLEAN DEFAULT FALSE,
    
    -- Notes
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Expenses table
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    landlord_id UUID REFERENCES landlords(id),
    property_id UUID REFERENCES properties(id),
    tenancy_id UUID REFERENCES tenancies(id),
    
    -- Expense Details
    expense_type VARCHAR(50) NOT NULL, -- maintenance, repair, insurance, service_charge, legal
    description TEXT NOT NULL,
    
    -- Financial
    amount DECIMAL(10,2) NOT NULL,
    vat_amount DECIMAL(10,2),
    total_amount DECIMAL(10,2),
    
    -- Dates
    expense_date DATE NOT NULL,
    
    -- Supplier
    supplier_name VARCHAR(255),
    supplier_phone VARCHAR(50),
    
    -- Receipt
    receipt_url TEXT,
    
    -- Notes
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Maintenance Issues table
CREATE TABLE maintenance_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    landlord_id UUID REFERENCES landlords(id),
    property_id UUID REFERENCES properties(id),
    tenancy_id UUID REFERENCES tenancies(id),
    
    -- Issue Details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, emergency
    
    -- Status
    status VARCHAR(50) DEFAULT 'reported', -- reported, in_progress, completed, cancelled
    
    -- Reporting
    reported_by VARCHAR(100), -- tenant_name or "landlord"
    reported_date TIMESTAMP DEFAULT NOW(),
    
    -- Assignment
    assigned_contractor VARCHAR(255),
    contractor_phone VARCHAR(50),
    
    -- Financial
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    
    -- Dates
    completed_date DATE,
    
    -- Photos
    photos_before TEXT[], -- array of URLs
    photos_after TEXT[],
    
    -- Notes
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Reminders/Tasks table
CREATE TABLE reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    landlord_id UUID REFERENCES landlords(id),
    property_id UUID REFERENCES properties(id),
    tenancy_id UUID REFERENCES tenancies(id),
    certificate_id UUID REFERENCES compliance_certificates(id),
    
    -- Task Details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Dates
    due_date DATE,
    due_time TIME,
    completed_at TIMESTAMP,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, completed, cancelled
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high
    
    -- Category
    category VARCHAR(50), -- compliance, tenancy, maintenance, financial
    
    -- Notes
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Communication Log table
CREATE TABLE communications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    landlord_id UUID REFERENCES landlords(id),
    property_id UUID REFERENCES properties(id),
    tenancy_id UUID REFERENCES tenancies(id),
    tenant_id UUID REFERENCES tenants(id),
    
    -- Communication Details
    direction VARCHAR(20), -- incoming, outgoing
    method VARCHAR(50), -- email, sms, phone, telegram, in_person
    
    -- Content
    subject VARCHAR(255),
    content TEXT,
    
    -- Participants
    from_address VARCHAR(255),
    to_address VARCHAR(255),
    
    -- Dates
    sent_at TIMESTAMP,
    received_at TIMESTAMP,
    
    -- Attachments
    attachments TEXT[], -- array of URLs
    
    -- Notes
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_properties_landlord ON properties(landlord_id);
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_postcode ON properties(postcode);

CREATE INDEX idx_tenants_landlord ON tenants(landlord_id);
CREATE INDEX idx_tenants_name ON tenants(last_name, first_name);

CREATE INDEX idx_tenancies_property ON tenancies(property_id);
CREATE INDEX idx_tenancies_status ON tenancies(status);
CREATE INDEX idx_tenancies_dates ON tenancies(start_date, end_date);

CREATE INDEX idx_rent_payments_tenancy ON rent_payments(tenancy_id);
CREATE INDEX idx_rent_payments_due_date ON rent_payments(due_date);
CREATE INDEX idx_rent_payments_status ON rent_payments(status);

CREATE INDEX idx_compliance_property ON compliance_certificates(property_id);
CREATE INDEX idx_compliance_expiry ON compliance_certificates(expiry_date);
CREATE INDEX idx_compliance_type ON compliance_certificates(certificate_type);

CREATE INDEX idx_expenses_property ON expenses(property_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);

CREATE INDEX idx_maintenance_property ON maintenance_issues(property_id);
CREATE INDEX idx_maintenance_status ON maintenance_issues(status);

CREATE INDEX idx_reminders_landlord ON reminders(landlord_id);
CREATE INDEX idx_reminders_due ON reminders(due_date);
CREATE INDEX idx_reminders_status ON reminders(status);

-- Update triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_landlords_updated_at BEFORE UPDATE ON landlords
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenancies_updated_at BEFORE UPDATE ON tenancies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rent_payments_updated_at BEFORE UPDATE ON rent_payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_certificates_updated_at BEFORE UPDATE ON compliance_certificates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_issues_updated_at BEFORE UPDATE ON maintenance_issues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminders_updated_at BEFORE UPDATE ON reminders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
