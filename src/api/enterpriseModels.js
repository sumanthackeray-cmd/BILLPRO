/**
 * Enterprise Data Models for SAP-level Retail Management System
 * Defines all Firestore collection schemas and data structures
 */

// ============================================================================
// ORGANIZATION & BRANCH MODELS
// ============================================================================

export const BranchModel = {
  id: 'string (unique)',
  name: 'string',
  code: 'string (unique, e.g., BR-001)',
  type: 'enum (HQ, Store, Warehouse, Kiosk)',
  address: {
    street: 'string',
    city: 'string',
    state: 'string',
    zipcode: 'string',
    country: 'string',
  },
  contact: {
    phone: 'string',
    email: 'string',
    manager: 'string (user ID)',
  },
  gst: {
    gstNumber: 'string',
    registrationType: 'enum (Regular, Composition)',
  },
  operatingHours: {
    monday: { opens: 'HH:MM', closes: 'HH:MM', closed: false },
    // ... other days
  },
  settings: {
    currency: 'string (default: INR)',
    timezone: 'string',
    language: 'string',
    billPrefix: 'string (e.g., BR001)',
    enableOfflineBilling: true,
    enableLoyalty: true,
  },
  isActive: true,
  createdAt: 'timestamp',
  updatedAt: 'timestamp',
};

// ============================================================================
// USER & PERMISSIONS MODELS
// ============================================================================

export const UserModel = {
  id: 'string (UID from Firebase Auth)',
  email: 'string',
  name: 'string',
  phone: 'string',
  role: 'enum (admin, manager, cashier, warehouseStaff, accountant, supervisor)',
  branches: ['array of branch IDs'],
  department: 'enum (sales, warehouse, accounts, management)',
  isActive: true,
  lastLogin: 'timestamp',
  createdAt: 'timestamp',
  updatedAt: 'timestamp',
};

export const RolePermissionModel = {
  roleId: 'string (e.g., cashier, manager)',
  permissions: {
    pos: {
      billing: { create: true, read: true, update: false, delete: false },
      barcodeScan: { enabled: true },
      discounts: { apply: true, max: 50 },
      returns: { process: true },
      splitPayment: { enabled: true },
    },
    inventory: {
      view: true,
      stockTransfer: false,
      markExpiry: false,
      viewAnalytics: false,
    },
    purchase: {
      viewPO: true,
      createPO: false,
      approvePO: false,
      viewVendors: true,
    },
    reports: {
      salesReport: true,
      inventoryReport: false,
      profitReport: false,
    },
    settings: {
      viewSettings: false,
      editSettings: false,
      userManagement: false,
    },
  },
};

// ============================================================================
// PRODUCT & CATALOG MODELS
// ============================================================================

export const ProductModel = {
  id: 'string (SKU)',
  name: 'string',
  description: 'string',
  category: 'string',
  subCategory: 'string',
  brand: 'string',
  sku: 'string (unique)',
  barcode: 'string (nullable)',
  hsn: 'string',
  unit: 'enum (pcs, kg, ltr, box)',
  costPrice: 'number',
  sellingPrice: 'number',
  gstRate: 'number (0, 5, 12, 18, 28)',
  images: ['array of URLs'],
  isActive: true,
  createdAt: 'timestamp',
  updatedAt: 'timestamp',
};

export const InventoryModel = {
  id: 'string',
  productId: 'string',
  branchId: 'string',
  quantity: 'number',
  reorderPoint: 'number',
  reorderQuantity: 'number',
  lastRestockDate: 'timestamp',
  updatedAt: 'timestamp',
};

export const BatchInventoryModel = {
  id: 'string',
  productId: 'string',
  branchId: 'string',
  batchNumber: 'string',
  quantity: 'number',
  expiryDate: 'date',
  status: 'enum (Active, Expiring, Expired)',
  createdAt: 'timestamp',
};

// ============================================================================
// TRANSACTION MODELS
// ============================================================================

export const InvoiceModel = {
  id: 'string',
  invoiceNumber: 'string',
  branchId: 'string',
  customerId: 'string (nullable)',
  cashierId: 'string',
  items: [
    {
      productId: 'string',
      quantity: 'number',
      unitPrice: 'number',
      lineTotal: 'number',
      discount: 'number',
    },
  ],
  subtotal: 'number',
  totalTax: 'number',
  grandTotal: 'number',
  payments: ['array of payment objects'],
  status: 'enum (Draft, Completed, Voided)',
  createdAt: 'timestamp',
  updatedAt: 'timestamp',
};

