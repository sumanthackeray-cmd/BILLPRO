-- ============================================================================
-- Row-Level Security (RLS) Policies for Multi-Tenancy
-- Ensures each company can ONLY see and modify their own data
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensitive_field_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- COMPANIES TABLE POLICIES
-- ============================================================================
CREATE POLICY "Companies: Own company only" ON companies
  FOR SELECT USING (
    auth.uid()::text IN (
      SELECT users.auth_id FROM users 
      WHERE users.company_id = companies.id
    )
  );

CREATE POLICY "Companies: Prevent direct updates" ON companies
  FOR UPDATE USING (FALSE);

-- ============================================================================
-- USERS TABLE POLICIES
-- Company isolation: Users can only see other users in their company
-- ============================================================================
CREATE POLICY "Users: View own company users" ON users
  FOR SELECT USING (
    company_id = (
      SELECT company_id FROM users 
      WHERE auth_id = auth.uid()::text LIMIT 1
    )
  );

CREATE POLICY "Users: Company owner can update users" ON users
  FOR UPDATE USING (
    company_id = (
      SELECT company_id FROM users 
      WHERE auth_id = auth.uid()::text LIMIT 1
    )
    AND (
      SELECT role_id FROM users 
      WHERE auth_id = auth.uid()::text LIMIT 1
    ) IN ('role-owner', 'role-ceo')
  );

CREATE POLICY "Users: Insert users in own company" ON users
  FOR INSERT WITH CHECK (
    company_id = (
      SELECT company_id FROM users 
      WHERE auth_id = auth.uid()::text LIMIT 1
    )
  );

CREATE POLICY "Users: Owner can delete users" ON users
  FOR DELETE USING (
    company_id = (
      SELECT company_id FROM users 
      WHERE auth_id = auth.uid()::text LIMIT 1
    )
    AND (
      SELECT role_id FROM users 
      WHERE auth_id = auth.uid()::text LIMIT 1
    ) = 'role-owner'
  );

-- ============================================================================
-- BRANCHES TABLE POLICIES
-- Company isolation with role-based access
-- ============================================================================
CREATE POLICY "Branches: View own company branches" ON branches
  FOR SELECT USING (
    company_id = (
      SELECT company_id FROM users 
      WHERE auth_id = auth.uid()::text LIMIT 1
    )
  );

CREATE POLICY "Branches: Create/Update branches" ON branches
  FOR UPDATE USING (
    company_id = (
      SELECT company_id FROM users 
      WHERE auth_id = auth.uid()::text LIMIT 1
    )
    AND (
      SELECT role_id FROM users 
      WHERE auth_id = auth.uid()::text LIMIT 1
    ) IN ('role-owner', 'role-ceo', 'role-store_manager')
  );

CREATE POLICY "Branches: Insert branches in own company" ON branches
  FOR INSERT WITH CHECK (
    company_id = (
      SELECT company_id FROM users 
      WHERE auth_id = auth.uid()::text LIMIT 1
    )
  );

-- ============================================================================
-- INVOICES TABLE POLICIES
-- Strict company isolation + role-based access
-- ============================================================================
CREATE POLICY "Invoices: View own company invoices" ON invoices
  FOR SELECT USING (
    company_id = (
      SELECT company_id FROM users 
      WHERE auth_id = auth.uid()::text LIMIT 1
    )
  );

CREATE POLICY "Invoices: Create invoices in own company" ON invoices
  FOR INSERT WITH CHECK (
    company_id = (
      SELECT company_id FROM users 
      WHERE auth_id = auth.uid()::text LIMIT 1
    )
  );

CREATE POLICY "Invoices: Update own company invoices" ON invoices
  FOR UPDATE USING (
    company_id = (
      SELECT company_id FROM users 
      WHERE auth_id = auth.uid()::text LIMIT 1
    )
    AND (
      SELECT role_id FROM users 
      WHERE auth_id = auth.uid()::text LIMIT 1
    ) IN ('role-owner', 'role-ceo', 'role-store_manager', 'role-cashier')
  );

