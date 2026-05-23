# Manual Firebase to Supabase Migration - Step-by-Step Guide

## Status: ✅ Ready for Execution

All migration files are prepared and ready. Follow these steps to complete the migration.

---

## Phase 1: Database Schema Creation

### Step 1: Access Supabase Dashboard

1. Go to: https://app.supabase.com
2. Sign in with your account
3. Select your project: **wlyoqayzcftbgjbnhvkr**

### Step 2: Create Database Schema

1. Click on **SQL Editor** in the left sidebar
2. Click **New Query** button
3. Open the schema file: `/supabase/migrations/001_create_billpro_schema.sql`
4. Copy ALL contents of the file
5. Paste into the SQL Editor
6. Click **Run** button
7. Wait for completion (should take 1-2 minutes)

**Expected Result:**
- 18 tables created
- 40+ indexes created
- 0 errors

### Step 3: Apply Row-Level Security Policies

1. Click **New Query** again
2. Open the RLS file: `/supabase/migrations/002_add_rls_policies.sql`
3. Copy ALL contents
4. Paste into the SQL Editor
5. Click **Run** button
6. Wait for completion (should take 1-2 minutes)

**Expected Result:**
- 50+ RLS policies applied
- 0 errors
- All tables have RLS enabled

---

## Phase 2: Verify Database Setup

### Step 4: Check Tables

1. Go to **Database** > **Tables** in Supabase Dashboard
2. Verify you see all 18 tables:
   - companies
   - users
   - roles
   - user_roles
   - permissions
   - role_permissions
   - branches
   - items
   - item_categories
   - invoices
   - invoice_items
   - payments
   - returns
   - return_items
   - inventory
   - inventory_batches
   - audit_logs
   - settings

### Step 5: Verify RLS is Enabled

1. Go to **Database** > **Tables** in Supabase Dashboard
2. Click on any table (e.g., **companies**)
3. Go to the **RLS** tab
4. Confirm: "Row Level Security is enabled"
5. You should see multiple policies listed

---

## Phase 3: Data Migration

### Step 6: Export Firebase Data

```bash
cd /vercel/share/v0-project
node --env-file-if-exists=/vercel/share/.env.project scripts/export-firebase-data.js
```

This will:
- Extract all data from Firebase Firestore
- Export all files from Firebase Storage
- Create JSON/CSV files in `/exports` directory
- Show summary of data extracted

### Step 7: Import Data to Supabase

```bash
cd /vercel/share/v0-project
node --env-file-if-exists=/vercel/share/.env.project scripts/import-to-supabase.js
```

This will:
- Read exported Firebase data
- Transform data to Supabase schema
- Insert with company_id assignments
- Verify data integrity
- Show summary of imported records

### Step 8: Verify Company Isolation

```bash
cd /vercel/share/v0-project
node --env-file-if-exists=/vercel/share/.env.project scripts/verify-company-isolation.js
```

This will:
- Test that Company A cannot see Company B data
- Test that Company B cannot see Company A data
- Verify RLS policies are working
- Show security verification results

---

## Phase 4: Application Integration

### Step 9: Update Environment Variables

Create or update `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://wlyoqayzcftbgjbnhvkr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_SUPABASE_REDIRECT_URL=http://localhost:3000/auth/callback
```

### Step 10: Update Application Imports

Update component imports to use Supabase services:

**Old (Firebase):**
```javascript
import { signInWithGoogle } from '../api/firebase';
import { fetchBranches } from '../api/branchService';
```

**New (Supabase):**
```javascript
import { signInWithGoogle } from '../api/supabase-auth';
import { fetchBranches } from '../api/supabase-branch-service';
```

See: `IMPORT_MIGRATION_GUIDE.md` for all component updates

### Step 11: Test Application

1. Start dev server: `npm run dev`
2. Go to http://localhost:3000
3. Test login with Google OAuth
4. Verify user can see company data
5. Test switching companies
6. Verify no cross-company data access

### Step 12: Deploy to Production

1. Update `.env` variables in Vercel project settings
2. Deploy to staging environment first
3. Run full smoke tests
4. Deploy to production
5. Monitor logs for errors
6. Keep Firebase as backup for 30 days

---

## Troubleshooting

### Tables Not Visible After Running SQL

**Problem:** Tables don't appear in Supabase Dashboard after running migrations

**Solutions:**
1. Refresh the page (F5)
2. Clear browser cache (Ctrl+Shift+Delete)
3. Try running migrations again
4. Check error messages in SQL Editor output

### RLS Policies Not Applied

**Problem:** RLS tab shows "Row Level Security is disabled"

**Solutions:**
1. Re-run the RLS migration (002_add_rls_policies.sql)
2. Verify all policies are showing in the RLS tab
3. Check for any error messages in SQL output

### Import Script Fails

**Problem:** Error when running import-to-supabase.js

**Solutions:**
1. Verify export completed successfully
2. Check that Supabase environment variables are set
3. Verify database tables exist
4. Check available disk space
5. Try importing in smaller batches

### Authentication Issues

**Problem:** Google OAuth not working after migration

**Solutions:**
1. Verify OAuth credentials in Supabase Dashboard
2. Check redirect URL matches (localhost:3000/auth/callback for dev)
3. Clear browser cookies
4. Verify JWT secret is correct

---

## Success Criteria

When migration is complete, you should have:

✅ 18 tables in Supabase
✅ 40+ indexes for performance
✅ 50+ RLS policies for security
✅ All Firebase data migrated
✅ Company A cannot see Company B data
✅ Company B cannot see Company A data
✅ Google OAuth working
✅ All features working identically to Firebase

---

## Timeline

| Phase | Task | Duration |
|-------|------|----------|
| 1 | Create database schema | 5-10 min |
| 1 | Apply RLS policies | 5-10 min |
| 2 | Verify database | 5 min |
| 3 | Export Firebase data | 5-30 min |
| 3 | Import to Supabase | 10-60 min |
| 3 | Verify company isolation | 5 min |
| 4 | Update app imports | 2-4 hours |
| 4 | Test application | 4-8 hours |
| 4 | Deploy to production | 1-2 hours |

**Total: 1-2 weeks** (mostly testing and deployment)

---

## Support

For issues or questions:
1. Check error messages in Supabase Dashboard
2. Review logs in the application
3. Consult the troubleshooting section above
4. Refer to detailed guides in project root

---

## Next Document

After completing these steps, read: `COMPLETE_MIGRATION_CHECKLIST.md`
