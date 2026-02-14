-- Generate rent payment records for existing active tenancies
-- This will create monthly payment records for the current month

-- Insert rent payments for current month
INSERT INTO rent_payments (
    landlord_id,
    tenancy_id,
    property_id,
    due_date,
    amount_due,
    status,
    created_at
)
SELECT 
    t.landlord_id,
    t.id as tenancy_id,
    t.property_id,
    -- Calculate due date based on rent_due_day (default to 1st if not set)
    CASE 
        WHEN t.rent_due_day IS NOT NULL AND t.rent_due_day BETWEEN 1 AND 31
        THEN DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 day' * (t.rent_due_day - 1)
        ELSE DATE_TRUNC('month', CURRENT_DATE)
    END as due_date,
    t.rent_amount as amount_due,
    'pending' as status,
    NOW() as created_at
FROM tenancies t
WHERE t.status = 'active'
AND t.deleted_at IS NULL
-- Don't duplicate if already exists for this month
AND NOT EXISTS (
    SELECT 1 FROM rent_payments rp
    WHERE rp.tenancy_id = t.id
    AND rp.due_date >= DATE_TRUNC('month', CURRENT_DATE)
    AND rp.due_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
);

-- Show summary
SELECT 
    'Active tenancies' as metric,
    COUNT(*) as count
FROM tenancies 
WHERE status = 'active' AND deleted_at IS NULL

UNION ALL

SELECT 
    'Rent payments this month' as metric,
    COUNT(*) as count
FROM rent_payments 
WHERE due_date >= DATE_TRUNC('month', CURRENT_DATE)
AND due_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month';
