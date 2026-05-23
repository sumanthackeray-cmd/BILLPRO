-- BillPro Enterprise Retail Management System - Supabase Schema
-- Complete PostgreSQL schema with Row-Level Security (RLS) for multi-tenant data isolation

-- ============================================================================
-- ENABLE REQUIRED EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ORGANIZATION & BRANCH TABLES
-- ============================================================================

CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('HQ', 'Store', 'Warehouse', 'Kiosk')),
  
  -- Address
  address_street VARCHAR(255),
  address_city VARCHAR(100),
  address_state VARCHAR(100),
  address_zipcode VARCHAR(20),
  address_country VARCHAR(100),
  
  -- Contact Info
  contact_phone VARCHAR(20),
  contact_email VARCHAR(255),
  contact_manager_id UUID,
  
  -- GST Details
  gst_number VARCHAR(15),
  gst_registration_type VARCHAR(50),
  
  -- Settings
  currency VARCHAR(10) DEFAULT 'INR',
  timezone VARCHAR(50),
  language VARCHAR(50),
  bill_prefix VARCHAR(50),
  enable_offline_billing BOOLEAN DEFAULT true,
  enable_loyalty BOOLEAN DEFAULT true,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_email CHECK (contact_email IS NULL OR contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

CREATE INDEX idx_branches_user_id ON public.branches(user_id);
CREATE INDEX idx_branches_code ON public.branches(code);
CREATE INDEX idx_branches_is_active ON public.branches(is_active);

-- ============================================================================
-- USER & PERMISSIONS TABLES
-- ============================================================================

CREATE TABLE public.users_profile (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255),
  phone VARCHAR(20),
  role VARCHAR(50) NOT NULL DEFAULT 'cashier' CHECK (role IN ('admin', 'manager', 'cashier', 'warehouseStaff', 'accountant', 'supervisor')),
  department VARCHAR(50) CHECK (department IN ('sales', 'warehouse', 'accounts', 'management')),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.user_branch_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, branch_id)
);

CREATE INDEX idx_user_branch_assignments_user_id ON public.user_branch_assignments(user_id);
CREATE INDEX idx_user_branch_assignments_branch_id ON public.user_branch_assignments(branch_id);

CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_name VARCHAR(50) NOT NULL UNIQUE,
  
  -- POS Permissions
  pos_billing_create BOOLEAN DEFAULT false,
  pos_billing_read BOOLEAN DEFAULT false,
  pos_billing_update BOOLEAN DEFAULT false,
  pos_billing_delete BOOLEAN DEFAULT false,
  pos_barcode_scan BOOLEAN DEFAULT false,
  pos_discounts_apply BOOLEAN DEFAULT false,
  pos_discounts_max NUMERIC(10, 2),
  pos_returns_process BOOLEAN DEFAULT false,
  pos_split_payment BOOLEAN DEFAULT false,
  
  -- Inventory Permissions
  inventory_view BOOLEAN DEFAULT false,
  inventory_stock_transfer BOOLEAN DEFAULT false,
  inventory_mark_expiry BOOLEAN DEFAULT false,
  inventory_view_analytics BOOLEAN DEFAULT false,
  
  -- Purchase Permissions
  purchase_view_po BOOLEAN DEFAULT false,
  purchase_create_po BOOLEAN DEFAULT false,
  purchase_approve_po BOOLEAN DEFAULT false,
  purchase_view_vendors BOOLEAN DEFAULT false,
  
  -- Reports Permissions
  reports_sales BOOLEAN DEFAULT false,
  reports_inventory BOOLEAN DEFAULT false,
  reports_profit BOOLEAN DEFAULT false,
  
  -- Settings Permissions
  settings_view BOOLEAN DEFAULT false,
  settings_edit BOOLEAN DEFAULT false,
  settings_user_management BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PRODUCT & CATALOG TABLES
-- ============================================================================

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  sub_category VARCHAR(100),
  brand VARCHAR(100),
  barcode VARCHAR(100),
  hsn VARCHAR(10),
  unit VARCHAR(50) CHECK (unit IN ('pcs', 'kg', 'ltr', 'box')),
  cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  gst_rate NUMERIC(5, 2) CHECK (gst_rate IN (0, 5, 12, 18, 28)),
  images TEXT[], -- Array of image URLs
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_sku ON public.products(sku);
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_is_active ON public.products(is_active);

CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  quantity NUMERIC(12, 2) NOT NULL DEFAULT 0,
  reorder_point NUMERIC(12, 2),
  reorder_quantity NUMERIC(12, 2),
  last_restock_date TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(product_id, branch_id)
);

CREATE INDEX idx_inventory_branch_id ON public.inventory(branch_id);
CREATE INDEX idx_inventory_product_id ON public.inventory(product_id);

CREATE TABLE public.batch_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  batch_number VARCHAR(100) NOT NULL,
  quantity NUMERIC(12, 2) NOT NULL,
  expiry_date DATE,
  status VARCHAR(50) CHECK (status IN ('Active', 'Expiring', 'Expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(batch_number, branch_id, product_id)
);

CREATE INDEX idx_batch_inventory_branch_id ON public.batch_inventory(branch_id);
CREATE INDEX idx_batch_inventory_expiry_date ON public.batch_inventory(expiry_date);

-- ============================================================================
-- CUSTOMER & LOYALTY TABLES
-- ============================================================================

CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  customer_type VARCHAR(50) CHECK (customer_type IN ('Retail', 'Wholesale')),
  total_purchase_value NUMERIC(15, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customers_phone ON public.customers(phone);
CREATE INDEX idx_customers_email ON public.customers(email);

CREATE TABLE public.loyalty_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  points_balance NUMERIC(10, 2) DEFAULT 0,
  redeemed_points NUMERIC(10, 2) DEFAULT 0,
  tier VARCHAR(50) CHECK (tier IN ('Tier1', 'Tier2', 'Tier3')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(customer_id)
);

CREATE TABLE public.offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) CHECK (type IN ('Product', 'Category', 'Cart')),
  discount_value NUMERIC(12, 2),
  start_date DATE,
  end_date DATE,
  status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TRANSACTION TABLES
-- ============================================================================

CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id),
  cashier_id UUID NOT NULL REFERENCES auth.users(id),
  subtotal NUMERIC(15, 2) DEFAULT 0,
  total_tax NUMERIC(15, 2) DEFAULT 0,
  grand_total NUMERIC(15, 2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Completed', 'Voided')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invoices_branch_id ON public.invoices(branch_id);
CREATE INDEX idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX idx_invoices_cashier_id ON public.invoices(cashier_id);
CREATE INDEX idx_invoices_invoice_number ON public.invoices(invoice_number);
CREATE INDEX idx_invoices_created_at ON public.invoices(created_at);

CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity NUMERIC(12, 2) NOT NULL,
  unit_price NUMERIC(12, 2) NOT NULL,
  line_total NUMERIC(15, 2) NOT NULL,
  discount NUMERIC(15, 2) DEFAULT 0
);

CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_product_id ON public.invoice_items(product_id);

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount NUMERIC(15, 2) NOT NULL,
  payment_method VARCHAR(50),
  reference_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_invoice_id ON public.payments(invoice_id);

