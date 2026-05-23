# Testing and Deployment Guide

Complete guide for testing the Supabase migration and deploying to staging/production.

## Table of Contents
1. [Local Testing](#local-testing)
2. [Unit Tests](#unit-tests)
3. [Integration Tests](#integration-tests)
4. [Staging Deployment](#staging-deployment)
5. [Production Deployment](#production-deployment)
6. [Monitoring](#monitoring)

---

## Local Testing

### Setup Local Environment

1. **Install dependencies:**
```bash
npm install
```

2. **Create `.env.local`:**
```bash
cp .env.example .env.local
```

3. **Fill in Supabase credentials:**
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
VITE_BACKEND=supabase
```

4. **Start development server:**
```bash
npm run dev
```

The app should start at `http://localhost:5173` (or the port shown).

### Manual Testing Checklist

#### Authentication Tests
- [ ] **Google OAuth Login**
  - Click "Sign in with Google"
  - Verify redirect to Google login
  - Verify redirect back to app after auth
  - Verify user is authenticated
  
- [ ] **Email/Password Login**
  - Sign up with new email
  - Verify email confirmation (if required)
  - Sign in with email/password
  - Verify authentication

- [ ] **Session Persistence**
  - Log in to app
  - Refresh page
  - Verify user still logged in
  - Close and reopen browser
  - Verify user session persists

- [ ] **Logout**
  - Log out
  - Verify session cleared
  - Verify redirect to login

#### Data Operations Tests

- [ ] **Create Branch**
  - Navigate to Branch Management
  - Create new branch with valid data
  - Verify branch appears in list
  - Verify branch data saved in Supabase

- [ ] **Update Branch**
  - Edit existing branch
  - Change some fields
  - Save changes
  - Verify changes persisted
  - Refresh and verify still shows updates

- [ ] **Create Invoice**
  - Navigate to POS
  - Create new invoice
  - Add line items
  - Calculate totals correctly
  - Verify invoice saved
  - Check in database

- [ ] **Record Payment**
  - Complete invoice creation
  - Record payment
  - Verify invoice status changes to "Completed"
  - Check payment in database

- [ ] **Create Return**
  - Create return for existing invoice
  - Verify return status
  - Check return in database

#### Real-time Features Tests

- [ ] **Inventory Updates**
  - Open two browser windows
  - Update inventory in window 1
  - Verify update appears in window 2 within 2 seconds
  - Check cache is updated

- [ ] **Audit Logging**
  - Perform various operations
  - Check audit logs show actions
  - Verify timestamp, user, action, entity

- [ ] **Low Stock Alerts**
  - Set inventory below reorder point
  - Verify item appears in low stock list
  - Update inventory above threshold
  - Verify item removed from list

#### Searching and Filtering

- [ ] **Search Branches**
  - Create multiple branches
  - Search by branch code
  - Verify matching branches appear
  - Search by branch name
  - Verify correct results

- [ ] **Search Invoices**
  - Create multiple invoices
  - Search by invoice number
  - Search by customer name
  - Verify correct results

- [ ] **Filter Operations**
  - Filter invoices by date range
  - Filter by payment status
  - Filter by branch
  - Verify filters work correctly

#### Error Handling

- [ ] **Network Errors**
  - Disconnect internet
  - Try performing action
  - Verify error message shown
  - Reconnect
  - Verify retry works

- [ ] **Validation Errors**
  - Try creating branch without required fields
  - Verify error messages
  - Fix and retry
  - Verify success

- [ ] **Permission Errors**
  - Verify users can't access other users' data
  - Check RLS policies are working
  - Verify audit logs blocked access

---

## Unit Tests

### Setup Jest (Optional)

```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
```

### Example Test: Branch Service

Create `src/api/__tests__/supabase-branch-service.test.js`:

```javascript
import { getAllBranches, createBranch } from '../supabase-branch-service';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/supabase');

describe('Supabase Branch Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getAllBranches returns user branches', async () => {
    const mockBranches = [
      { id: '1', name: 'Branch 1', code: 'BR001' },
      { id: '2', name: 'Branch 2', code: 'BR002' },
    ];

    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: mockBranches,
        error: null,
      }),
    });

    const branches = await getAllBranches();
    expect(branches).toEqual(mockBranches);
  });

  test('createBranch creates new branch', async () => {
    const newBranch = { name: 'New Branch', code: 'BR003' };
    const createdBranch = { id: '3', ...newBranch };

    supabase.from.mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: createdBranch,
        error: null,
      }),
    });

    const result = await createBranch(newBranch);
    expect(result).toBe(createdBranch.id);
  });
});
```

Run tests:
```bash
npm test
```

---

## Integration Tests

### Test Supabase Connection

Create `tests/integration/supabase-connection.test.js`:

```javascript
import { supabase } from '../../src/lib/supabase';

describe('Supabase Connection', () => {
  test('can connect to Supabase', async () => {
    const { data, error } = await supabase.from('branches').select('count');
    expect(error).toBeNull();
  });

  test('RLS policies are enforced', async () => {
    // Test that unauthorized access is blocked
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .eq('user_id', 'different-user-id');
    
    // Should return empty or error based on RLS
    expect(data === null || data.length === 0).toBe(true);
  });
});
```

---

## Staging Deployment

### Deploy to Vercel Staging

1. **Push code to git:**
```bash
git add .
git commit -m "chore: Supabase migration complete"
git push origin connect-backend-to-supabase
```

2. **Create Pull Request:**
- Go to GitHub
- Create PR from `connect-backend-to-supabase` to `main`
- Add testing checklist to PR description

3. **Vercel Automatic Deployment:**
- Vercel automatically creates preview deployments for PRs
- Review deployment in PR details
- Share preview URL for testing

### Test on Staging

1. **Full User Flow Test:**
   - Login
   - Create branch
   - Add products
   - Create invoice
   - Process payment
   - Create return
   - Check audit logs

2. **Performance Testing:**
   - Measure invoice creation time (target: <1 second)
   - Measure query response times
   - Check for N+1 queries
   - Monitor database connections

3. **Load Testing:**
```bash
# Install ab (Apache Bench)
brew install httpd

# Test API endpoint
ab -n 1000 -c 10 https://staging-url.vercel.app/api/branches
```

4. **Check Logs:**
   - Vercel Dashboard → Function Logs
   - Check for errors
   - Check performance metrics
   - Verify audit logs are recording

### Data Validation

```javascript
// Quick validation script
const { data: branches } = await supabase.from('branches').select('count');
const { data: invoices } = await supabase.from('invoices').select('count');
const { data: logs } = await supabase.from('audit_logs').select('count');

console.log(`Branches: ${branches[0].count}`);
console.log(`Invoices: ${invoices[0].count}`);
console.log(`Audit Logs: ${logs[0].count}`);
```

---

## Production Deployment

### Pre-Production Checklist

- [ ] All tests passing
- [ ] Staging environment verified
- [ ] Performance acceptable
- [ ] Error handling working
- [ ] Audit logging functional
- [ ] RLS policies verified
- [ ] Backups configured
- [ ] Monitoring setup

### Deploy to Production

1. **Merge to Main:**
```bash
# Create final PR and merge to main
# Vercel automatically deploys main branch
```

2. **Monitor Deployment:**
   - Watch Vercel deployment logs
   - Check error rates in Sentry (if configured)
   - Monitor Supabase metrics

3. **Post-Deployment Verification:**
   - Test production environment
   - Verify data integrity
   - Check performance
   - Monitor error logs

### Rollback Plan

If issues occur:

```bash
# Revert to previous version
git revert <commit-hash>
git push origin main

# Vercel will auto-deploy the revert
# Monitor to confirm rollback successful
```

---

## Monitoring

### Setup Monitoring

#### Supabase Dashboard Metrics

1. **Go to Supabase Dashboard**
2. **Check:**
   - Database size and growth
   - Query performance
   - API request count
   - Real-time connections
   - Error rate

#### Application Error Tracking

Optional: Setup Sentry for error tracking

```javascript
// In main.jsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [new Sentry.Replay()],
});
```

#### Performance Monitoring

```javascript
// Log performance metrics
if (window.performance) {
  window.addEventListener('load', () => {
    const perfData = window.performance.timing;
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
    console.log('Page Load Time:', pageLoadTime);
  });
}
```

### Health Check

Create a health check endpoint or query:

```javascript
export async function checkHealth() {
  try {
    // Test database connection
    const { data, error } = await supabase
      .from('branches')
      .select('count', { count: 'exact' });
    
    if (error) throw error;
    
    return {
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}
```

### Alerting

Setup email alerts for:
- High error rates
- Database connection failures
- Slow queries
- Low disk space
- Backup failures

In Supabase: Settings → Billing → Email notifications

---

## Troubleshooting Production Issues

### Database Connection Errors

```
Error: "Too many connections"
```

**Solution:**
- Check connection pool settings in Supabase
- Increase max connections if needed
- Enable connection pooling

### Performance Degradation

```
Error: "Query timeout"
```

**Solution:**
- Check for slow queries in Supabase logs
- Add missing indexes
- Optimize N+1 queries

### Real-time Updates Not Working

```
Subscriptions not updating
```

**Solution:**
- Verify Realtime is enabled in Supabase
- Check firewall/WAF rules
- Restart subscription

### Data Inconsistency

```
Data doesn't match between reads
```

**Solution:**
- Check RLS policies
- Verify user assignments
- Check for concurrent writes
- Review transaction logic

---

## Performance Benchmarks

Target performance metrics:

| Operation | Target | Alert Threshold |
|---|---|---|
| Branch list load | <500ms | >1000ms |
| Invoice creation | <1s | >2s |
| Search query | <300ms | >1s |
| Page load | <2s | >4s |
| API response | <200ms | >500ms |

---

## Next Steps

1. Monitor metrics daily for first week
2. Gather user feedback
3. Optimize slow queries
4. Document any issues
5. Plan for scaling if needed

For issues, check:
- [Supabase Status](https://status.supabase.com)
- [Vercel Status](https://www.vercel-status.com)
- Application logs
- Error tracking service
