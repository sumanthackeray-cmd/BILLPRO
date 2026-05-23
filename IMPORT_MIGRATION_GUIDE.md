# Import Migration Guide

This guide shows you how to update imports in your components to use Supabase services instead of Firebase.

## Quick Start

### Option 1: Use Service Adapter (Recommended for gradual migration)

The service adapter (`src/api/service-adapter.js`) provides a unified interface for both Firebase and Supabase. **No component changes required!**

```javascript
// Keep existing imports - they now work with Supabase
import { BranchService, POSService, AuditService, InventoryService } from './api/service-adapter';

// Use exactly the same way as before
const branches = await BranchService.getAllBranches();
```

### Option 2: Direct Supabase Services (recommended for new code)

If you're building new features, use the Supabase services directly:

```javascript
import { createBranch, getAllBranches } from './api/supabase-branch-service';

// Same function signatures as Firebase
const branches = await getAllBranches();
```

---

## Service Mapping Reference

### Branch Service

**Import:**
```javascript
// Old (Firebase)
import { createBranch, getBranch, getAllBranches } from './api/branchService';

// New (Supabase) - Option 1: Use adapter
import { BranchService } from './api/service-adapter';
await BranchService.getAllBranches();

// New (Supabase) - Option 2: Direct import
import { getAllBranches } from './api/supabase-branch-service';
await getAllBranches();
```

**Available Functions:**
```javascript
// Core functions - same interface
createBranch(branchData)          // Create new branch
getBranch(branchId)              // Get single branch
getAllBranches()                 // Get all user's branches
getCachedBranches()              // Get cached branches
updateBranch(branchId, updates)  // Update branch
deactivateBranch(branchId)       // Soft delete branch
getBranchSettings(branchId)      // Get branch settings
updateBranchSettings(branchId, settings)  // Update settings

// New Supabase functions
searchBranches(query)            // Search branches
getBranchByCode(code)            // Get branch by code
invalidateBranchCache()          // Clear cache
```

---

### POS Service

**Import:**
```javascript
// Old (Firebase)
import { createInvoice, getInvoice, getBranchInvoices } from './api/posService';

// New (Supabase) - Use adapter
import { POSService } from './api/service-adapter';
await POSService.createInvoice(invoiceData);

// New (Supabase) - Direct import
import { createInvoice } from './api/supabase-pos-service';
```

**Available Functions:**
```javascript
createInvoice(invoiceData)       // Create new invoice
getInvoice(invoiceId)            // Get invoice details
getInvoiceByNumber(invoiceNumber) // Get by invoice number
getBranchInvoices(branchId, limit, offset) // List invoices
addInvoiceItem(invoiceId, item)  // Add line item
recordPayment(invoiceId, payment) // Record payment
updateInvoiceStatus(invoiceId, status) // Change status
createReturn(returnData)         // Create return
getBranchReturns(branchId)       // Get returns
updateReturnStatus(returnId, status) // Update return
voidInvoice(invoiceId)           // Void invoice

// New Supabase functions
getInvoiceCount(branchId, startDate, endDate) // Count invoices
getDailySalesTotal(branchId, date) // Get daily total
searchInvoices(branchId, query)   // Search invoices
```

---

### Audit Logging Service

**Import:**
```javascript
// Old (Firebase)
import { logAuditAction, getEntityAuditLogs } from './api/auditLogging';

// New (Supabase) - Use adapter
import { AuditService } from './api/service-adapter';
await AuditService.logAuditAction(auditData);

// New (Supabase) - Direct import
import { logAuditAction } from './api/supabase-audit-logging';
```

**Available Functions:**
```javascript
logAuditAction(auditData)        // Log action
getEntityAuditLogs(type, id, limit) // Get entity logs
getUserAuditLogs(userId, branchId, limit) // Get user logs
getBranchAuditLogs(branchId, limit) // Get branch logs

// Convenience logging functions
logInvoiceCreated(invoiceId, branchId, userId, total)
logInventoryAdjusted(productId, branchId, quantityChange, reason)
logPurchaseOrderApproved(poId, branchId, userId, amount)
logProductPriceChange(productId, branchId, userId, oldPrice, newPrice)
logAccessDenied(userId, branchId, resource, reason)
logPaymentReceived(invoiceId, branchId, amount, method)
logReturnCreated(returnId, branchId, originalInvoiceId, amount)
logUserLogin(userId, branchId)
logUserLogout(userId, branchId)

// Advanced functions
getAuditLogsWithFilters(filters) // Custom filter query
exportAuditLogs(branchId, startDate, endDate) // Export for reports
```

---

### Inventory Service

**Import:**
```javascript
// Old (Firebase)
import { getInventory, getBranchInventory } from './api/inventorySyncService';

// New (Supabase) - Use adapter
import { InventoryService } from './api/service-adapter';
await InventoryService.getInventory(productId, branchId);

// New (Supabase) - Direct import
import { getInventory } from './api/supabase-inventory-service';
```

**Available Functions:**
```javascript
getInventory(productId, branchId) // Get item inventory
getBranchInventory(branchId)     // Get all branch inventory
updateInventory(productId, branchId, quantityDelta, reason) // Update quantity
subscribeToProductInventory(productId, callback) // Real-time updates
subscribeToBranchInventory(branchId, callback) // Real-time updates
getLowStockItems(branchId)       // Get items below reorder point

// New Supabase functions
getBatchInventory(productIds, branchId) // Batch get
createBatchInventory(batchData)  // Create batch record
getBatchInventoryItems(branchId) // Get batch items
updateBatchStatus(batchId, status) // Update batch
unsubscribeFromInventory(key)    // Stop subscription
clearInventoryCache()            // Clear cache
getInventoryAnalytics(branchId, daysBack) // Get analytics
```