CREATE TABLE public.returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_invoice_id UUID NOT NULL REFERENCES public.invoices(id),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  total_return_amount NUMERIC(15, 2),
  status VARCHAR(50) CHECK (status IN ('Pending', 'Approved', 'Completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_returns_branch_id ON public.returns(branch_id);
CREATE INDEX idx_returns_original_invoice_id ON public.returns(original_invoice_id);

-- ============================================================================
-- VENDOR & PURCHASE TABLES
-- ============================================================================

CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  vendor_code VARCHAR(50) UNIQUE NOT NULL,
  contact_phone VARCHAR(20),
  contact_email VARCHAR(255),
  contact_address TEXT,
  gst_number VARCHAR(15),
  payment_terms VARCHAR(50) CHECK (payment_terms IN ('COD', 'Net30', 'Net45')),
  credit_limit NUMERIC(15, 2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vendors_vendor_code ON public.vendors(vendor_code);

CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_number VARCHAR(100) UNIQUE NOT NULL,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  total NUMERIC(15, 2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Confirmed', 'Received')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_purchase_orders_vendor_id ON public.purchase_orders(vendor_id);
CREATE INDEX idx_purchase_orders_branch_id ON public.purchase_orders(branch_id);
CREATE INDEX idx_purchase_orders_po_number ON public.purchase_orders(po_number);

CREATE TABLE public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity NUMERIC(12, 2) NOT NULL,
  unit_price NUMERIC(12, 2) NOT NULL,
  line_total NUMERIC(15, 2) NOT NULL
);

CREATE INDEX idx_po_items_purchase_order_id ON public.purchase_order_items(purchase_order_id);

-- ============================================================================
-- AUDIT & COMPLIANCE TABLES
-- ============================================================================

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_branch_id ON public.audit_logs(branch_id);
CREATE INDEX idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

CREATE TABLE public.cashier_shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cashier_id UUID NOT NULL REFERENCES auth.users(id),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  opening_balance NUMERIC(15, 2) DEFAULT 0,
  closing_balance NUMERIC(15, 2),
  total_sales NUMERIC(15, 2) DEFAULT 0,
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(cashier_id, branch_id, shift_date)
);

CREATE INDEX idx_cashier_shifts_cashier_id ON public.cashier_shifts(cashier_id);
CREATE INDEX idx_cashier_shifts_branch_id ON public.cashier_shifts(branch_id);
CREATE INDEX idx_cashier_shifts_shift_date ON public.cashier_shifts(shift_date);

CREATE TABLE public.day_closing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  closing_date DATE NOT NULL,
  total_invoices INTEGER DEFAULT 0,
  total_sales NUMERIC(15, 2) DEFAULT 0,
  total_tax NUMERIC(15, 2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Approved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(branch_id, closing_date)
);

CREATE INDEX idx_day_closing_branch_id ON public.day_closing(branch_id);
CREATE INDEX idx_day_closing_closing_date ON public.day_closing(closing_date);

-- ============================================================================
-- ANALYTICS & REPORTING TABLES
-- ============================================================================

CREATE TABLE public.sales_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_sales NUMERIC(15, 2) DEFAULT 0,
  total_invoices INTEGER DEFAULT 0,
  average_transaction NUMERIC(15, 2) DEFAULT 0,
  total_tax NUMERIC(15, 2) DEFAULT 0,
  total_discount NUMERIC(15, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(branch_id, date)
);

CREATE INDEX idx_sales_analytics_branch_id ON public.sales_analytics(branch_id);
CREATE INDEX idx_sales_analytics_date ON public.sales_analytics(date);

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_branch_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashier_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_closing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own branches
CREATE POLICY "Users can view own branches" ON public.branches
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create branches" ON public.branches
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own branches" ON public.branches
FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policy: Inventory data is visible to users of assigned branches
CREATE POLICY "Users can view assigned branch inventory" ON public.inventory
FOR SELECT USING (
  branch_id IN (
    SELECT branch_id FROM public.user_branch_assignments 
    WHERE user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.branches WHERE id = branch_id AND user_id = auth.uid()
  )
);

-- RLS Policy: Invoices visible to users of assigned branches
CREATE POLICY "Users can view assigned branch invoices" ON public.invoices
FOR SELECT USING (
  branch_id IN (
    SELECT branch_id FROM public.user_branch_assignments 
    WHERE user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.branches WHERE id = branch_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert invoices in assigned branches" ON public.invoices
FOR INSERT WITH CHECK (
  branch_id IN (
    SELECT branch_id FROM public.user_branch_assignments 
    WHERE user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.branches WHERE id = branch_id AND user_id = auth.uid()
  )
);

-- RLS Policy: Audit logs
CREATE POLICY "Users can view own branch audit logs" ON public.audit_logs
FOR SELECT USING (
  branch_id IN (
    SELECT branch_id FROM public.user_branch_assignments 
    WHERE user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.branches WHERE id = branch_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert audit logs" ON public.audit_logs
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Products are readable by all authenticated users
CREATE POLICY "All authenticated users can view products" ON public.products
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only admin can manage products" ON public.products
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users_profile 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ============================================================================
-- SEED DEFAULT ROLE PERMISSIONS
-- ============================================================================

INSERT INTO public.role_permissions (role_name, pos_billing_create, pos_billing_read, pos_billing_update, pos_barcode_scan, pos_discounts_apply, pos_returns_process, inventory_view, purchase_view_po, purchase_view_vendors, reports_sales, settings_view) 
VALUES 
  ('cashier', true, true, false, true, true, true, true, false, false, true, false),
  ('manager', true, true, true, true, true, true, true, true, true, true, true),
  ('admin', true, true, true, true, true, true, true, true, true, true, true),
  ('warehouseStaff', false, false, false, false, false, false, true, false, false, false, false),
  ('accountant', false, true, false, false, false, false, true, true, true, true, true),
  ('supervisor', true, true, true, true, false, true, true, false, true, true, true)
ON CONFLICT (role_name) DO UPDATE SET updated_at = CURRENT_TIMESTAMP;
