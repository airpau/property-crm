# Property Angel CRM - Tenant/Room Changes (March 8, 2026)

## Changes Required at Woodstock

### 1. Move Out: Gav Mytton
**Action:** Mark tenancy as ended
- End Date: March 1, 2026 (or Feb 28)
- Status: inactive/ended

### 2. Room Change: Jude Dibia
**Current:** Room 5, £750/month
**New:** Room 1, £800/month
**Date:** March 1, 2026
**Action:** 
- End current tenancy (Room 5)
- Create new tenancy (Room 1) starting March 1

### 3. Move In: Rikki Newnham
**Room:** Room 5
**Rent:** £750/month
**Start Date:** March 2, 2026

### 4. Move In: Jack Harris
**Room:** Room 4 (Piotr vacated in February)
**Rent:** £650/month
**Start Date:** March 22, 2026

---

## SQL to Execute in Supabase SQL Editor

Copy and run these commands in order:

```sql
-- Step 1: End Gav Mytton's tenancy
UPDATE tenancies 
SET status = 'ended', 
    end_date = '2026-02-28',
    updated_at = NOW()
WHERE landlord_id = '[YOUR_LANDLORD_ID]' 
  AND status = 'active'
  AND room_number = 'Room 5'
  AND id IN (
    SELECT t.tenancy_id FROM tenancy_tenants t
    JOIN tenants tn ON t.tenant_id = tn.id
    WHERE tn.first_name = 'Gav' AND tn.last_name = 'Mytton'
  );

-- Step 2: Update Jude Dibia's tenancy (end Room 5, start Room 1)
-- First, end Room 5 tenancy
UPDATE tenancies 
SET status = 'ended', 
    end_date = '2026-02-28',
    updated_at = NOW()
WHERE landlord_id = '[YOUR_LANDLORD_ID]' 
  AND status = 'active'
  AND room_number = 'Room 5'
  AND id IN (
    SELECT t.tenancy_id FROM tenancy_tenants t
    JOIN tenants tn ON t.tenant_id = tn.id
    WHERE tn.first_name = 'Jude' AND tn.last_name = 'Dibia'
  );

-- Step 3: Insert Rikki Newnham
-- First insert tenant
INSERT INTO tenants (landlord_id, first_name, last_name, created_at, updated_at)
VALUES ('[YOUR_LANDLORD_ID]', 'Rikki', 'Newnham', NOW(), NOW())
RETURNING id;

-- Then create tenancy (use the returned tenant_id above as [RIKKI_TENANT_ID])
INSERT INTO tenancies (landlord_id, property_id, tenancy_type, status, start_date, 
                       rent_amount, rent_frequency, rent_due_day, room_number, created_at, updated_at)
VALUES ('[YOUR_LANDLORD_ID]', 
        (SELECT id FROM properties WHERE name LIKE '%Woodstock%' AND landlord_id = '[YOUR_LANDLORD_ID]'),
        'single', 
        'active', 
        '2026-03-02',
        750.00,
        'monthly',
        1,
        'Room 5',
        NOW(), 
        NOW())
RETURNING id;

-- Then link tenant to tenancy
INSERT INTO tenancy_tenants (tenancy_id, tenant_id, is_primary, created_at)
VALUES ([RIKKI_TENANCY_ID], [RIKKI_TENANT_ID], true, NOW());

-- Step 4: Insert Jack Harris
INSERT INTO tenants (landlord_id, first_name, last_name, created_at, updated_at)
VALUES ('[YOUR_LANDLORD_ID]', 'Jack', 'Harris', NOW(), NOW())
RETURNING id;

-- Create tenancy (starting March 22)
INSERT INTO tenancies (landlord_id, property_id, tenancy_type, status, start_date, 
                       rent_amount, rent_frequency, rent_due_day, room_number, created_at, updated_at)
VALUES ('[YOUR_LANDLORD_ID]', 
        (SELECT id FROM properties WHERE name LIKE '%Woodstock%' AND landlord_id = '[YOUR_LANDLORD_ID]'),
        'single', 
        'active', 
        '2026-03-22',
        650.00,
        'monthly',
        1,
        'Room 4',
        NOW(), 
        NOW())
RETURNING id;

-- Link tenant to tenancy
INSERT INTO tenancy_tenants (tenancy_id, tenant_id, is_primary, created_at)
VALUES ([JACK_TENANCY_ID], [JACK_TENANT_ID], true, NOW());

-- Step 5: Create Jude Dibia's Room 1 tenancy
INSERT INTO tenancies (landlord_id, property_id, tenancy_type, status, start_date, 
                       rent_amount, rent_frequency, rent_due_day, room_number, created_at, updated_at)
VALUES ('[YOUR_LANDLORD_ID]', 
        (SELECT id FROM properties WHERE name LIKE '%Woodstock%' AND landlord_id = '[YOUR_LANDLORD_ID]'),
        'single', 
        'active', 
        '2026-03-01',
        800.00,
        'monthly',
        1,
        'Room 1',
        NOW(), 
        NOW())
RETURNING id;

-- Get Jude's tenant ID
-- INSERT INTO tenancy_tenants...
```

---

## OR: Manual Steps in CRM UI

### To Remove/End a Tenancy:
1. Go to Property → Tenancies tab
2. Find the tenant
3. Click Edit or ⋮ menu
4. Set Status to "ended"
5. Set End Date
6. Save

### To Change Rent/Room:
1. End current tenancy
2. Create new tenancy with:
   - New room number
   - New rent amount
   - Same tenant
   - Start date = today or move date

### To Add New Tenant:
1. Property → Add Tenancy
2. Search/select existing tenant or create new
3. Set room number and rent
4. Set start date
5. Save

---

## Feature Requests

### Remove Tenant Button
Need to add UI for:
- Ending tenancy with date
- Marking as "moved out"
- Keeping history but making inactive

### Room/Rent Change
Need workflow for:
- Seamless room transfer
- Rent change mid-tenancy
- Option to keep same tenant, change details

---

**Note:** Replace `[YOUR_LANDLORD_ID]` with your actual landlord UUID from the landlords table.

**Current Status:** Pending UI implementation or SQL execution