---

### Authentication Service

**Import:**
```javascript
// Old (Firebase)
import { auth, db } from './firebase/config';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

// New (Supabase) - Use adapter
import { AuthService } from './api/service-adapter';
await AuthService.signInWithGoogle();

// New (Supabase) - Direct import
import { signInWithGoogle } from './api/supabase-auth';
```

**Available Functions:**
```javascript
getCurrentUser()                 // Get current user object
getCurrentUserAsync()            // Async version with fresh data
signInWithGoogle()              // OAuth sign in
signInWithEmail(email, password) // Email/password sign in
signUpWithEmail(email, password, userData) // Email/password signup
signOut()                       // Sign out
resetPassword(email)            // Send reset email
updatePassword(newPassword)     // Update password
updateUserMetadata(metadata)    // Update user data

// User profile functions
getUserProfile(userId)          // Get user profile from DB
upsertUserProfile(userId, data) // Create/update profile
assignUserToBranch(userId, branchId) // Assign to branch
getUserAssignedBranches(userId) // Get assigned branches

// Initialization
initializeAuth()                // Initialize auth on app startup
```

---

## Component Update Examples

### Example 1: Branch Management Component

**Before (Firebase):**
```javascript
import { getAllBranches, createBranch } from '../api/branchService';

export function BranchManager() {
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    const loadBranches = async () => {
      const allBranches = await getAllBranches();
      setBranches(allBranches);
    };
    loadBranches();
  }, []);

  const handleCreateBranch = async (data) => {
    await createBranch(data);
    // Reload branches...
  };
}
```

**After (Supabase) - Option 1: Service Adapter (No changes!):**
```javascript
// Same code - just works with Supabase now!
import { BranchService } from '../api/service-adapter';

export function BranchManager() {
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    const loadBranches = async () => {
      // Works exactly the same with service adapter
      const allBranches = await BranchService.getAllBranches();
      setBranches(allBranches);
    };
    loadBranches();
  }, []);

  const handleCreateBranch = async (data) => {
    await BranchService.createBranch(data);
    // Reload branches...
  };
}
```

**After (Supabase) - Option 2: Direct Import:**
```javascript
import { getAllBranches, createBranch } from '../api/supabase-branch-service';

// Everything else stays the same!
export function BranchManager() {
  // ... identical code
}
```

---

### Example 2: POS Invoice Component

**Before (Firebase):**
```javascript
import { createInvoice, recordPayment } from '../api/posService';

async function handleCheckout() {
  const invoice = await createInvoice(invoiceData);
  await recordPayment(invoice.id, paymentData);
}
```

**After (Supabase):**
```javascript
// Option 1: Service Adapter
import { POSService } from '../api/service-adapter';

async function handleCheckout() {
  const invoice = await POSService.createInvoice(invoiceData);
  await POSService.recordPayment(invoice.id, paymentData);
}

// Option 2: Direct Import - same signatures!
import { createInvoice, recordPayment } from '../api/supabase-pos-service';

async function handleCheckout() {
  const invoice = await createInvoice(invoiceData);
  await recordPayment(invoice.id, paymentData);
}
```

---

### Example 3: Real-time Inventory Subscription

**Before (Firebase):**
```javascript
import { subscribeToBranchInventory } from '../api/inventorySyncService';

useEffect(() => {
  const unsubscribe = subscribeToBranchInventory(branchId, (inventory) => {
    setInventory(inventory);
  });
  
  return () => unsubscribe();
}, [branchId]);
```

**After (Supabase) - Works the same:**
```javascript
import { InventoryService } from '../api/service-adapter';

useEffect(() => {
  const unsubscribe = InventoryService.subscribeToBranchInventory(branchId, (inventory) => {
    setInventory(inventory);
  });
  
  return () => unsubscribe();
}, [branchId]);
```

---

## Migration Strategy

### Phase 1: Preparation
- Copy `.env.example` to `.env.local`
- Fill in Supabase credentials
- Keep `VITE_BACKEND=supabase`

### Phase 2: Drop-in Replacement (No code changes!)
- Everything works with the service adapter
- No changes required to existing components
- Run tests to verify functionality

### Phase 3: Optional Direct Imports
- For new code, use direct Supabase imports
- Gradually refactor existing components
- Remove Firebase imports when no longer needed

### Phase 4: Cleanup
- Remove Firebase dependencies
- Delete Firebase configuration files
- Update documentation

---

## Testing Checklist

- [ ] Authentication works (Google OAuth, Email/Password)
- [ ] Branches load and save correctly
- [ ] Invoices create and process payments
- [ ] Inventory updates in real-time
- [ ] Audit logs record correctly
- [ ] Search and filters work
- [ ] Batch operations work
- [ ] No console errors

---

## Troubleshooting

### Issue: "Function not found"
Check you're importing from the correct service module.

### Issue: "Data types don't match"
Supabase returns snake_case fields. Use the adapter to handle this automatically.

### Issue: "Real-time updates not working"
Ensure `initializeInventorySubscriptions()` is called in App.jsx startup.

### Issue: "Auth not persisting"
Call `initializeAuth()` in your App's useEffect on load.

---

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Service Adapter Source](./src/api/service-adapter.js)
- [Migration Guide](./SUPABASE_MIGRATION_GUIDE.md)