export const ReturnModel = {
  id: 'string',
  originalInvoiceId: 'string',
  branchId: 'string',
  returnItems: ['array'],
  totalReturnAmount: 'number',
  status: 'enum (Pending, Approved, Completed)',
  createdAt: 'timestamp',
};

// ============================================================================
// VENDOR & PURCHASE MODELS
// ============================================================================

export const VendorModel = {
  id: 'string',
  name: 'string',
  vendorCode: 'string',
  contact: {
    phone: 'string',
    email: 'string',
    address: 'string',
  },
  gst: 'string',
  paymentTerms: 'enum (COD, Net30, Net45)',
  creditLimit: 'number',
  isActive: true,
  createdAt: 'timestamp',
};

export const PurchaseOrderModel = {
  id: 'string',
  poNumber: 'string',
  vendorId: 'string',
  branchId: 'string',
  items: ['array'],
  total: 'number',
  status: 'enum (Draft, Confirmed, Received)',
  createdAt: 'timestamp',
  updatedAt: 'timestamp',
};

// ============================================================================
// CUSTOMER & LOYALTY MODELS
// ============================================================================

export const CustomerModel = {
  id: 'string',
  name: 'string',
  phone: 'string',
  email: 'string',
  address: 'string',
  customerType: 'enum (Retail, Wholesale)',
  totalPurchaseValue: 'number',
  isActive: true,
  createdAt: 'timestamp',
};

export const LoyaltyAccountModel = {
  id: 'string',
  customerId: 'string',
  pointsBalance: 'number',
  redeemedPoints: 'number',
  tier: 'enum (Tier1, Tier2, Tier3)',
  createdAt: 'timestamp',
};

export const OfferModel = {
  id: 'string',
  name: 'string',
  type: 'enum (Product, Category, Cart)',
  discountValue: 'number',
  startDate: 'date',
  endDate: 'date',
  status: 'enum (Active, Inactive)',
  createdAt: 'timestamp',
};

// ============================================================================
// ACCOUNTING & AUDIT MODELS
// ============================================================================

export const AuditLogModel = {
  id: 'string',
  userId: 'string',
  action: 'string',
  entityType: 'string',
  entityId: 'string',
  changes: {
    before: 'object',
    after: 'object',
  },
  branchId: 'string',
  createdAt: 'timestamp',
};

export const CashierShiftModel = {
  id: 'string',
  cashierId: 'string',
  branchId: 'string',
  shiftDate: 'date',
  openingBalance: 'number',
  closingBalance: 'number (nullable)',
  totalSales: 'number',
  openedAt: 'timestamp',
  closedAt: 'timestamp (nullable)',
};

export const DayClosingModel = {
  id: 'string',
  branchId: 'string',
  closingDate: 'date',
  totalInvoices: 'number',
  totalSales: 'number',
  totalTax: 'number',
  status: 'enum (Draft, Approved)',
  createdAt: 'timestamp',
};

// ============================================================================
// ANALYTICS MODELS
// ============================================================================

export const SalesAnalyticsModel = {
  id: 'string',
  date: 'date',
  branchId: 'string',
  productId: 'string',
  quantitySold: 'number',
  revenue: 'number',
  profit: 'number',
  createdAt: 'timestamp',
};

export const DemandForecastModel = {
  id: 'string',
  productId: 'string',
  branchId: 'string',
  forecastDate: 'date',
  predictedQuantity: 'number',
  confidence: 'number (0-100)',
  createdAt: 'timestamp',
};

export default {
  BranchModel,
  UserModel,
  RolePermissionModel,
  ProductModel,
  InventoryModel,
  BatchInventoryModel,
  InvoiceModel,
  ReturnModel,
  VendorModel,
  PurchaseOrderModel,
  CustomerModel,
  LoyaltyAccountModel,
  OfferModel,
  AuditLogModel,
  CashierShiftModel,
  DayClosingModel,
  SalesAnalyticsModel,
  DemandForecastModel,
};
