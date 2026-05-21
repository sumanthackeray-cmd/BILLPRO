import { collection, doc } from "firebase/firestore";
import { db } from "./config";

/**
 * Returns a Firestore collection reference scoped to the active tenant.
 */
export const getTenantCollection = (collectionName, companyId = null) => {
  const activeCompanyId = companyId || localStorage.getItem("company_id");
  if (activeCompanyId) {
    return collection(db, "companies", activeCompanyId, collectionName);
  }
  return collection(db, collectionName);
};

/**
 * Returns a Firestore document reference scoped to the active tenant.
 */
export const getTenantDoc = (collectionName, docId, companyId = null) => {
  const activeCompanyId = companyId || localStorage.getItem("company_id");
  if (activeCompanyId) {
    return doc(db, "companies", activeCompanyId, collectionName, docId);
  }
  return doc(db, collectionName, docId);
};
