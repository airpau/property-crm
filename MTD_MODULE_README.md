# MTD (Making Tax Digital) Module — Property Angel.ai

## Overview
Making Tax Digital for Income Tax Self Assessment (MTD ITSA) launches **April 6, 2026**. This module helps landlords comply by auto-categorising property income and expenses into HMRC-approved categories and generating quarterly reports.

## What's Built

### Phase 1 ✅ — Landing Page + Waitlist
- **`/mtd` route** — Public landing page with compelling messaging, timeline, pricing, and waitlist signup
- **Waitlist stored in Supabase** (`mtd_waitlist` table)
- **No auth required** — anyone can join the waitlist

### Phase 2 ✅ — Core Module Architecture

#### Database Schema (`migrations/003_mtd_tables.sql`)
| Table | Purpose |
|-------|---------|
| `mtd_waitlist` | Email waitlist signups |
| `mtd_categories` | HMRC income/expense categories (seeded from SA105) |
| `mtd_quarters` | Quarterly periods per landlord per tax year |
| `mtd_transactions` | Individual transactions mapped to HMRC categories |

#### Backend API Routes (`routes/mtd.js`)
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/mtd/waitlist` | Public | Join waitlist |
| GET | `/api/mtd/quarters` | Auth | Get quarters for a tax year |
| POST | `/api/mtd/quarters/init` | Auth | Initialize 4 quarters for a tax year |
| GET | `/api/mtd/quarters/:id/summary` | Auth | Detailed P&L by property |
| GET | `/api/mtd/quarters/:id/export` | Auth | Export quarter as CSV |
| GET | `/api/mtd/categories` | Auth | List HMRC categories |
| POST | `/api/mtd/transactions` | Auth | Add a transaction |
| POST | `/api/mtd/auto-categorise/:quarterId` | Auth | Import rent payments, SA bookings, expenses |

#### Frontend Components
- **`MTDLanding.js`** — Public landing page at `/mtd`
- **`MTDDashboard.js`** — Protected dashboard at `/mtd-dashboard` with quarterly P&L per property

### Phase 3 📐 — Integration Points (Design Only)

1. **Open Banking (TrueLayer/Plaid)** — Import bank transactions, auto-match to properties
2. **Airbnb/Booking.com API** — Auto-import SA income with guest details
3. **HMRC MTD API** — Direct quarterly submission via HMRC's MTD for ITSA API

## Architecture Decisions

1. **Separate MTD transactions table** — Don't modify existing rent_payments/expenses tables. Instead, MTD transactions reference originals via `source`/`source_id`.
2. **HMRC categories from SA105** — Categories match the official UK Property supplementary pages.
3. **Auto-categorisation** — Maps existing expense categories to HMRC codes. Rent payments → RENT, SA bookings → SA_INCOME.
4. **Finance costs restriction** — Mortgage interest tagged as FINANCE_COSTS for the 20% tax credit calculation.
5. **RLS enabled** — Row-level security ensures landlords only see their own data.

## Deployment

1. Run the migration SQL against Supabase
2. Deploy backend (routes auto-registered in server.js)
3. Deploy frontend (new routes added to App.js)

## What's Left

- [ ] Run migration SQL on production Supabase
- [ ] Add MTD Dashboard link to Navbar
- [ ] PDF export (in addition to CSV)
- [ ] HMRC MTD API integration (requires HMRC developer account)
- [ ] Open Banking integration
- [ ] Airbnb/Booking.com API integration
- [ ] Email notifications for upcoming deadlines
- [ ] Stripe payment integration for £19/mo pricing
