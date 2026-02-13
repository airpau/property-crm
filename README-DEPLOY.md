# Property CRM - Production Deployment Guide

Complete guide to deploy the Property CRM to production using Supabase (database + auth) and Render (hosting).

## 📋 Deployment Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Supabase      │────▶│   Backend API    │◀────│    Frontend     │
│  (Auth + DB)    │     │  (Render.com)    │     │  (Render.com)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                              ▲                          │
                              └──────────────────────────┘
                                   User Authentication
```

---

## 🛠️ Step 1: Supabase Setup

### 1.1 Create New Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Configure:
   - **Name**: `property-crm-production` (or your preferred name)
   - **Organization**: Your organization
   - **Region**: `London (eu-west-2)` (closest to you)
   - **Database Password**: Create a strong password (save this!)
4. Wait for project creation (~2 minutes)

### 1.2 Get Connection Details

1. In your project dashboard, go to **Settings** → **API**
2. Copy these values:
   - `URL` (e.g., `https://xxxx.supabase.co`)
   - `anon/public` API key
   - `service_role` secret key (⚠️ Keep this secure!)

### 1.3 Run Database Schema

1. Go to **SQL Editor** in Supabase dashboard
2. Click **New Query**
3. Open `database/schema-supabase.sql` from this repo
4. Paste the entire SQL file contents
5. Click **Run**

**What this creates:**
- All tables (properties, tenants, tenancies, etc.)
- RLS policies for data isolation
- Indexes for performance
- Auth integration trigger

### 1.4 Verify RLS Policies

1. Go to **Table Editor**
2. Click on any table (e.g., `properties`)
3. Click the shield icon to view RLS policies
4. Confirm policies exist that filter by `auth.uid()`

---

## 📦 Step 2: Seed Data (Paul's Properties)

### 2.1 Create User Account

1. In Supabase dashboard, go to **Authentication** → **Users**
2. Click **New**
3. Add Paul:
   - Email: `aireypaul@googlemail.com`
   - Password: Create a secure password
   - Email Confirm: Toggle OFF (to skip verification for now)
   - Raw Metadata:
     ```json
     {
       "name": "Paul Airey",
       "company": "AIRPROP"
     }
     ```
4. Click **Create User**
5. Copy the **User ID** (UUID format like `550e8400-...`)

### 2.2 Run Seed Data

1. Go to **SQL Editor**
2. Open `database/seed-supabase.sql`
3. **Replace** `USER_UUID_HERE` with the actual User ID from step 2.1
4. Uncomment the SQL code (remove `/*` and `*/`)
5. Run the query

**This seeds:**
- 3 properties (Woodstock, 1 Mill Farm House, 2 Mill Farm House)
- 13 tenants
- 11 tenancies
- Rent payment history

---

## 🚀 Step 3: Deploy Backend to Render

### 3.1 Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up with GitHub (recommended) or email

### 3.2 Deploy from Blueprint

1. In Render dashboard, go to **Blueprints**
2. Click **New Blueprint Instance**
3. Connect your GitHub repository
4. Select the `property-crm` repo
5. Click **Apply**

### 3.3 Configure Environment Variables

During setup or in the dashboard, set these for the **Backend** service:

| Variable | Value | Notes |
|----------|-------|-------|
| `SUPABASE_URL` | `https://xxxx.supabase.co` | Your Supabase URL |
| `SUPABASE_ANON_KEY` | `eyJ...` | Anon/public key from Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Service role key (secret) |
| `FRONTEND_URL` | Auto-set by Render | Will be set automatically |

### 3.4 Deploy API Service

1. Render will automatically:
   - Install npm dependencies
   - Start the server (`npm start`)
   - Assign a URL (e.g., `https://property-crm-api.onrender.com`)

2. Wait for deployment (first deployment: ~3 minutes)

3. Test the deployment:
   ```
   GET https://your-api.onrender.com/api/health
   ```
   Should return: `{"status":"ok",...}`

---

## 🌐 Step 4: Deploy Frontend to Render

The frontend will be deployed alongside the backend via the Blueprint.

### 4.1 Verify Frontend Deployment

1. In Render dashboard, check for the **Static Site**
2. Wait for build to complete
3. Get the URL (e.g., `https://property-crm-frontend.onrender.com`)

