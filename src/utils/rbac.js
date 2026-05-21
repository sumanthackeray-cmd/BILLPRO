/**
 * Role-Based Access Control (RBAC) System
 * Manages permissions for different roles (admin, manager, cashier, warehouse, accountant)
 */

export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  CASHIER: 'cashier',
  WAREHOUSE_STAFF: 'warehouseStaff',
  ACCOUNTANT: 'accountant',
  SUPERVISOR: 'supervisor',
};

export const PERMISSIONS = {
  // POS Module
  POS_CREATE_BILL: 'pos:create:bill',
  POS_EDIT_BILL: 'pos:edit:bill',
  POS_VOID_BILL: 'pos:void:bill',
  POS_APPLY_DISCOUNT: 'pos:apply:discount',
  POS_APPLY_OFFER: 'pos:apply:offer',
  POS_SPLIT_PAYMENT: 'pos:split:payment',
  POS_PROCESS_RETURN: 'pos:process:return',
  POS_REPRINT_BILL: 'pos:reprint:bill',
  POS_BARCODE_SCAN: 'pos:barcode:scan',

  // Inventory Module
  INVENTORY_VIEW: 'inventory:view',
  INVENTORY_EDIT: 'inventory:edit',
  INVENTORY_TRANSFER: 'inventory:transfer',
  INVENTORY_MARK_EXPIRY: 'inventory:mark:expiry',
  INVENTORY_BATCH_MANAGEMENT: 'inventory:batch:management',
  INVENTORY_ANALYTICS: 'inventory:analytics',

  // Purchase Module
  PURCHASE_VIEW: 'purchase:view',
  PURCHASE_CREATE: 'purchase:create',
  PURCHASE_APPROVE: 'purchase:approve',
  PURCHASE_VENDOR_VIEW: 'purchase:vendor:view',
  PURCHASE_VENDOR_MANAGE: 'purchase:vendor:manage',
  PURCHASE_GRN_CREATE: 'purchase:grn:create',

  // Warehouse Module
  WAREHOUSE_STOCK_RECEIVE: 'warehouse:stock:receive',
  WAREHOUSE_STOCK_TRANSFER: 'warehouse:stock:transfer',
  WAREHOUSE_VIEW_LOCATION: 'warehouse:view:location',
  WAREHOUSE_MANAGE_LOCATION: 'warehouse:manage:location',
  WAREHOUSE_RACKING: 'warehouse:racking',

  // Branch Management
  BRANCH_VIEW: 'branch:view',
  BRANCH_CREATE: 'branch:create',
  BRANCH_EDIT: 'branch:edit',
  BRANCH_DELETE: 'branch:delete',
  BRANCH_SETTINGS: 'branch:settings',

  // Customer & Loyalty
  CUSTOMER_VIEW: 'customer:view',
  CUSTOMER_CREATE: 'customer:create',
  CUSTOMER_EDIT: 'customer:edit',
  LOYALTY_VIEW: 'loyalty:view',
  LOYALTY_MANAGE: 'loyalty:manage',

  // Reporting & Analytics
  REPORTS_VIEW: 'reports:view',
  REPORTS_SALES: 'reports:sales',
  REPORTS_INVENTORY: 'reports:inventory',
  REPORTS_PROFIT: 'reports:profit',
  REPORTS_EXPORT: 'reports:export',
  ANALYTICS_VIEW: 'analytics:view',
  ANALYTICS_FORECAST: 'analytics:forecast',

  // Accounting
  ACCOUNTING_VIEW: 'accounting:view',
  ACCOUNTING_DAY_CLOSING: 'accounting:day:closing',
  ACCOUNTING_EDIT_INVOICE: 'accounting:edit:invoice',
  ACCOUNTING_VIEW_AUDIT: 'accounting:view:audit',

  // User Management
  USER_MANAGE: 'user:manage',
  USER_VIEW: 'user:view',
  ROLE_MANAGE: 'role:manage',

  // Settings
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_EDIT: 'settings:edit',
  SYSTEM_CONFIG: 'system:config',

  // Offers & Promotions
  OFFER_VIEW: 'offer:view',
  OFFER_CREATE: 'offer:create',
  OFFER_EDIT: 'offer:edit',
  OFFER_DELETE: 'offer:delete',

  // Cashier Shift
  SHIFT_OPEN: 'shift:open',
  SHIFT_CLOSE: 'shift:close',
  SHIFT_VIEW: 'shift:view',
};