CREATE POLICY "Invoices: Delete own company invoices" ON invoices
  FOR DELETE USING (
    company_id = (
      SELECT company_id FROM users 
      WHERE auth_id = auth.uid()::text LIMIT 1
    )
    AND (
      SELECT role_id FROM users 
      WHERE auth_id = auth.uid()::text LIMIT 1
    ) IN ('role-owner', 'role-ceo')
  );

-- ============================================================================
-- INVOICE_ITEMS TABLE POLICIES
-- Cascade from invoices
-- ============================================================================
CREATE POLICY "Invoice Items: View own company items" ON invoice_items
  FOR SELECT USING (
    invoice_id IN (
      SELECT id FROM invoices 
      WHERE company_id = (
        SELECT company_id FROM users 
        WHERE auth_id = auth.uid()::text LIMIT 1
      )
    )
  );

CREATE POLICY "Invoice Items: Create items in own invoices" ON invoice_items
  FOR INSERT WITH CHECK (
    invoice_id IN (
      SELECT id FROM invoices 
      WHERE company_id = (
        SELECT company_id FROM users 
        WHERE auth_id = auth.uid()::text LIMIT 1
      )
    )
  );

CREATE POLICY "Invoice Items: Update own invoice items" ON invoice_items
  FOR UPDATE USING (
    invoice_id IN (
      SELECT id FROM invoices 
      WHERE company_id = (
        SELECT company_id FROM users 
        WHERE auth_id = auth.uid()::text LIMIT 1
      )
    )
  );

-- ============================================================================
-- ITEMS TABLE POLICIES
-- Company isolation for product/item masters
-- ============================================================================
CREATE POLICY "Items: View own company items" ON items
  FOR SELECT USING (
    company_id = (
      SELECT company_id FROM users 
      WHERE auth_id = auth.uid()::text LIMIT 1
    )
  );

CREATE POLICY "Items: Create items in own company" ON items
  FOR INSERT WITH CHECK (
    company_id = (
      SELECT company_id FROM users 
      WHERE auth_id = auth.uid()::text LIMIT 1
    )
  );

CREATE POLICY "Items: Update own company items" ON items
  FOR UPDATE USING (
    company_id = (
      SELECT company_id FROM users 
      WHERE auth_id = auth.uid()::text LIMIT 1
    )
  );

-- ============================================================================
-- INVENTORY TABLE POLICIES
-- Stock levels isolated by company
-- ============================================================================
CREATE POLICY "Inventory: View own company inventory" ON inventory
  FOR SELECT USING (
    company_id = (
      SELECT company_id FROM users 
      WHERE auth_id = auth.uid()::text LIMIT 1
    )
  );

CREATE POLICY "Inventory: Update own company inventory" ON inventory
  FOR UPDATE USING (
    company_id = (
      SELECT company_id FROM users 
      WHERE auth_id = auth.uid()::text LIMIT 1
    )
    AND (
      SELECT role_id FROM users 
      WHERE auth_id = auth.uid()::text LIMIT 1
    ) IN ('role-owner', 'role-ceo', 'role-warehouse_manager', 'role-store_manager')
  );

-- ============================================================================
-- PAYMENTS TABLE POLICIES
-- Payment records isolated by company
-- ============================================================================
CREATE POLICY "Payments: View own company payments" ON payments
  FOR SELECT USING (
    company_id = (
      SELECT company_id FROM users 
      WHERE auth_id = auth.uid()::text LIMIT 1
    )
  );

CREATE POLICY "Payments: Create payments in own company" ON payments
  FOR INSERT WITH CHECK (
    company_id = (
      SELECT company_id FROM users 
      WHERE auth_id = auth.uid()::text LIMIT 1
    )
  );

-- ============================================================================
-- AUDIT_LOGS TABLE POLICIES
-- Audit logs isolated by company - read-only for normal users
-- ============================================================================
CREATE POLICY "Audit Logs: View own company logs" ON audit_logs
  FOR SELECT USING (
    company_id = (
      SELECT company_id FROM users 
      WHERE auth_id = auth.uid()::text LIMIT 1
    )
  );

