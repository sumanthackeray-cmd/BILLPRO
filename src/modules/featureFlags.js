/**
 * Feature Flags — SAP-Level ERP Expansion
 * Setting any flag to 'false' hides that module completely.
 * All existing POS/billing/inventory features remain unaffected.
 */

const getFlag = (key, defaultVal = true) => {
  const stored = localStorage.getItem(`ERP_FLAG_${key}`);
  if (stored === null) return defaultVal;
  return stored !== 'false';
};

export const FEATURE_FLAGS = {
  ENABLE_FINANCE:          getFlag('FINANCE'),
  ENABLE_HR:               getFlag('HR'),
  ENABLE_PURCHASE_VENDOR:  getFlag('PURCHASE_VENDOR'),
  ENABLE_CRM:              getFlag('CRM'),
  ENABLE_ANALYTICS_BI:     getFlag('ANALYTICS_BI'),
  ENABLE_RBAC:             getFlag('RBAC'),
};

export const setFeatureFlag = (key, value) => {
  localStorage.setItem(`ERP_FLAG_${key}`, value ? 'true' : 'false');
  window.dispatchEvent(new Event('featureFlagsChanged'));
};

export const getAllFlags = () => ({ ...FEATURE_FLAGS });