// Role-Permission Matrix: Maps roles to their permissions
export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    // Admin has all permissions
    Object.values(PERMISSIONS),
  ].flat(),

  [ROLES.MANAGER]: [
    // Manager can manage most operations but not system config
    PERMISSIONS.POS_CREATE_BILL,
    PERMISSIONS.POS_EDIT_BILL,
    PERMISSIONS.POS_APPLY_DISCOUNT,
    PERMISSIONS.POS_APPLY_OFFER,
    PERMISSIONS.POS_PROCESS_RETURN,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_TRANSFER,
    PERMISSIONS.PURCHASE_VIEW,
    PERMISSIONS.PURCHASE_CREATE,
    PERMISSIONS.PURCHASE_APPROVE,
    PERMISSIONS.WAREHOUSE_STOCK_TRANSFER,
    PERMISSIONS.BRANCH_VIEW,
    PERMISSIONS.BRANCH_SETTINGS,
    PERMISSIONS.CUSTOMER_VIEW,
    PERMISSIONS.CUSTOMER_CREATE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_SALES,
    PERMISSIONS.REPORTS_INVENTORY,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.ACCOUNTING_VIEW,
    PERMISSIONS.ACCOUNTING_DAY_CLOSING,
    PERMISSIONS.OFFER_VIEW,
    PERMISSIONS.SHIFT_VIEW,
    PERMISSIONS.USER_VIEW,
  ],

  [ROLES.CASHIER]: [
    // Cashier - Core POS operations only
    PERMISSIONS.POS_CREATE_BILL,
    PERMISSIONS.POS_APPLY_DISCOUNT,
    PERMISSIONS.POS_APPLY_OFFER,
    PERMISSIONS.POS_SPLIT_PAYMENT,
    PERMISSIONS.POS_PROCESS_RETURN,
    PERMISSIONS.POS_REPRINT_BILL,
    PERMISSIONS.POS_BARCODE_SCAN,
    PERMISSIONS.CUSTOMER_VIEW,
    PERMISSIONS.LOYALTY_VIEW,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.OFFER_VIEW,
    PERMISSIONS.SHIFT_OPEN,
    PERMISSIONS.SHIFT_CLOSE,
    PERMISSIONS.SHIFT_VIEW,
  ],

  [ROLES.WAREHOUSE_STAFF]: [
    // Warehouse staff - Stock and location management
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_EDIT,
    PERMISSIONS.INVENTORY_TRANSFER,
    PERMISSIONS.INVENTORY_BATCH_MANAGEMENT,
    PERMISSIONS.INVENTORY_MARK_EXPIRY,
    PERMISSIONS.WAREHOUSE_STOCK_RECEIVE,
    PERMISSIONS.WAREHOUSE_STOCK_TRANSFER,
    PERMISSIONS.WAREHOUSE_VIEW_LOCATION,
    PERMISSIONS.WAREHOUSE_MANAGE_LOCATION,
    PERMISSIONS.WAREHOUSE_RACKING,
    PERMISSIONS.PURCHASE_VIEW,
    PERMISSIONS.PURCHASE_GRN_CREATE,
    PERMISSIONS.PURCHASE_VENDOR_VIEW,
    PERMISSIONS.REPORTS_INVENTORY,
    PERMISSIONS.BRANCH_VIEW,
  ],

  [ROLES.ACCOUNTANT]: [
    // Accountant - Reporting and financial operations
    PERMISSIONS.ACCOUNTING_VIEW,
    PERMISSIONS.ACCOUNTING_DAY_CLOSING,
    PERMISSIONS.ACCOUNTING_EDIT_INVOICE,
    PERMISSIONS.ACCOUNTING_VIEW_AUDIT,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_SALES,
    PERMISSIONS.REPORTS_INVENTORY,
    PERMISSIONS.REPORTS_PROFIT,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.CUSTOMER_VIEW,
    PERMISSIONS.PURCHASE_VIEW,
    PERMISSIONS.INVOICE_VIEW,
    PERMISSIONS.BRANCH_VIEW,
  ],

  [ROLES.SUPERVISOR]: [
    // Supervisor - Can view and oversee operations
    PERMISSIONS.POS_CREATE_BILL,
    PERMISSIONS.POS_APPLY_DISCOUNT,
    PERMISSIONS.POS_PROCESS_RETURN,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.PURCHASE_VIEW,
    PERMISSIONS.WAREHOUSE_VIEW_LOCATION,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_SALES,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.CUSTOMER_VIEW,
    PERMISSIONS.SHIFT_VIEW,
    PERMISSIONS.BRANCH_VIEW,
  ],
};

