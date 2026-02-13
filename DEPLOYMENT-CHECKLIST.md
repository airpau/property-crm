# 🚀 Property CRM - Deployment Checklist for Paul

## Pre-Deployment Tasks

### ✅ Step 1: Supabase Project Setup
- [ ] Go to https://supabase.com and create account/login
- [ ] Click "New Project"
- [ ] Name: `property-crm-production`
- [ ] Region: `London (eu-west-2)` 
- [ ] Create strong database password (save in password manager)
- [ ] Wait for project creation (2-3 minutes)

### ✅ Step 2: Configure Database
- [ ] Go to SQL Editor in Supabase dashboard
- [ ] Copy/paste contents of `database/schema-supabase.sql`
- [ ] Click "Run" to create tables and RLS policies
- [ ] Verify tables created: landlords, properties, tenants, tenancies, rent_payments, etc.

### ✅ Step 3: Create User Account
- [ ] Go to Authentication → Users
- [ ] Click "New user"
- [ ] Email: `aireypaul@googlemail.com`
- [ ] Set password (something you'll remember)
- [ ] Toggle "Email Confirm" OFF
- [ ] In "User Metadata" add:
  ```json
  {
    "name": "Paul Airey",
    "company": "AIRPROP"
  }
  ```
- [ ] Click "Create user"
- [ ] **CRITICAL**: Copy the User ID (UUID like `550e8400-e29b-41d4-a716-446655440000`)

### ✅ Step 4: Seed Your Data
- [ ] Open `database/seed-supabase.sql` in a text editor
- [ ] Replace **ALL** instances of `USER_UUID_HERE` with your actual User ID
- [ ] Uncomment the SQL code (remove `/*` at line 13 and `*/` at the end)
- [ ] Go back to Supabase SQL Editor
- [ ] Run the modified seed file
- [ ] You should see: "Data seeded successfully! Total: 3 properties, 13 tenants, 11 tenancies"

### ✅ Step 5: Get Supabase Credentials
- [ ] Go to Settings → API in Supabase
- [ ] Copy the `URL` 
- [ ] Copy the `anon/public` key
- [ ] Copy the `service_role` secret key
- [ ] Save these 3 values - you'll need them for Render!

---

## Render Deployment

### ✅ Step 6: Push Code to GitHub
```bash
# If not already done:
git init
git add .
git commit -m "Production deployment ready"
git remote add origin https://github.com/YOUR_USERNAME/property-crm.git
git push -u origin main
```

### ✅ Step 7: Deploy to Render
- [ ] Go to https://render.com and sign up with GitHub
- [ ] In dashboard, click "Blueprints"
- [ ] Click "New Blueprint Instance"
- [ ] Connect your GitHub repo
- [ ] Click "Apply"

### ✅ Step 8: Configure Environment Variables (in Render Dashboard)
While services are deploying, go to the **Backend** service and add:

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | your-supabase-url |
| `SUPABASE_ANON_KEY` | your-anon-key |
| `SUPABASE_SERVICE_ROLE_KEY` | your-service-role-key |

The `FRONTEND_URL` will be set automatically.

### ✅ Step 9: Wait for Deployment
- [ ] Backend service: wait until status shows "Live" (~3 minutes)
- [ ] Frontend service: wait until build completes (~2 minutes)
- [ ] Copy the frontend URL (something like `https://property-crm-frontend-xxx.onrender.com`)

---

## Testing & Verification

### ✅ Step 10: Test Login
- [ ] Visit the frontend URL
- [ ] Click "Sign In"
- [ ] Enter: `aireypaul@googlemail.com` and your password
- [ ] Should see properties list with:
  - Woodstock
  - 1 Mill Farm House  
  - 2 Mill Farm House

### ✅ Step 11: Test Data Isolation
- [ ] Try to access: `https://your-api.onrender.com/api/properties`
- [ ] Without being logged in, should get "401 Unauthorized"
- [ ] Login via frontend, verify properties load
- [ ] Verify tenants and rent tracker also work

### ✅ Step 12: Test Adding Data
- [ ] Click "Add Property" button
- [ ] Create a test property
- [ ] Verify it appears in the list
- [ ] Delete the test property

---

## Post-Deployment Configuration (Optional)

### ✅ Enable Email Verification
- [ ] Supabase Dashboard → Authentication → Settings
- [ ] Toggle "Enable email confirmations" ON
- [ ] Set "Site URL" to your Render frontend URL
- [ ] Customize email templates if desired

### ✅ Custom Domain (if you want one)
- [ ] Render Dashboard → Frontend service → Settings
- [ ] Click "Custom Domain"
- [ ] Add domain (e.g., `crm.airprop.co.uk`)
- [ ] Follow DNS instructions
- [ ] Update CORS in Render backend env vars to match new domain

### ✅ Enable Google OAuth (optional)
- [ ] Supabase → Authentication → Providers → Google
- [ ] Enable Google provider
- [ ] Add credentials from Google Cloud Console
- [ ] Add authorized redirect URL in Google settings

---

## Troubleshooting Quick Fixes

### "Cannot login" 
→ Check Supabase user exists and password matches

### "No properties showing"
→ Check seed data was run with correct User ID

### "401 errors"
→ Check SUPABASE_ANON_KEY is correct in Render

### "Cannot connect to database"
→ Check SUPABASE_URL is correct (https://, not http://)

### "Mixed Content errors"
→ Ensure all URLs use HTTPS, not HTTP

---

## 📞 Support

- **Supabase Docs**: https://supabase.com/docs
- **Render Docs**: https://render.com/docs
- **Project README**: `README-DEPLOY.md` (comprehensive guide)

---

## 🎉 Success Criteria

You'll know the deployment is successful when:
- ✅ You can login with your credentials
- ✅ You see all 3 properties with tenant counts
- ✅ You can view property details with tenancies
- ✅ You can access the rent tracker
- ✅ Creating new properties works

**Estimated total time**: 30-45 minutes for first deployment
