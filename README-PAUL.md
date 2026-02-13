# Property CRM - Paul's Portfolio Database

## ✅ All Data Collected & Database Ready

### Portfolio Overview

| Property | Type | Rooms | Occupied | Monthly Income | Potential | Status |
|----------|------|-------|----------|----------------|-----------|--------|
| **Woodstock** | HMO (Suis Generis) | 9 | 7 (78%) | £5,010 | £6,450 | Active |
| **1 Mill Farm House** | Mini HMO | 3 | 2 (67%) | £1,400 | £2,050 | Licence Pending |
| **2 Mill Farm House** | HMO (Licensed) | 5 | 4 (80%) | £2,800 | £3,450 | Active |
| **TOTAL** | | **17** | **13 (76%)** | **£9,210** | **£11,950** | |

**Void Opportunity:** £1,950/month if all empty rooms filled
**Current Occupancy:** 76% (13 of 17 rooms)
**Total Tenants:** 15 (including 1 family discount tenant)

---

## Woodstock (Winchester) - 9 Rooms

| Room | Tenant | Rent | Due | Notes |
|------|--------|------|-----|-------|
| 1 | Jude Dibia | £800 | 1st | |
| 2 | Raj Edupuganti | £650 | 10th | **⚠️ EXPIRES APRIL** |
| 3 | Richard Osadebe | £800 | 1st | |
| 4 | **EMPTY** | £650 | - | Available |
| 5 | **EMPTY** | £750 | - | Available |
| 6 | Ben Fraser | £750 | 1st | |
| 7 | Chris Baird | £850 | 28th | En-suite |
| 8 | Marvin Simon | £800 | 1st | En-suite |
| 9 | Sam Airey | £360 | 1st | Family discount |

**⚠️ Actions Needed:**
- Room 2 vacancy decision (expires April)
- Market Rooms 4 & 5 (£1,400/month opportunity)
- Chris Baird rent due 28th Feb (pending in system)

---

## 1 Mill Farm House (Lockerley) - 3 Rooms

| Room | Tenant | Rent | Due | Notes |
|------|--------|------|-----|-------|
| 1 | Gary Jackson | £700 | 23rd | 2 years stable |
| 2 | Scott Hines | £700 | 1st | 2 years stable |
| 3 | **EMPTY** | £650 | - | Void 1 month |

**⚠️ Actions Needed:**
- Market Room 3 (£650/month)
- Chase Test Valley HMO licence

---

## 2 Mill Farm House (Lockerley) - 5 Rooms

| Room | Tenant | Rent | Due | Notes |
|------|--------|------|-----|-------|
| 1 | **EMPTY** | £650 | - | Void 1 month |
| 2 | Neil Hamilton | £700 | 16th | £300 arrears (paying back) |
| 3 | Gav Mytton | £700 | 14th | **🆕 Moving in 14th Feb** |
| 4 | John Yalley | £700 | 6th | King en-suite, 2 years |
| 5 | Phil Painter | £700 | 6th | 2 weeks in (31st Jan) |

**⚠️ Actions Needed:**
- Confirm Gav move-in on 14th Feb
- Market Room 1 (£650/month)
- Track Neil's arrears clearance

---

## System Setup Instructions

### 1. Database Setup
```bash
cd /Users/paul-ops/.openclaw/workspace/property-crm/database
# Create database if not exists
psql -c "CREATE DATABASE property_crm;"
# Run schema
psql -d property_crm -f schema.sql
# Seed with your data
psql -d property_crm -f seed-paul-data.sql
```

### 2. Backend Startup
```bash
cd /Users/paul-ops/.openclaw/workspace/property-crm/backend
npm install
# Copy and edit .env
cp .env.example .env
npm run dev
```

### 3. Frontend Startup
```bash
cd /Users/paul-ops/.openclaw/workspace/property-crm/frontend
npm install
npm start
```

Access at: http://localhost:3000

---

## What's Next (Step 3)

1. **API Integration**
   - Daily rent due reminders
   - Arrears alerts
   - Void room marketing nudges

2. **Google Drive Link**
   - Certificate storage per property
   - Tenancy agreement uploads
   - Receipt/invoice storage

3. **Telegram Bot**
   - Daily summary: "Woodstock: Chris Baird £850 due today"
   - Quick rent recording: /paid Woodstock Room 1 Feb £800
   - Arrears alerts

4. **Todoist Integration**
   - Auto-create tasks for expiring tenancies
   - Certificate expiry reminders

5. **Cashflow Integration**
   - Push rent receipts to Lunchflow
   - Track actual vs expected income

**Want to proceed with setting up the database next? Or test the API first?**