### 4.2 Verify Frontend API Connection

The `render.yaml` automatically:
- Sets `REACT_APP_API_URL` to the backend URL
- Builds the static files
- Serves the React app

### 4.3 Test the Full Stack

1. Visit the frontend URL
2. Click **Sign In**
3. Login with the account created in Supabase:
   - Email: `aireypaul@googlemail.com`
   - Password: (the one you set)
4. You should see the properties list with Woodstock, 1 Mill Farm House, and 2 Mill Farm House

---

## 🔐 Security Configuration

### RLS Policies (Already Applied)

Each user can only access their own data:
- `landlords`: user_id = auth.uid()
- `properties`: landlord_id = auth.uid()
- `tenants`: landlord_id = auth.uid()
- `tenancies`: landlord_id = auth.uid()
- `rent_payments`: landlord_id = auth.uid()

### Important Security Notes

1. **Never** commit `.env` files with real credentials
2. **Never** expose `SUPABASE_SERVICE_ROLE_KEY` to the frontend
3. **Always** use HTTPS in production (Render handles this)
4. Enable **Email Verification** for production (Supabase Auth settings)

---

## 🔧 Environment Variables Reference

### Backend (`backend/.env`)

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
FRONTEND_URL=https://your-frontend.onrender.com
NODE_ENV=production
PORT=10000
```

### Frontend (`frontend/.env.local` - local only)

```env
REACT_APP_API_URL=http://localhost:3001
```

For production, `REACT_APP_API_URL` is set by Render automatically.

---

## 📱 Custom Domain Configuration (Optional)

### For Render Frontend

1. In Render dashboard, go to your static site
2. Click **Settings** → **Custom Domains**
3. Add your domain (e.g., `crm.airprop.co.uk`)
4. Follow DNS instructions
5. (Optional) Enable SSL (Auto-managed by Render)

### Update CORS

After setting custom domain, update `FRONTEND_URL` in backend environment to match.

---

## 🐛 Troubleshooting

### "Failed to fetch properties" error

**Check:**
1. Supabase URL is correct (no trailing slash)
2. RLS policies are properly configured
3. User has been seeded in `landlords` table

### 401 Unauthorized errors

**Check:**
1. JWT token is being passed in header
2. Supabase `anon_key` is correct
3. User exists in `auth.users` table

### "Cannot connect to database"

**Check:**
1. Using Supabase **URL** (not database connection string)
2. Using port 443 (HTTPS) for Supabase
3. CORS is configured in Supabase (Settings → API → CORS)

### Frontend not connecting to API

**Check:**
1. `REACT_APP_API_URL` is set correctly in build
2. No mixed content errors (HTTP vs HTTPS)
3. CORS headers are set in backend

### Missing data after deployment

**Check:**
1. Seed data was run with the correct User ID
2. Landlord profile exists matching the auth user
3. Run: `SELECT * FROM landlords;` in Supabase SQL Editor

---

## 🚀 Additional Features

### Enable Google OAuth (Optional)

1. Supabase Dashboard → Authentication → **Providers**
2. Enable **Google**
3. Add OAuth credentials from Google Cloud Console
4. Update callback URL in Google settings to your Render frontend

### Email Templates (Production)

1. Supabase Dashboard → Authentication → **Email Templates**
2. Customize:
   - Confirmation email
   - Reset password email
   - Change email email

### Enable 2FA (Future Enhancement)

Supabase supports TOTP-based 2FA out of the box. Can be added to frontend as a feature.

---

## 📞 Support & Resources

- **Supabase Docs**: https://supabase.com/docs
- **Render Docs**: https://render.com/docs
- **Supabase Discord**: https://discord.gg/supabase
- **Render Support**: support@render.com

---

## 🎉 Post-Deployment Checklist

- [ ] Confirm health check passes at `/api/health`
- [ ] Confirm login works with seeded credentials
- [ ] Confirm properties, tenants, and tenancies display
- [ ] Create a test property via UI
- [ ] Verify RLS (create a second account and confirm isolation)
- [ ] Enable email verification (if for production)
- [ ] Test password reset flow
- [ ] Set up monitoring/alerting (optional)

---

**You're done!** 🏠 The Property CRM is now production-ready and can be shared with other landlords.
