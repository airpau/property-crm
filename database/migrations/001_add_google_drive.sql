-- Google Drive Integration Migration
-- Run this to add Google Drive tables to existing Property CRM database
-- Date: 2026-02-15

-- ============================================
-- STEP 1: Create property_drive_folders table
-- ============================================
CREATE TABLE IF NOT EXISTS property_drive_folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    folder_id VARCHAR(255) NOT NULL,
    folder_name VARCHAR(255) NOT NULL,
    folder_path TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_drive_folders_property ON property_drive_folders(property_id);
CREATE INDEX IF NOT EXISTS idx_property_drive_folders_folder ON property_drive_folders(folder_id);

ALTER TABLE property_drive_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "property_drive_folders_select" ON property_drive_folders
    FOR SELECT USING (
        property_id IN (
            SELECT id FROM properties WHERE landlord_id = auth.uid()
        )
    );

CREATE POLICY "property_drive_folders_insert" ON property_drive_folders
    FOR INSERT WITH CHECK (
        property_id IN (
            SELECT id FROM properties WHERE landlord_id = auth.uid()
        )
    );

CREATE POLICY "property_drive_folders_update" ON property_drive_folders
    FOR UPDATE USING (
        property_id IN (
            SELECT id FROM properties WHERE landlord_id = auth.uid()
        )
    );

CREATE POLICY "property_drive_folders_delete" ON property_drive_folders
    FOR DELETE USING (
        property_id IN (
            SELECT id FROM properties WHERE landlord_id = auth.uid()
        )
    );

-- ============================================
-- STEP 2: Create property_documents table
-- ============================================
CREATE TABLE IF NOT EXISTS property_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    tenancy_id UUID REFERENCES tenancies(id) ON DELETE SET NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    drive_file_id VARCHAR(255) NOT NULL,
    drive_file_name VARCHAR(255) NOT NULL,
    drive_file_url TEXT,
    drive_folder_id VARCHAR(255),
    file_type VARCHAR(100),
    file_size BIGINT,
    upload_date TIMESTAMP,
    description TEXT,
    category VARCHAR(100),
    uploaded_by UUID REFERENCES landlords(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_documents_property ON property_documents(property_id);
CREATE INDEX IF NOT EXISTS idx_property_documents_tenancy ON property_documents(tenancy_id);
CREATE INDEX IF NOT EXISTS idx_property_documents_tenant ON property_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_property_documents_category ON property_documents(category);
CREATE INDEX IF NOT EXISTS idx_property_documents_uploaded ON property_documents(upload_date);

ALTER TABLE property_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "property_documents_select" ON property_documents
    FOR SELECT USING (
        property_id IN (
            SELECT id FROM properties WHERE landlord_id = auth.uid()
        )
    );

CREATE POLICY "property_documents_insert" ON property_documents
    FOR INSERT WITH CHECK (
        property_id IN (
            SELECT id FROM properties WHERE landlord_id = auth.uid()
        )
    );

CREATE POLICY "property_documents_update" ON property_documents
    FOR UPDATE USING (
        property_id IN (
            SELECT id FROM properties WHERE landlord_id = auth.uid()
        )
    );

CREATE POLICY "property_documents_delete" ON property_documents
    FOR DELETE USING (
        property_id IN (
            SELECT id FROM properties WHERE landlord_id = auth.uid()
        )
    );

-- ============================================
-- STEP 3: Create google_drive_tokens table
-- ============================================
CREATE TABLE IF NOT EXISTS google_drive_tokens (
    landlord_id UUID PRIMARY KEY REFERENCES landlords(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expires_at TIMESTAMP NOT NULL,
    drive_email VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE google_drive_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "drive_tokens_select_own" ON google_drive_tokens
    FOR SELECT USING (landlord_id = auth.uid());

CREATE POLICY "drive_tokens_insert_own" ON google_drive_tokens
    FOR INSERT WITH CHECK (landlord_id = auth.uid());

CREATE POLICY "drive_tokens_update_own" ON google_drive_tokens
    FOR UPDATE USING (landlord_id = auth.uid());

CREATE POLICY "drive_tokens_delete_own" ON google_drive_tokens
    FOR DELETE USING (landlord_id = auth.uid());

-- ============================================
-- STEP 4: Add update triggers
-- ============================================
CREATE TRIGGER IF NOT EXISTS update_property_drive_folders_updated_at 
    BEFORE UPDATE ON property_drive_folders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_property_documents_updated_at 
    BEFORE UPDATE ON property_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_google_drive_tokens_updated_at 
    BEFORE UPDATE ON google_drive_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
SELECT 'Google Drive migration complete' AS status;
