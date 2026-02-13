-- Property CRM Database Schema for Supabase
-- Includes Supabase Auth integration and Row Level Security (RLS)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- LANDLORDS TABLE (linked to Supabase Auth)
-- ============================================
CREATE TABLE landlords (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    company_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS on landlords
ALTER TABLE landlords ENABLE ROW LEVEL SECURITY;

-- Landlords can only see their own record
CREATE POLICY "landlords_select_own" ON landlords
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "landlords_update_own" ON landlords
    FOR UPDATE USING (id = auth.uid());

-- Trigger to create landlord record on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.landlords (id, name, email)
    VALUES (new.id, new.raw_user_meta_data->>'name', new.email);
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- PROPERTIES TABLE
-- ============================================
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    landlord_id UUID NOT NULL REFERENCES landlords(id) ON DELETE CASCADE,
    
    -- Basic Info
    name VARCHAR(255),
    address_line_1 VARCHAR(255) NOT NULL,
    address_line_2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    postcode VARCHAR(20) NOT NULL,
    country VARCHAR(100) DEFAULT 'UK',
    
    -- Property Details
    property_type VARCHAR(50),
    bedrooms INTEGER,
    bathrooms INTEGER,
    receptions INTEGER,
    total_rooms INTEGER,
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
    status VARCHAR(50) DEFAULT 'active',
    
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

-- Enable RLS on properties
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Policies for properties
CREATE POLICY "properties_select_own" ON properties
    FOR SELECT USING (landlord_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "properties_insert_own" ON properties
    FOR INSERT WITH CHECK (landlord_id = auth.uid());

CREATE POLICY "properties_update_own" ON properties
    FOR UPDATE USING (landlord_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "properties_delete_own" ON properties
    FOR DELETE USING (landlord_id = auth.uid());

-- ============================================
-- TENANTS TABLE
-- ============================================
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    landlord_id UUID NOT NULL REFERENCES landlords(id) ON DELETE CASCADE,
    
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
    employment_status VARCHAR(50),
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

-- Enable RLS on tenants
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Policies for tenants
CREATE POLICY "tenants_select_own" ON tenants
    FOR SELECT USING (landlord_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "tenants_insert_own" ON tenants
    FOR INSERT WITH CHECK (landlord_id = auth.uid());

CREATE POLICY "tenants_update_own" ON tenants
    FOR UPDATE USING (landlord_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "tenants_delete_own" ON tenants
    FOR DELETE USING (landlord_id = auth.uid());

-- ============================================
-- TENANCIES TABLE
-- ============================================
CREATE TABLE tenancies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    landlord_id UUID NOT NULL REFERENCES landlords(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    
    -- Tenancy Details
    tenancy_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    
    -- Dates
    start_date DATE NOT NULL,
    end_date DATE,
    is_periodic BOOLEAN DEFAULT FALSE,
    
    -- Financial
    rent_amount DECIMAL(10,2) NOT NULL,
    rent_frequency VARCHAR(20) DEFAULT 'monthly',
    rent_due_day INTEGER DEFAULT 1,
    
    -- Deposit
    deposit_amount DECIMAL(10,2),
    deposit_scheme VARCHAR(100),
    deposit_reference VARCHAR(100),
    deposit_protected_date DATE,
    
    -- Notices
    break_clause_date DATE,
    notice_given_date DATE,
    notice_expiry_date DATE,
    
    -- Documents
    tenancy_agreement_url TEXT,
    
    -- Room assignment
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

-- Enable RLS on tenancies
ALTER TABLE tenancies ENABLE ROW LEVEL SECURITY;

-- Policies for tenancies
CREATE POLICY "tenancies_select_own" ON tenancies
    FOR SELECT USING (
        landlord_id = auth.uid() AND deleted_at IS NULL
    );

CREATE POLICY "tenancies_insert_own" ON tenancies
    FOR INSERT WITH CHECK (
        landlord_id = auth.uid()
    );

CREATE POLICY "tenancies_update_own" ON tenancies
    FOR UPDATE USING (
        landlord_id = auth.uid() AND deleted_at IS NULL
    );

CREATE POLICY "tenancies_delete_own" ON tenancies
    FOR DELETE USING (landlord_id = auth.uid());

-- ============================================
-- TENANCY-TENANTS JUNCTION TABLE
-- ============================================
CREATE TABLE tenancy_tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenancy_id UUID REFERENCES tenancies(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenancy_id, tenant_id)
);

-- Enable RLS on tenancy_tenants
ALTER TABLE tenancy_tenants ENABLE ROW LEVEL SECURITY;

-- Create a function to check tenancy ownership
CREATE OR REPLACE FUNCTION tenancy_belongs_to_user(tenancy_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM tenancies 
        WHERE id = tenancy_uuid AND landlord_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql;

CREATE POLICY "tenancy_tenants_select_own" ON tenancy_tenants
    FOR SELECT USING (
        tenancy_belongs_to_user(tenancy_id, auth.uid())
    );

CREATE POLICY "tenancy_tenants_insert_own" ON tenancy_tenants
    FOR INSERT WITH CHECK (
        tenancy_belongs_to_user(tenancy_id, auth.uid())
    );

CREATE POLICY "tenancy_tenants_delete_own" ON tenancy_tenants
    FOR DELETE USING (
        tenancy_belongs_to_user(tenancy_id, auth.uid())
    );

-- ============================================
-- RENT PAYMENTS TABLE
-- ============================================
CREATE TABLE rent_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    landlord_id UUID NOT NULL REFERENCES landlords(id) ON DELETE CASCADE,
    tenancy_id UUID REFERENCES tenancies(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    
    -- Payment Details
    due_date DATE NOT NULL,
    amount_due DECIMAL(10,2) NOT NULL,
    
    paid_date DATE,
    amount_paid DECIMAL(10,2),
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending',
    
    -- Payment Method
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    
    -- Notes
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS on rent_payments
ALTER TABLE rent_payments ENABLE ROW LEVEL SECURITY;

-- Create a function to check property ownership
CREATE OR REPLACE FUNCTION property_belongs_to_user(property_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM properties 
        WHERE id = property_uuid AND landlord_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql;

CREATE POLICY "rent_payments_select_own" ON rent_payments
    FOR SELECT USING (
        landlord_id = auth.uid() OR property_belongs_to_user(property_id, auth.uid())
    );

CREATE POLICY "rent_payments_insert_own" ON rent_payments
    FOR INSERT WITH CHECK (
        landlord_id = auth.uid() AND property_belongs_to_user(property_id, auth.uid())
    );

CREATE POLICY "rent_payments_update_own" ON rent_payments
    FOR UPDATE USING (
        landlord_id = auth.uid() OR property_belongs_to_user(property_id, auth.uid())
    );

CREATE POLICY "rent_payments_delete_own" ON rent_payments
    FOR DELETE USING (
        landlord_id = auth.uid() OR property_belongs_to_user(property_id, auth.uid())
    );

-- ============================================
-- COMPLIANCE CERTIFICATES TABLE
-- ============================================
CREATE TABLE compliance_certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    landlord_id UUID NOT NULL REFERENCES landlords(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    
    certificate_type VARCHAR(50) NOT NULL,
    certificate_number VARCHAR(100),
    
    provider_name VARCHAR(255),
    provider_phone VARCHAR(50),
    provider_email VARCHAR(255),
    
    issue_date DATE,
    expiry_date DATE NOT NULL,
    
    document_url TEXT,
    
    alert_60_sent BOOLEAN DEFAULT FALSE,
    alert_30_sent BOOLEAN DEFAULT FALSE,
    alert_7_sent BOOLEAN DEFAULT FALSE,
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS on compliance_certificates
ALTER TABLE compliance_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "compliance_select_own" ON compliance_certificates
    FOR SELECT USING (
        landlord_id = auth.uid() OR property_belongs_to_user(property_id, auth.uid())
    );

CREATE POLICY "compliance_insert_own" ON compliance_certificates
    FOR INSERT WITH CHECK (
        landlord_id = auth.uid() AND property_belongs_to_user(property_id, auth.uid())
    );

CREATE POLICY "compliance_update_own" ON compliance_certificates
    FOR UPDATE USING (
        landlord_id = auth.uid() OR property_belongs_to_user(property_id, auth.uid())
    );

CREATE POLICY "compliance_delete_own" ON compliance_certificates
    FOR DELETE USING (
        landlord_id = auth.uid() OR property_belongs_to_user(property_id, auth.uid())
    );

-- ============================================
-- REMINDERS/TASKS TABLE
-- ============================================
CREATE TABLE reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    landlord_id UUID NOT NULL REFERENCES landlords(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    tenancy_id UUID REFERENCES tenancies(id) ON DELETE SET NULL,
    certificate_id UUID REFERENCES compliance_certificates(id) ON DELETE SET NULL,
    
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    due_date DATE,
    due_time TIME,
    completed_at TIMESTAMP,
    
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'medium',
    category VARCHAR(50),
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS on reminders
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reminders_select_own" ON reminders
    FOR SELECT USING (landlord_id = auth.uid());

CREATE POLICY "reminders_insert_own" ON reminders
    FOR INSERT WITH CHECK (landlord_id = auth.uid());

CREATE POLICY "reminders_update_own" ON reminders
    FOR UPDATE USING (landlord_id = auth.uid());

CREATE POLICY "reminders_delete_own" ON reminders
    FOR DELETE USING (landlord_id = auth.uid());

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_landlords_email ON landlords(email);

CREATE INDEX idx_properties_landlord ON properties(landlord_id);
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_postcode ON properties(postcode);
CREATE INDEX idx_properties_deleted_at ON properties(deleted_at);

CREATE INDEX idx_tenants_landlord ON tenants(landlord_id);
CREATE INDEX idx_tenants_name ON tenants(last_name, first_name);
CREATE INDEX idx_tenants_deleted_at ON tenants(deleted_at);

CREATE INDEX idx_tenancies_landlord ON tenancies(landlord_id);
CREATE INDEX idx_tenancies_property ON tenancies(property_id);
CREATE INDEX idx_tenancies_status ON tenancies(status);
CREATE INDEX idx_tenancies_deleted_at ON tenancies(deleted_at);

CREATE INDEX idx_tenancy_tenants_tenancy ON tenancy_tenants(tenancy_id);
CREATE INDEX idx_tenancy_tenants_tenant ON tenancy_tenants(tenant_id);

CREATE INDEX idx_rent_payments_landlord ON rent_payments(landlord_id);
CREATE INDEX idx_rent_payments_tenancy ON rent_payments(tenancy_id);
CREATE INDEX idx_rent_payments_due_date ON rent_payments(due_date);
CREATE INDEX idx_rent_payments_status ON rent_payments(status);

CREATE INDEX idx_compliance_landlord ON compliance_certificates(landlord_id);
CREATE INDEX idx_compliance_property ON compliance_certificates(property_id);
CREATE INDEX idx_compliance_expiry ON compliance_certificates(expiry_date);

CREATE INDEX idx_reminders_landlord ON reminders(landlord_id);
CREATE INDEX idx_reminders_due ON reminders(due_date);
CREATE INDEX idx_reminders_status ON reminders(status);

-- ============================================
-- UPDATE TRIGGERS
-- ============================================
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

CREATE TRIGGER update_reminders_updated_at BEFORE UPDATE ON reminders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
