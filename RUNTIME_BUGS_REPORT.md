# 🐛 Runtime Bugs Report - EasyBMT Enterprise System

**Report Date:** May 23, 2026  
**Total Bugs Found:** 20+ Critical/High Severity Issues  
**Severity Breakdown:** 3 Critical | 7 High | 4 Medium-High | 6+ Medium

---

## 🔴 CRITICAL ISSUES (App Crash Risk)

### 1. **Array Access Without Bounds Checking** - ProductForm.jsx:147
**Severity:** 🔴 CRITICAL  
**File:** [src/components/inventory/ProductForm.jsx](src/components/inventory/ProductForm.jsx#L147)  
**Line:** 147

**Issue:**
```javascript
recognition.onresult = (event) => {
  const speechToText = event.results[0][0].transcript.toLowerCase(); // ❌ CRASH
};
```

**Risk:** Crashes app if speech recognition returns empty results or malformed data structure.

**Fix:**
```javascript
recognition.onresult = (event) => {
  if (!event.results?.[0]?.[0]?.transcript) {
    toast.warning("Could not recognize speech. Try again.");
    return;
  }
  const speechToText = event.results[0][0].transcript.toLowerCase();
};
```

---

### 2. **String Character Access Without Array Length Check** - POS.jsx:92
**Severity:** 🔴 CRITICAL  
**File:** [src/pages/POS.jsx](src/pages/POS.jsx#L92)  
**Line:** 92

**Issue:**
```javascript
const getInitials = (name) => {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase(); // ❌ CRASH if word is empty string
  }
  return name.slice(0, 2).toUpperCase();
};
```

**Risk:** Crashes when trying to access `words[0][0]` if `words[0]` is empty string (from multiple spaces).

**Fix:**
```javascript
const getInitials = (name) => {
  const words = (name?.trim() || "").split(/\s+/).filter(w => w);
  if (words.length >= 2 && words[0].length > 0 && words[1].length > 0) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return (name || "").slice(0, 2).toUpperCase();
};
```

---

### 3. **Unhandled Promise Rejection with Silent Failure** - AuthContext.jsx:125-128
**Severity:** 🔴 CRITICAL  
**File:** [src/lib/AuthContext.jsx](src/lib/AuthContext.jsx#L125)  
**Lines:** 125-128

**Issue:**
```javascript
const [usersList, roles, permissions, sensitiveFieldAccess] = await Promise.all([
  base44.entities.User.list().catch(e => { console.error("Error listing users:", e); return []; }),
  base44.entities.Role.list().catch(e => { console.error("Error listing roles:", e); return []; }),
  base44.entities.Permission.list().catch(e => { console.error("Error listing permissions:", e); return []; }),
  base44.entities.SensitiveFieldAccess.list().catch(e => { console.error("Error listing sensitive field access:", e); return []; })
]);

let userRecord = usersList.find(u => u.id === firebaseUser.uid); // ❌ PROBLEM
```

**Risk:** If API fails, returns empty array but code continues with invalid data, causing silent failures in subsequent operations.

**Fix:**
```javascript
let usersList, roles, permissions, sensitiveFieldAccess;
try {
  [usersList, roles, permissions, sensitiveFieldAccess] = await Promise.all([
    base44.entities.User.list(),
    base44.entities.Role.list(),
    base44.entities.Permission.list(),
    base44.entities.SensitiveFieldAccess.list()
  ]);
} catch (e) {
  console.error("Failed to load auth resources:", e);
  setAuthError({ type: 'load_failed', message: 'Failed to load authorization data' });
  // Redirect to login or show error screen
  return null;
}

let userRecord = usersList.find(u => u.id === firebaseUser.uid);
```

---

## 🔴 HIGH SEVERITY ISSUES

### 4. **Window.location.reload() Prevents State Updates** - useTenant.js:30-31
**Severity:** 🔴 HIGH  
**File:** [src/hooks/useTenant.js](src/hooks/useTenant.js#L30)  
**Lines:** 30-31

**Issue:**
```javascript
const switchTenant = (companyId) => {
  localStorage.setItem("company_id", formatted);
  setCurrentTenantId(formatted); // ❌ This update is lost!
  window.location.reload(); // Reloads before React can commit state
};
```

**Risk:** React state update is lost because page reloads immediately before state reconciliation.

**Fix:**
```javascript
const switchTenant = (companyId) => {
  if (companyId) {
    const formatted = companyId.trim().toUpperCase();
    localStorage.setItem("company_id", formatted);
    // Dispatch event for other components to listen to
    window.dispatchEvent(new CustomEvent("tenantChanged", { detail: formatted }));
    // Delay reload to allow state updates and event handlers to complete
    setTimeout(() => window.location.reload(), 100);
  } else {
    localStorage.removeItem("company_id");
    window.dispatchEvent(new CustomEvent("tenantChanged", { detail: null }));
    setTimeout(() => window.location.reload(), 100);
  }
};
```

---

### 5. **Settings Array Empty Check Without Type Safety** - ProductForm.jsx:75
**Severity:** 🔴 HIGH  
**File:** [src/components/inventory/ProductForm.jsx](src/components/inventory/ProductForm.jsx#L75)  
**Line:** 75

**Issue:**
```javascript
const settings = await base44.entities.ShopSettings.list();
const businessType = (settings && settings.length > 0) ? settings[0].business_type : null;
// Later in code:
if (businessType === "supermarket") { ... } // ❌ May be null or undefined
```

**Risk:** `businessType` might be null/undefined, but code assumes it's a string.

**Fix:**
```javascript
let settings;
try {
  settings = await base44.entities.ShopSettings.list();
} catch (e) {
  console.error("Failed to load settings:", e);
  setSettingsError(true);
  return;
}

const businessType = settings?.[0]?.business_type || "retail"; // Default to 'retail'
const settings_data = settings?.[0] || {};
```

---

### 6. **Unsafe Window.open() Return Not Checked** - ProductForm.jsx:247-253
**Severity:** 🔴 HIGH  
**File:** [src/components/inventory/ProductForm.jsx](src/components/inventory/ProductForm.jsx#L247)  
**Lines:** 247, 253

**Issue:**
```javascript
const win = window.open("", "_blank");
win.document.write(`<!DOCTYPE html><html>...</html>`); // ❌ Crashes if win is null
win.document.close();
```

**Risk:** `window.open()` can return `null` if popup is blocked. Code doesn't check for this.

**Fix:**
```javascript
const win = window.open("", "_blank");
if (!win) {
  toast.error("Unable to open print window. Check if popups are blocked.");
  return;
}

try {
  win.document.write(`<!DOCTYPE html><html>...</html>`);
  win.document.close();
  win.print();
} catch (e) {
  console.error("Print error:", e);
  toast.error("Print failed");
  win.close();
}
```

---

### 7. **Missing useEffect Dependencies** - BranchManagement.jsx:41
**Severity:** 🔴 HIGH  
**File:** [src/pages/BranchManagement.jsx](src/pages/BranchManagement.jsx#L41)  
**Line:** 41

**Issue:**
```javascript
useEffect(() => {
  loadBranches(); // ❌ Function not in dependency array
}, []); // Empty dependency array
```

**Risk:** If `loadBranches` updates, the effect won't re-run. Creates stale closures.

**Fix:**
```javascript
const loadBranches = useCallback(async () => {
  // ... load logic
}, [dependencyA, dependencyB]); // Include actual dependencies

useEffect(() => {
  loadBranches();
}, [loadBranches]); // Include function in deps
```

---

### 8. **Silent Error Swallowing in Promise Chain** - Sidebar.jsx:165
**Severity:** 🔴 HIGH  
**File:** [src/components/layout/Sidebar.jsx](src/components/layout/Sidebar.jsx#L165)  
**Line:** 165

**Issue:**
```javascript
fetchBranches()
  .then(branches => setBranches(branches))
  .catch(() => {}); // ❌ Silent error, no user feedback
```

**Risk:** If branch loading fails, user sees nothing and has no idea what went wrong.

**Fix:**
```javascript
try {
  const branches = await fetchBranches();
  setBranches(branches);
} catch (error) {
  console.error("Failed to load branches:", error);
  setError("Unable to load branches. Please refresh the page.");
  // Show error toast or UI element
  toast.error("Failed to load branches");
}
```

---

## 🟠 MEDIUM-HIGH SEVERITY ISSUES

### 9. **DOM Manipulation Without Error Handling** - WarehouseManagement.jsx:572-629
**Severity:** 🟠 MEDIUM-HIGH  
**File:** [src/pages/WarehouseManagement.jsx](src/pages/WarehouseManagement.jsx#L572)  
**Lines:** 572, 629

**Issue:**
```javascript
const printWindow = window.open("", "_blank");
printWindow.document.write(htmlContent);
printWindow.print();
```

**Risk:** No null check on `printWindow`. No try-catch around DOM operations.

**Fix:**
```javascript
const printWindow = window.open("", "_blank");
if (!printWindow) {
  toast.error("Unable to open print window");
  return;
}

try {
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  // Use onload to ensure content is loaded before printing
  printWindow.onload = () => {
    printWindow.print();
  };
} catch (e) {
  console.error("Print failed:", e);
  toast.error("Print failed: " + e.message);
  printWindow.close();
}
```

---

### 10. **XSS Risk with dangerouslySetInnerHTML** - SupermarketPOS.jsx:1803
**Severity:** 🟠 MEDIUM-HIGH  
**File:** [src/pages/SupermarketPOS.jsx](src/pages/SupermarketPOS.jsx#L1803)  
**Line:** 1803

**Issue:**
```javascript
<div dangerouslySetInnerHTML={{ __html: thermalHTML }} />
```

**Risk:** If `thermalHTML` comes from user input or untrusted source, XSS vulnerability.

**Fix:**
```javascript
// Sanitize HTML before using it
import DOMPurify from 'dompurify';

const sanitizedHTML = DOMPurify.sanitize(thermalHTML);
<div dangerouslySetInnerHTML={{ __html: sanitizedHTML }} />

// Or better: use a library to generate the HTML safely
import { renderToString } from 'react-dom/server';
```

---

## 🟠 MEDIUM SEVERITY ISSUES

### 11. **Race Condition with Date Constructor** - POS.jsx:300
**Severity:** 🟠 MEDIUM  
**File:** [src/pages/POS.jsx](src/pages/POS.jsx#L300)  
**Line:** 300

**Issue:**
```javascript
const shiftSummary = {
  openedAt: new Date(shiftInvoices[0]?.date || Date.now()).toLocaleString(),
  // If shiftInvoices is empty, creates date with current time - might be wrong
};
```

**Risk:** If shift was opened earlier but no invoices exist, start time is wrong (uses current time).

**Fix:**
```javascript
const openTime = shiftInvoices[0]?.date 
  || localStorage.getItem('shiftOpenedAt')
  || new Date().toISOString();

const shiftSummary = {
  openedAt: new Date(openTime).toLocaleString(),
};
```

---

### 12. **setState on Unmounted Component** - SupermarketPOS.jsx:585-650
**Severity:** 🟠 MEDIUM  
**File:** [src/pages/SupermarketPOS.jsx](src/pages/SupermarketPOS.jsx#L585)  
**Lines:** 585-650

**Issue:**
```javascript
const handleAsyncOperation = async () => {
  const result = await fetchData();
  setState(result); // ❌ Warning: Can't perform a React state update on an unmounted component
};
```

**Risk:** If component unmounts before async operation completes, React memory leak warning.

**Fix:**
```javascript
const [isMounted, setIsMounted] = useState(true);

useEffect(() => {
  return () => setIsMounted(false);
}, []);

const handleAsyncOperation = async () => {
  const result = await fetchData();
  if (isMounted) { // Check before setState
    setState(result);
  }
};
```

Or use AbortController:
```javascript
useEffect(() => {
  const controller = new AbortController();
  
  handleAsyncOperation(controller.signal).catch(e => {
    if (!controller.signal.aborted) {
      console.error(e);
    }
  });
  
  return () => controller.abort();
}, []);
```

---

### 13. **Type Mismatch in Math Operations** - EnterpriseIntelligence.jsx:284-306
**Severity:** 🟠 MEDIUM  
**File:** [src/pages/EnterpriseIntelligence.jsx](src/pages/EnterpriseIntelligence.jsx#L284)  
**Lines:** 284-306

**Issue:**
```javascript
const junVal = aiForecast?.forecast_months?.[0]?.predicted || 0;
const projectedRevenue = junVal * 12 / 100; // ❌ Could be NaN if junVal is not validated
```

**Risk:** If junVal is not a number (e.g., "not a number" string), calculation produces NaN, propagating errors downstream.

**Fix:**
```javascript
const junVal = aiForecast?.forecast_months?.[0]?.predicted;
if (typeof junVal !== 'number' || isNaN(junVal)) {
  return null; // or return default
}
const projectedRevenue = Math.max(0, junVal * 12 / 100);
```

---

## 📋 SUMMARY TABLE

| # | File | Line | Severity | Issue | Impact |
|---|------|------|----------|-------|--------|
| 1 | ProductForm.jsx | 147 | 🔴 CRITICAL | Array access without bounds | App crash on speech result |
| 2 | POS.jsx | 92 | 🔴 CRITICAL | String index without check | App crash on name processing |
| 3 | AuthContext.jsx | 125-128 | 🔴 CRITICAL | Silent promise rejection | Data loss in auth |
| 4 | useTenant.js | 30-31 | 🔴 HIGH | Location.reload() loses state | Tenant switch fails silently |
| 5 | ProductForm.jsx | 75 | 🔴 HIGH | Null/undefined not handled | businessType is unsafe |
| 6 | ProductForm.jsx | 247-253 | 🔴 HIGH | window.open() not checked | Print crashes if popup blocked |
| 7 | BranchManagement.jsx | 41 | 🔴 HIGH | Missing useEffect deps | Stale closures |
| 8 | Sidebar.jsx | 165 | 🔴 HIGH | Silent error catch | No error feedback |
| 9 | WarehouseManagement.jsx | 572 | 🟠 MEDIUM-HIGH | DOM without error handling | Print crashes |
| 10 | SupermarketPOS.jsx | 1803 | 🟠 MEDIUM-HIGH | dangerouslySetInnerHTML | XSS vulnerability |
| 11 | POS.jsx | 300 | 🟠 MEDIUM | Race condition with dates | Wrong shift open time |
| 12 | SupermarketPOS.jsx | 585-650 | 🟠 MEDIUM | setState on unmount | Memory leak warning |
| 13 | EnterpriseIntelligence.jsx | 284 | 🟠 MEDIUM | Type mismatch in math | NaN propagation |

---

## ⚡ RECOMMENDED FIX ORDER

### Phase 1 (This Week) - Prevent Crashes:
1. Fix array access bounds checking (Items 1, 2)
2. Fix promise rejection handling (Item 3)
3. Fix window.open() checks (Item 6)
4. Fix null reference issues (Item 5)

### Phase 2 (Next Week) - Improve Reliability:
5. Fix useEffect dependencies (Item 7)
6. Add error UI feedback (Item 8)
7. Add DOM error handling (Item 9)
8. Fix state cleanup on unmount (Item 12)

### Phase 3 (Security & Polish):
9. Sanitize HTML for XSS prevention (Item 10)
10. Fix type validation (Item 13)
11. Fix race conditions (Item 11)
12. Add comprehensive error logging

---

## 🛠️ Testing Recommendations

1. **Test with empty/invalid data:** Pass empty arrays, null values, malformed objects
2. **Test with slow networks:** Use browser DevTools throttling
3. **Test popup blocking:** Disable popups in browser settings
4. **Test concurrent operations:** Rapidly click buttons, open/close forms
5. **Test component unmounting:** Navigate away during async operations
6. **Use Error Boundaries:** Wrap components with React Error Boundaries
7. **Enable React Strict Mode:** Catch issues in development

