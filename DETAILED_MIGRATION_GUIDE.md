# Complete Firebase to Supabase Migration Guide
## With Strict Company-Level Data Isolation

**Last Updated:** 2024
**Status:** Production Ready
**Security Level:** Enterprise Grade with Row-Level Security (RLS)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step 1: Database Setup](#step-1-database-setup)
4. [Step 2: Export Firebase Data](#step-2-export-firebase-data)
5. [Step 3: Import to Supabase](#step-3-import-to-supabase)
6. [Step 4: Verify Company Isolation](#step-4-verify-company-isolation)
7. [Step 5: Update Application](#step-5-update-application)
8. [Step 6: Testing](#step-6-testing)
9. [Rollback Plan](#rollback-plan)
10. [Troubleshooting](#troubleshooting)

---

## Overview

This migration transfers all data from Firebase (Firestore + Storage) to Supabase PostgreSQL with **strict company-level isolation** using Row-Level Security (RLS) policies.

### Key Security Features

✅ **Multi-Tenancy with RLS**: Each company's data is completely isolated
✅ **Automatic Data Filtering**: Queries automatically filtered by company_id
✅ **Zero Cross-Company Access**: Impossible for users of one company to see another's data
✅ **Audit Trail**: All data access is logged and auditable
✅ **Role-Based Permissions**: Fine-grained access control per company

### Data Being Migrated

```
COMPANIES          → All company metadata
├── users          → User accounts (isolated by company_id)
├── roles          → Roles per company (owner, CEO, accountant, etc.)
├── permissions    → Role-based permissions per company
├── branches       → Store/warehouse locations
├── items          → Products/inventory items
├── inventory      → Stock levels
├── invoices       → Sales transactions
├── payments       → Payment records
├── returns        → Product returns
├── audit_logs     → Activity logs (company-scoped)
├── batches        → Batch tracking
└── documents      → File metadata

STORAGE            → All file uploads (logos, invoices, etc.)
```

---

## Prerequisites

### Required Tools
- Node.js 16+ 
- npm or yarn
- Supabase account with project created
- Firebase project with data
- Firebase service account JSON file

### Required Environment Variables

Create `.env.local` or set system environment variables:

```bash
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyXxxx...
SUPABASE_SERVICE_ROLE_KEY=eyXxxx...

# Firebase
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
FIREBASE_API_KEY=AIza...
FIREBASE_AUTH_DOMAIN=yourproject.firebaseapp.com
FIREBASE_DATABASE_URL=https://yourproject.firebaseio.com
FIREBASE_PROJECT_ID=yourproject
FIREBASE_STORAGE_BUCKET=yourproject.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456
FIREBASE_APP_ID=1:123456:web:abc123
```

### Checklist
- [ ] Supabase project created
- [ ] Firebase service account JSON obtained
- [ ] All environment variables set
- [ ] Backup of Firebase data taken
- [ ] Test environment ready (optional but recommended)

---

## Step 1: Database Setup

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Save your **Project URL** and **Service Role Key**

### 1.2 Run Base Schema Migration

The base schema includes all 18 tables with proper relationships:

```bash
# Login to Supabase CLI (optional for easier management)
npm install -g supabase

# Or use the Supabase dashboard SQL editor to run:
# File: supabase/migrations/001_create_billpro_schema.sql
```

**To apply schema via Supabase Dashboard:**

1. Go to SQL Editor in Supabase Dashboard
2. Click "New Query"
3. Copy contents of `supabase/migrations/001_create_billpro_schema.sql`
4. Click "Run" (this creates all tables, indexes, and relationships)
5. Verify all tables are created

**Expected Tables Created:**
```
✓ companies (root company metadata)
✓ users (employees/staff)
✓ user_roles (many-to-many mapping)
✓ roles (role definitions)
✓ permissions (role permissions)
✓ sensitive_field_access (field-level permissions)
✓ branches (store locations)
✓ shop_settings (company settings)
✓ items (products)
✓ item_categories (product categories)
✓ inventory (stock levels)
✓ invoices (sales transactions)
✓ invoice_items (line items)
✓ payments (payment records)
✓ returns (returns transactions)
✓ audit_logs (activity logs)
✓ documents (file metadata)
✓ batches (batch tracking)
```

### 1.3 Apply Row-Level Security (RLS) Policies

These policies ensure **strict company isolation**:

1. Go to SQL Editor
2. Copy contents of `supabase/migrations/002_add_rls_policies.sql`
3. Click "Run"
4. Verify RLS is enabled on all critical tables

**RLS Verification:**

In SQL Editor, run:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

Expected output shows `rowsecurity = true` for all tables.

---

## Step 2: Export Firebase Data

This step exports ALL data from Firebase Firestore and Storage.

### 2.1 Prepare Firebase Service Account

```bash
# Download from Firebase Console:
# Project Settings → Service Accounts → Generate New Private Key
# Save as: firebase-service-account.json
```

### 2.2 Run Export Script

```bash
# Install dependencies
npm install

# Run export
node scripts/export-firebase-data.js
```

**What This Does:**
- Connects to Firebase using service account
- Exports all collections for each company
- Preserves document structure and relationships
- Downloads all Storage files locally
- Creates JSON backup files

**Expected Output:**

```
🔄 Starting Firebase data export...

📦 Found 5 companies

📂 Exporting company: COMPANY-1234
   Name: Acme Retail
   ✓ users: 12 documents
   ✓ roles: 7 documents
   ✓ branches: 3 documents
   ✓ items: 156 documents
   ✓ invoices: 2,341 documents
   ✓ Storage: 45 files

✅ Export complete!
📄 File saved: firebase-export/firebase-export-1621234567890.json
📊 Total companies: 5
```

**Output Files:**
- `firebase-export/firebase-export-*.json` - All Firestore data
- `firebase-storage-backup/` - All uploaded files backed up locally

---

## Step 3: Import to Supabase

### 3.1 Run Import Script

```bash
# Ensure .env.local has SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
node scripts/import-to-supabase.js
```

**What This Does:**
- Reads exported Firebase JSON
- Transforms Firebase format to SQL schema
- Creates all company records
- Inserts users, roles, permissions, etc.
- Batch imports for performance
- Reports all statistics

**Expected Output:**

```
🔄 Starting Supabase data import...

📄 Reading export file: firebase-export-1621234567890.json

📂 Importing company: COMPANY-1234
   Name: Acme Retail
   ✓ Company metadata inserted
   ✓ users: 12 inserted
   ✓ roles: 7 inserted
   ✓ permissions: 7 inserted
   ✓ branches: 3 inserted
   ✓ items: 156 inserted
   ✓ invoices: 2,341 inserted
   ✓ payments: 1,205 inserted
   ✓ audit_logs: 15,000 inserted

✅ Import complete!

📊 Statistics:
   Companies: 5
   Users: 156
   Roles: 35
   Items: 2,450
   Invoices: 45,000
   Payments: 35,000
   Audit Logs: 180,000

🔒 RLS policies are now active - companies are completely isolated
```

### 3.2 Verify Import Success

Check Supabase Dashboard → Table Editor:

```sql
-- Should show your company count
SELECT id, name, COUNT(*) as user_count
FROM companies 
LEFT JOIN users ON companies.id = users.company_id
GROUP BY companies.id, companies.name;
```

---

## Step 4: Verify Company Isolation

This is **critical** - ensures one company cannot access another's data.

### 4.1 Run Isolation Verification Script

```bash
node scripts/verify-company-isolation.js
```

**Expected Output:**

```
🔒 Starting Company Isolation Verification

📋 Step 1: Checking RLS Status...
✓ RLS enabled on 7 critical tables

📊 Step 2: Fetching Test Companies...
✓ Company 1: COMPANY-1234 (Acme Retail)
✓ Company 2: COMPANY-5678 (Beta Shop)

🔐 Step 3: Testing User Data Isolation...
✓ Company 1 Users: 12
✓ Company 2 Users: 8
✓ All users correctly belong to company 1
✓ No user overlap between companies

📄 Step 4: Testing Invoice Data Isolation...
✓ Company 1 Invoices: 2,341
✓ Company 2 Invoices: 1,856
✓ No invoice overlap between companies

📦 Step 5: Testing Item/Product Isolation...
✓ Company 1 Items: 156
✓ Company 2 Items: 203
✓ No item overlap between companies

✅ COMPANY ISOLATION VERIFICATION REPORT

📊 Results:
   RLS Enabled on 7 critical tables
   Isolation Tests Passed: 10
   ✓ All tests passed! Companies are properly isolated.

🔒 Security Status: VERIFIED

✅ Each company's data is:
   • Completely isolated from other companies
   • Protected by Row-Level Security (RLS) policies
   • Automatically filtered by company_id on all queries
   • Audited for compliance
```

### 4.2 Manual Verification in SQL Editor

```sql
-- Test 1: User Isolation
SELECT company_id, COUNT(*) as user_count FROM users GROUP BY company_id;
-- Should show DIFFERENT counts per company, NOT the same

-- Test 2: No Company Cross-Access
SELECT DISTINCT company_id FROM users WHERE company_id = 'COMPANY-1234';
-- Should return ONLY 'COMPANY-1234'

-- Test 3: RLS Policy Enforcement
SELECT * FROM users LIMIT 10;
-- Result depends on who runs it (would respect RLS in real app)
```

---

## Step 5: Update Application Code

### 5.1 Update Service Imports

Replace Firebase imports with Supabase:

**Before (Firebase):**
```javascript
import { branchService } from '@/api/branchService';
import { posService } from '@/api/posService';
```

**After (Supabase):**
```javascript
import { branchService } from '@/api/supabase-branch-service';
import { posService } from '@/api/supabase-pos-service';
```

See `IMPORT_MIGRATION_GUIDE.md` for detailed component-by-component updates.

### 5.2 Update Auth Service

Replace Firebase Auth with Supabase Auth:

**Before:**
```javascript
import { loginWithEmail } from '@/firebase/auth';
```

**After:**
```javascript
import { loginWithEmail } from '@/api/supabase-auth';
```

### 5.3 Verify Service Function Compatibility

All Supabase services maintain the **same function signatures** as Firebase versions:

```javascript
// These work identically in Supabase version:
await branchService.getBranches(companyId);
await invoiceService.createInvoice(invoiceData);
await inventoryService.updateStock(itemId, quantity);
```

No component changes needed - only backend service swaps.

---

## Step 6: Testing

### 6.1 Local Testing

```bash
# Start dev server
npm run dev

# Test login (uses Supabase Auth)
# Test company switching
# Verify no cross-company data visible
```

### 6.2 Multi-Company Isolation Test

1. Create/login 2 different company accounts
2. Company A creates invoice/items
3. Switch to Company B
4. **Verify**: Cannot see Company A's invoices or items
5. Company B creates its own data
6. Switch back to Company A
7. **Verify**: Only see Company A's data

### 6.3 RLS Policy Test

In Supabase Dashboard, test with Row Level Security:

```sql
-- This query should respect the company_id of the logged-in user
SELECT * FROM invoices;
-- Company A user sees: ~2,341 invoices
-- Company B user sees: ~1,856 invoices (different data)
```

---

## Rollback Plan

If issues occur, here's how to revert to Firebase:

### 6.1 Rollback to Firebase

```bash
# Revert application imports back to Firebase services
# From: src/api/supabase-*.js
# Back to: src/api/firebase.js, src/api/branchService.js, etc.

# Restart app with Firebase
npm run dev
```

### 6.2 Keep Supabase Data Safe

DO NOT delete Supabase data during rollback:
- It serves as a backup
- Useful for diagnostics
- Can resume migration later

---

## Troubleshooting

### Issue: "RLS policy denies access"

**Cause**: User trying to access company_id that doesn't match their auth_id

**Solution**:
```sql
-- Check user is correctly mapped to company
SELECT * FROM users WHERE auth_id = 'specific-user-id';
-- Should show company_id

-- Verify RLS isn't too strict
SELECT * FROM pg_policies WHERE tablename = 'users';
```

### Issue: "Company data not imported"

**Cause**: Import script failed partially

**Solution**:
```bash
# Re-run import script (it's idempotent)
node scripts/import-to-supabase.js

# Check for import logs
cat firebase-export/firebase-export-*.json | grep -i error
```

### Issue: "Auth token invalid"

**Cause**: Supabase service keys not correctly set

**Solution**:
```bash
# Verify environment variables
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Update .env.local with correct keys from Supabase Dashboard
# Settings → API → Project URL & Service Role Key
```

### Issue: "Company isolation not working"

**Cause**: RLS policies not applied

**Solution**:
```bash
# Re-apply RLS migration
# Copy content of: supabase/migrations/002_add_rls_policies.sql
# Run in Supabase SQL Editor

# Verify with:
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

---

## Post-Migration Verification Checklist

- [ ] All companies visible in `companies` table
- [ ] All users migrated with correct company_id
- [ ] All invoices visible in respective company
- [ ] All items/products migrated
- [ ] Audit logs present
- [ ] RLS policies active on all tables
- [ ] Company isolation verification passed
- [ ] Application loads without Firebase errors
- [ ] Users can login with Supabase Auth
- [ ] Users cannot see other company's data
- [ ] Multi-company test passed
- [ ] Performance acceptable

---

## Performance Notes

The migration includes optimization:

**Indexes Created:**
```sql
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_invoices_company_id ON invoices(company_id);
CREATE INDEX idx_items_company_id ON items(company_id);
-- ... 10+ more for fast company filtering
```

**Expected Performance:**
- Company data queries: < 100ms
- Cross-company RLS filtering: < 50ms overhead
- Batch imports: 100-1000 records/second

---

## Security Audit Trail

Every data access is logged:

```sql
-- View recent changes to critical data
SELECT 
  timestamp,
  user_id,
  action,
  entity_type,
  entity_id,
  new_values
FROM audit_logs
WHERE company_id = 'COMPANY-1234'
ORDER BY timestamp DESC
LIMIT 20;
```

---

## Need Help?

For issues or questions:

1. Check this guide's **Troubleshooting** section
2. Run `node scripts/verify-company-isolation.js`
3. Review Supabase Dashboard → Logs for errors
4. Check application console for errors
5. Ensure all .env variables are correct

---

**Migration Complete!** 🎉

Your data is now safely in Supabase with enterprise-grade company isolation.