CREATE POLICY "Audit Logs: Insert own company logs" ON audit_logs
  FOR INSERT WITH CHECK (
    company_id = (
      SELECT company_id FROM users 
      WHERE auth_id = auth.uid()::text LIMIT 1
    )
  );

-- ============================================================================
-- RETURNS TABLE POLICIES
-- Return records isolated by company
-- ============================================================================
CREATE POLICY "Returns: View own company returns" ON returns
  FOR SELECT USING (
    company_id = (
      SELECT company_id FROM users 
      WHERE auth_id = auth.uid()::text LIMIT 1
    )
  );

CREATE POLICY "Returns: Create returns in own company" ON returns
  FOR INSERT WITH CHECK (
    company_id = (
      SELECT company_id FROM users 
      WHERE auth_id = auth.uid()::text LIMIT 1
    )
  );

-- ============================================================================
-- SHOP_SETTINGS TABLE POLICIES
-- Shop settings isolated by company
-- ============================================================================
CREATE POLICY "Shop Settings: View own company settings" ON shop_settings
  FOR SELECT USING (
    company_id = (
      SELECT company_id FROM users 
      WHERE auth_id = auth.uid()::text LIMIT 1
    )
  );

CREATE POLICY "Shop Settings: Update own company settings" ON shop_settings
  FOR UPDATE USING (
    company_id = (
      SELECT company_id FROM users 
      WHERE auth_id = auth.uid()::text LIMIT 1
    )
    AND (
      SELECT role_id FROM users 
      WHERE auth_id = auth.uid()::text LIMIT 1
    ) IN ('role-owner', 'role-ceo')
  );

-- ============================================================================
-- ROLES, PERMISSIONS, SENSITIVE_FIELD_ACCESS POLICIES
-- Company-scoped access control data
-- ============================================================================
CREATE POLICY "Roles: View own company roles" ON roles
  FOR SELECT USING (
    company_id = (
      SELECT company_id FROM users 
      WHERE auth_id = auth.uid()::text LIMIT 1
    )
  );

CREATE POLICY "Permissions: View own company permissions" ON permissions
  FOR SELECT USING (
    company_id = (
      SELECT company_id FROM users 
      WHERE auth_id = auth.uid()::text LIMIT 1
    )
  );

CREATE POLICY "Sensitive Field Access: View own company access" ON sensitive_field_access
  FOR SELECT USING (
    company_id = (
      SELECT company_id FROM users 
      WHERE auth_id = auth.uid()::text LIMIT 1
    )
  );

-- ============================================================================
-- OTHER TABLES (BATCHES, DOCUMENTS, etc.)
-- ============================================================================
CREATE POLICY "Batches: View own company batches" ON batches
  FOR SELECT USING (
    company_id = (
      SELECT company_id FROM users 
      WHERE auth_id = auth.uid()::text LIMIT 1
    )
  );

CREATE POLICY "Documents: View own company documents" ON documents
  FOR SELECT USING (
    company_id = (
      SELECT company_id FROM users 
      WHERE auth_id = auth.uid()::text LIMIT 1
    )
  );

-- ============================================================================
-- INDEXES FOR PERFORMANCE (on company_id columns)
-- ============================================================================
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_branches_company_id ON branches(company_id);
CREATE INDEX idx_invoices_company_id ON invoices(company_id);
CREATE INDEX idx_items_company_id ON items(company_id);
CREATE INDEX idx_inventory_company_id ON inventory(company_id);
CREATE INDEX idx_payments_company_id ON payments(company_id);
CREATE INDEX idx_audit_logs_company_id ON audit_logs(company_id);
CREATE INDEX idx_returns_company_id ON returns(company_id);
CREATE INDEX idx_shop_settings_company_id ON shop_settings(company_id);
CREATE INDEX idx_roles_company_id ON roles(company_id);
CREATE INDEX idx_permissions_company_id ON permissions(company_id);
CREATE INDEX idx_sensitive_field_access_company_id ON sensitive_field_access(company_id);
CREATE INDEX idx_batches_company_id ON batches(company_id);
CREATE INDEX idx_documents_company_id ON documents(company_id);
