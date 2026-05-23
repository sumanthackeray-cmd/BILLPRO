# ⚠️ QUICK BUG REFERENCE - EasyBMT Runtime Issues

## 🔴 CRITICAL BUGS (App Crash Risk) - FIX IMMEDIATELY

### Bug #1: Speech Recognition Result Access
- **File:** `src/components/inventory/ProductForm.jsx` - Line 147
- **Problem:** `event.results[0][0].transcript` crashes if results are empty
- **Fix:** Add optional chaining: `event.results?.[0]?.[0]?.transcript`
- **Severity:** CRITICAL

### Bug #2: String Initials from Name
- **File:** `src/pages/POS.jsx` - Line 92
- **Problem:** `words[0][0]` crashes if word is empty string
- **Fix:** Filter empty words and check lengths before accessing
- **Severity:** CRITICAL

### Bug #3: Silent Promise Failures in Auth
- **File:** `src/lib/AuthContext.jsx` - Lines 125-128
- **Problem:** `.catch(e => { return []; })` silently returns empty data
- **Fix:** Throw error after logging, don't return empty array
- **Severity:** CRITICAL

### Bug #4: Window Reload Loses React State
- **File:** `src/hooks/useTenant.js` - Lines 30-31
- **Problem:** `window.location.reload()` called immediately after `setCurrentTenantId()`
- **Fix:** Use event dispatch and delay reload with `setTimeout`
- **Severity:** HIGH

---

## 🔴 HIGH PRIORITY BUGS

### Bug #5: Null ShopSettings
- **File:** `src/components/inventory/ProductForm.jsx` - Line 75
- **Problem:** `businessType` can be null but code assumes it's a string
- **Fix:** Provide default value: `settings?.[0]?.business_type || "retail"`

### Bug #6: Window Open Not Checked
- **File:** `src/components/inventory/ProductForm.jsx` - Lines 247-253
- **Problem:** `window.open()` can return null if blocked
- **Fix:** Check `if (!win) { toast.error(...); return; }`

### Bug #7: Missing useEffect Dependencies
- **File:** `src/pages/BranchManagement.jsx` - Line 41
- **Problem:** `loadBranches` function not in dependency array
- **Fix:** Include function in deps or use `useCallback`

### Bug #8: Silent Error Swallowing
- **File:** `src/components/layout/Sidebar.jsx` - Line 165
- **Problem:** `.catch(() => {})` hides errors from user
- **Fix:** Show toast error: `toast.error("Failed to load branches")`

---

## 🟠 MEDIUM-HIGH PRIORITY

### Bug #9: Print Window DOM Issues
- **File:** `src/pages/WarehouseManagement.jsx` - Lines 572, 629
- **Problem:** `win.document.write()` without null check or error handling
- **Fix:** Wrap in try-catch and verify window exists

### Bug #10: XSS Vulnerability
- **File:** `src/pages/SupermarketPOS.jsx` - Line 1803
- **Problem:** `dangerouslySetInnerHTML` with unsanitized HTML
- **Fix:** Use DOMPurify.sanitize() before rendering

---

## 🟠 MEDIUM PRIORITY

### Bug #11: Date Race Condition
- **File:** `src/pages/POS.jsx` - Line 300
- **Problem:** Uses current time if shift invoice date missing
- **Fix:** Use localStorage or hardcoded shift start time

### Bug #12: setState on Unmounted Component
- **File:** `src/pages/SupermarketPOS.jsx` - Lines 585-650
- **Problem:** Async operation calls setState after unmount
- **Fix:** Use `useEffect` cleanup or `isMounted` flag

### Bug #13: Type Validation Missing
- **File:** `src/pages/EnterpriseIntelligence.jsx` - Lines 284-306
- **Problem:** Math operations on unvalidated values can produce NaN
- **Fix:** Validate types: `if (typeof junVal !== 'number')`

---

## 📊 Statistics

| Severity | Count | Status |
|----------|-------|--------|
| 🔴 Critical | 4 | Not fixed |
| 🔴 High | 4 | Not fixed |
| 🟠 Medium-High | 2 | Not fixed |
| 🟠 Medium | 3 | Not fixed |
| **TOTAL** | **13** | **0 Fixed** |

---

## ✅ Testing Checklist

- [ ] Test with empty speech recognition results
- [ ] Test name with single word (< 2 words)
- [ ] Test with empty ShopSettings list
- [ ] Block popups and try printing
- [ ] Disconnect internet during async operations
- [ ] Rapidly click tenant switcher
- [ ] Check browser console for errors
- [ ] Test on mobile (popup blocking)

---

## 🎯 Recommended Fix Timeline

**Week 1:** Fix bugs #1-4 (critical crashes)  
**Week 2:** Fix bugs #5-8 (high priority)  
**Week 3:** Fix bugs #9-13 (medium priority)  

See `RUNTIME_BUGS_REPORT.md` for detailed fixes and code examples.