/**
 * Check if a user has a specific permission
 * @param {string} role - User's role
 * @param {string} permission - Permission to check
 * @returns {boolean} True if user has permission
 */
export function hasPermission(role, permission) {
  const rolePerms = ROLE_PERMISSIONS[role] || [];
  return rolePerms.includes(permission);
}

/**
 * Check if a user has any of the provided permissions
 * @param {string} role - User's role
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean} True if user has any of the permissions
 */
export function hasAnyPermission(role, permissions) {
  return permissions.some(perm => hasPermission(role, perm));
}

/**
 * Check if a user has all of the provided permissions
 * @param {string} role - User's role
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean} True if user has all permissions
 */
export function hasAllPermissions(role, permissions) {
  return permissions.every(perm => hasPermission(role, perm));
}

/**
 * Get all permissions for a role
 * @param {string} role - User's role
 * @returns {string[]} Array of permissions
 */
export function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if a role can access a specific module
 * @param {string} role - User's role
 * @param {string} module - Module name (pos, inventory, purchase, etc)
 * @returns {boolean} True if role can access module
 */
export function canAccessModule(role, module) {
  const modulePermissionMap = {
    pos: [PERMISSIONS.POS_CREATE_BILL],
    inventory: [PERMISSIONS.INVENTORY_VIEW],
    purchase: [PERMISSIONS.PURCHASE_VIEW],
    warehouse: [PERMISSIONS.WAREHOUSE_STOCK_RECEIVE],
    branch: [PERMISSIONS.BRANCH_VIEW],
    customer: [PERMISSIONS.CUSTOMER_VIEW],
    reports: [PERMISSIONS.REPORTS_VIEW],
    analytics: [PERMISSIONS.ANALYTICS_VIEW],
    accounting: [PERMISSIONS.ACCOUNTING_VIEW],
    loyalty: [PERMISSIONS.LOYALTY_VIEW],
    settings: [PERMISSIONS.SETTINGS_VIEW],
  };

  const requiredPermissions = modulePermissionMap[module] || [];
  return hasAnyPermission(role, requiredPermissions);
}

/**
 * Get role display name
 * @param {string} role - Role ID
 * @returns {string} Display name
 */
export function getRoleDisplayName(role) {
  const roleNames = {
    [ROLES.ADMIN]: 'Administrator',
    [ROLES.MANAGER]: 'Store Manager',
    [ROLES.CASHIER]: 'Cashier',
    [ROLES.WAREHOUSE_STAFF]: 'Warehouse Staff',
    [ROLES.ACCOUNTANT]: 'Accountant',
    [ROLES.SUPERVISOR]: 'Supervisor',
  };
  return roleNames[role] || 'Unknown Role';
}

export default {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRolePermissions,
  canAccessModule,
  getRoleDisplayName,
};
