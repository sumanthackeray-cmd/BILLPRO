import { 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where 
} from "firebase/firestore";
import { db } from "./config";
import { getTenantCollection, getTenantDoc } from "./tenantQuery";

export const getTenantDocuments = async (collectionName, companyId = null) => {
  const colRef = getTenantCollection(collectionName, companyId);
  const snapshot = await getDocs(colRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addTenantDocument = async (collectionName, data, companyId = null) => {
  const colRef = getTenantCollection(collectionName, companyId);
  return addDoc(colRef, data);
};

export const updateTenantDocument = async (collectionName, docId, data, companyId = null) => {
  const docRef = getTenantDoc(collectionName, docId, companyId);
  return updateDoc(docRef, data);
};

export const deleteTenantDocument = async (collectionName, docId, companyId = null) => {
  const docRef = getTenantDoc(collectionName, docId, companyId);
  return deleteDoc(docRef);
};

export { db };
