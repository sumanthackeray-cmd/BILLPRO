# MNC/SAP Upgrade Roadmap (Phase 1)

## Phase 1 (Correctness foundations)
1. **Query-level RBAC enforcement (started)**
   - Inspect `firebase/firestore.rules` and tenant/branch guards.
   - ✅ Add branch-level row security in `firebase/firestore.rules` using `/companies/{companyId}/users/{uid}.branch_id`.
   - Ensure every read/write is scoped by `companyId` + `branchId` at the rules/query layer (not just UI).
   - Align `src/utils/rbac.js` with rule/permission checks used by data access layer.

2. **Append-only Inventory Journal + stock projection**
   - Add new collection/model: `inventoryMovements` (append-only).
   - Stock becomes a **computed projection** (or a `inventoryProjection` document) updated atomically.
   - Add `idempotencyKey` per movement for offline retry safety.

3. **Atomic/versioned inventory posting**
   - Implement `runTransaction()` posting that:
     - validates availability / batch/expiry constraints (initial: quantity only),
     - updates stock projection using compare-and-set on version (`stockVersion`),
     - prevents negative stock at posting time.

4. **Double-entry ledger posting**
   - Ensure every business event (sale, return, stock movement, purchase, adjustment) posts to:
     - append-only `journalEntries` / ledger accounts.
   - Ensure Trial Balance reads ONLY from ledger/journal (single source of truth).

5. **Wire call sites to the new posting layer**
   - Update:
     - `src/api/posService.js` (create bill, void, return)
     - `src/api/inventorySyncService.js` (inventory changes)
     - any GRN/purchase/stock transfer paths
   - Remove any direct “stock quantity update” calls bypassing the journal/projection.

6. **Audit logging coverage for mutations**
   - Ensure every inventory/ledger posting writes an audit event including `{old,new}`.
   - Extend `src/api/auditLogging.js` if needed to support hash-chain/anchoring (Phase 1 minimum: full before/after + append-only semantics).

## Phase 2 (after Phase 1)
- Offline-first WAL + idempotency keys + conflict resolution + reconciliation UI
- UX enterprise modal/dropdown portal hardening
- Sentry + observability dashboards
- Playwright/Cypress + unit/contract tests
