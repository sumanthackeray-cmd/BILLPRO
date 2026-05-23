# BillPro Firebase to Supabase Migration Guide

Complete guide for migrating your BillPro application from Firebase to Supabase.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Step 1: Create Supabase Project](#step-1-create-supabase-project)
3. [Step 2: Execute Database Schema](#step-2-execute-database-schema)
4. [Step 3: Configure Authentication](#step-3-configure-authentication)
5. [Step 4: Migrate Data from Firebase](#step-4-migrate-data-from-firebase)
6. [Step 5: Update Application Code](#step-5-update-application-code)
7. [Step 6: Testing & Deployment](#step-6-testing--deployment)

---

## Prerequisites

- Active Supabase account (https://supabase.com)
- Firebase project with existing data
- Node.js 16+ installed
- Access to project environment variables

---

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in the details:
   - **Name**: `billpro` or your preferred name
   - **Database Password**: Create a strong password
   - **Region**: Select closest to your location
4. Click "Create new project" and wait for completion (2-3 minutes)

### Retrieve Connection Details

Once your project is created:
1. Go to **Settings** → **Database**
2. Copy these values and add to your `.env` file:
   ```
   VITE_SUPABASE_URL=your_project_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

3. Also retrieve the PostgreSQL connection string:
   - Go to **Settings** → **Database** → **Connection pooling**
   - Copy the connection string

---

## Step 2: Execute Database Schema

### Method A: Using Supabase SQL Editor (Recommended)

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `supabase/migrations/001_create_billpro_schema.sql`
4. Paste into the editor
5. Click **Run** (or press `Ctrl+Enter`)
6. Wait for all queries to execute (you should see checkmarks)

### Method B: Using psql Command

```bash
# Get your database URL from Supabase
# Settings > Database > Connection string > PostgreSQL

psql "postgresql://user:password@db.project.supabase.co:5432/postgres" < supabase/migrations/001_create_billpro_schema.sql
```

---

## Step 3: Configure Authentication

### Enable Google OAuth in Supabase

1. Go to Supabase Dashboard → **Authentication** → **Providers**
2. Find and click on "Google"
3. Toggle the provider to **enabled**
4. You'll need Google OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select existing
   - Enable Google+ API
   - Create OAuth 2.0 credentials:
     - Application type: Web application
     - Authorized redirect URIs: `https://your-project.supabase.co/auth/v1/callback`
   - Copy the Client ID and Client Secret
5. Paste into Supabase Google provider settings
6. Save and enable the provider

### Configure Redirect URLs

In Supabase Dashboard → **Authentication** → **URL Configuration**:

Add your application URLs:
```
Allowed URLs:
- http://localhost:5173
- http://localhost:3000
- https://your-production-domain.com
- https://your-preview-domain.vercel.app
```

### Create Auth Service Role

The schema automatically creates the necessary tables and RLS policies for authentication.

---

## Step 4: Migrate Data from Firebase

### Export Data from Firebase

```bash
# Use Firebase Admin SDK to export data
npm install firebase-admin

# Create a script to export (example in scripts/export-firebase-data.js)
node scripts/export-firebase-data.js
```

### Import Data to Supabase

We provide migration helpers in `scripts/migrate-firebase-to-supabase.js`:

```bash
# Set environment variables
export FIREBASE_CREDENTIALS=/path/to/serviceAccountKey.json

# Run migration
node scripts/migrate-firebase-to-supabase.js
```

### What Gets Migrated:
- All users → `users_profile` table
- All branches → `branches` table
- All products → `products` table
- All invoices & transactions → invoice tables
- All inventory data → `inventory` table
- All customers → `customers` table
- All vendors → `vendors` table
- Audit logs → `audit_logs` table

---

## Step 5: Update Application Code

### Environment Variables

Update or create `.env` with:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Keep Firebase keys for fallback (optional)
VITE_FIREBASE_API_KEY=your_firebase_key
```

### Import Changes

The new Supabase services are fully compatible with the Firebase interfaces. Update imports:

**Before (Firebase):**
```javascript
import { createBranch, getBranch } from './api/branchService';
import { logAuditAction } from './api/auditLogging';
```

**After (Supabase):**
```javascript
// Services now use the same API signatures
import { createBranch, getBranch } from './api/supabase-branch-service';
import { logAuditAction } from './api/supabase-audit-logging';
```

### Initialize Supabase Auth in App

In your main `App.jsx`:

```javascript
import { useEffect } from 'react';
import { initializeAuth } from './api/supabase-auth';
import { initializeInventorySubscriptions } from './api/supabase-inventory-service';

export default function App() {
  useEffect(() => {
    // Initialize authentication
    initializeAuth();
    
    // Initialize real-time inventory subscriptions
    initializeInventorySubscriptions();
  }, []);

  return (
    // Your app components
  );
}
```

### Update Auth Components

For login/sign-up components, use the new auth methods:

```javascript
import { signInWithGoogle, signInWithEmail } from './api/supabase-auth';

// Google Sign-In
async function handleGoogleSignIn() {
  try {
    await signInWithGoogle();
  } catch (error) {
    console.error('Sign in failed:', error);
  }
}

// Email Sign-In
async function handleEmailSignIn(email, password) {
  try {
    const data = await signInWithEmail(email, password);
    // User is authenticated
  } catch (error) {
    console.error('Sign in failed:', error);
  }
}
```

---

## Step 6: Testing & Deployment

### Local Testing

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Test authentication:
   - Test Google OAuth login
   - Test email/password login (if enabled)
   - Verify user profile is created

4. Test data access:
   - Create a new branch
   - Add products
   - Create invoices
   - Verify audit logs are recorded

### Staging Deployment

1. Deploy to Vercel with environment variables
2. Test full application flow
3. Verify real-time updates work
4. Check database queries in Supabase logs

### Production Deployment

1. Backup Firebase data (archive the project)
2. Deploy application with Supabase
3. Monitor logs for any issues
4. Gradually migrate users to new system
5. After confirmation, decommission Firebase

---

## Service Mapping

### Replaced Services

| Firebase Service | Supabase Service |
|---|---|
| `firebase.js` | `lib/supabase.js` |
| `branchService.js` | `supabase-branch-service.js` |
| `posService.js` | `supabase-pos-service.js` |
| `auditLogging.js` | `supabase-audit-logging.js` |
| `inventorySyncService.js` | `supabase-inventory-service.js` |

### API Compatibility

All new services maintain the same function signatures as Firebase versions:
- `createBranch(branchData)` → Same interface
- `getBranch(branchId)` → Same interface
- `getAllBranches()` → Same interface
- `updateBranch(branchId, updates)` → Same interface

No component changes required!

---

## Row-Level Security (RLS) Policies

Supabase implements RLS to ensure data isolation:

- Users can only view their own branches
- Users assigned to a branch can view branch data
- Audit logs are branch-scoped
- Products are readable by all authenticated users
- Sensitive data (audit logs, user data) is protected

These policies are automatically set up in the migration script.

---

## Troubleshooting

### "Connection refused" Error
- Check VITE_SUPABASE_URL is correct
- Verify Supabase project is active
- Check network connectivity

### "RLS policy violation" Error
- Verify user is authenticated
- Check user has branch assignment
- Review RLS policies in Supabase Dashboard

### Missing Data
- Check migration script completed successfully
- Verify all tables were created
- Check Firebase data format matches expected schema

### Real-Time Updates Not Working
- Call `initializeInventorySubscriptions()` in App startup
- Check browser console for subscription errors
- Verify Realtime is enabled in Supabase

---

## Next Steps

1. Set up monitoring and alerting
2. Configure backups in Supabase
3. Set up proper roles and permissions
4. Document any custom API endpoints
5. Plan gradual user migration if needed

For support, visit:
- [Supabase Docs](https://supabase.com/docs)
- [Supabase Community](https://discord.supabase.io)
- [GitHub Issues](https://github.com/supabase/supabase/issues)
