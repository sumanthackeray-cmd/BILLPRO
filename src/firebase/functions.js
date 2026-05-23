import { getFunctions, httpsCallable } from "firebase/functions";
import app, { auth, db, firebaseConfig } from "./config";
import { initializeApp as initSecondaryApp, deleteApp } from "firebase/app";
import { createUserWithEmailAndPassword, signOut, getAuth } from "firebase/auth";
import { doc, writeBatch, serverTimestamp, collection, getDoc, getDocs, query, where, updateDoc, setDoc, deleteDoc } from "firebase/firestore";

const functions = getFunctions(app);

const registerTenantFn = httpsCallable(functions, 'registerTenant');
const manageStaffUserFn = httpsCallable(functions, 'manageStaffUser');

const CRYPTO_KEY = "EasyBMT_Secure_Crypto_Key";

export const encryptPassword = (pwd) => {
  if (!pwd) return "";
  if (pwd.startsWith("enc:")) return pwd;
  
  // XOR encryption encoded in base64
  let encrypted = "";
  for (let i = 0; i < pwd.length; i++) {
    const charCode = pwd.charCodeAt(i) ^ CRYPTO_KEY.charCodeAt(i % CRYPTO_KEY.length);
    encrypted += String.fromCharCode(charCode);
  }
  return "enc:xor:" + btoa(encrypted);
};

export const decryptPassword = (enc) => {
  if (!enc) return "";
  if (enc.startsWith("enc:xor:")) {
    try {
      const decoded = atob(enc.substring(8));
      let decrypted = "";
      for (let i = 0; i < decoded.length; i++) {
        const charCode = decoded.charCodeAt(i) ^ CRYPTO_KEY.charCodeAt(i % CRYPTO_KEY.length);
        decrypted += String.fromCharCode(charCode);
      }
      return decrypted;
    } catch (e) {
      return enc;
    }
  } else if (enc.startsWith("enc:")) {
    try {
      return atob(enc.substring(4));
    } catch (e) {
      return enc;
    }
  }
  return enc;
};

export const registerTenant = async (data) => {
  try {
    const res = await registerTenantFn(data);
    return res.data;
  } catch (err) {
    console.warn("Calling Firebase Cloud Function registerTenant failed. Falling back to client-side registration.", err);
    
    const { email, password, companyName, gstin, isGoogleAuth } = data;
    const phone = data.phone || data.mobile || data.admin_mobile || "";
    if (!email || !companyName) {
      throw new Error("Missing required onboarding fields (email, companyName).");
    }

    // Generate a unique companyId (e.g. SHOPNAME-XXXX)
    const cleanedName = companyName.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 8);
    const prefix = cleanedName.length > 0 ? cleanedName : "COMP";
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const companyId = `${prefix}-${randomSuffix}`;

    // Create or Get Owner in Firebase Auth (client-side)
    let ownerUser;
    if (isGoogleAuth) {
      if (!auth.currentUser) throw new Error("Google authentication failed. No current user found.");
      ownerUser = auth.currentUser;
    } else {
      if (!password) throw new Error("Password is required for email registration.");
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
        ownerUser = userCredential.user;
      } catch (authErr) {
        if (authErr.code === "auth/email-already-in-use" || authErr.message?.includes("email-already-in-use")) {
          // Attempt to sign in to verify their password and reuse the account
          const { signInWithEmailAndPassword } = await import("firebase/auth");
          try {
            const userCredential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
            ownerUser = userCredential.user;
          } catch (signInErr) {
            throw new Error("This email is already registered. Please enter the correct password to link this workspace, or use a different email.");
          }
        } else {
          throw authErr;
        }
      }
    }

    // Seed default Roles
    const defaultRoles = [
      { id: "role-owner", role_name: "owner", hierarchy_level: 1, can_assign_roles: true },
      { id: "role-ceo", role_name: "ceo", hierarchy_level: 2, can_assign_roles: true },
      { id: "role-ca", role_name: "ca", hierarchy_level: 3, can_assign_roles: true },
      { id: "role-accountant", role_name: "accountant", hierarchy_level: 4, can_assign_roles: false },
      { id: "role-store_manager", role_name: "store_manager", hierarchy_level: 5, can_assign_roles: false },
      { id: "role-warehouse_manager", role_name: "warehouse_manager", hierarchy_level: 6, can_assign_roles: false },
      { id: "role-cashier", role_name: "cashier", hierarchy_level: 7, can_assign_roles: false }
    ];

    // Seed default Permissions
    const defaultPermissions = [
      {
        id: "perm-owner",
        role_id: "role-owner",
        permissions: {
          pos: { view: true, create: true, edit: true, delete: true, export: true, discount: true, override: true, shift: true, reprint: true, drawer: true },
          inventory: { view: true, create: true, edit: true, delete: true, export: true, adjust: true, transfer: true, barcode: true },
          accounting: { view: true, create: true, edit: true, delete: true, export: true },
          warehouse: { view: true, create: true, edit: true, delete: true, export: true },
          hr: { view: true, create: true, edit: true, delete: true, export: true, attendance: true, payslip: true },
          reports: { view: true, create: true, edit: true, delete: true, export: true }
        }
      },
      {
        id: "perm-ceo",
        role_id: "role-ceo",
        permissions: {
          pos: { view: true, create: true, edit: true, delete: true, export: true, discount: true, override: true, shift: true, reprint: true, drawer: true },
          inventory: { view: true, create: true, edit: true, delete: true, export: true, adjust: true, transfer: true, barcode: true },
          accounting: { view: true, create: true, edit: true, delete: true, export: true },
          warehouse: { view: true, create: true, edit: true, delete: true, export: true },
          hr: { view: true, create: true, edit: true, delete: true, export: true, attendance: true, payslip: true },
          reports: { view: true, create: true, edit: true, delete: true, export: true }
        }
      },
      {
        id: "perm-ca",
        role_id: "role-ca",
        permissions: {
          pos: { view: true, create: false, edit: false, delete: false, export: true, discount: false, override: false, shift: false, reprint: true, drawer: false },
          inventory: { view: true, create: false, edit: false, delete: false, export: true, adjust: false, transfer: false, barcode: false },
          accounting: { view: true, create: true, edit: true, delete: true, export: true },
          warehouse: { view: true, create: false, edit: false, delete: false, export: true },
          hr: { view: true, create: false, edit: true, delete: false, export: true, attendance: false, payslip: true },
          reports: { view: true, create: true, edit: true, delete: true, export: true }
        }
      },
      {
        id: "perm-accountant",
        role_id: "role-accountant",
        permissions: {
          pos: { view: true, create: false, edit: false, delete: false, export: true, discount: false, override: false, shift: false, reprint: true, drawer: false },
          inventory: { view: true, create: false, edit: false, delete: false, export: true, adjust: false, transfer: false, barcode: false },
          accounting: { view: true, create: true, edit: true, delete: false, export: true },
          warehouse: { view: true, create: false, edit: true, delete: false, export: true },
          hr: { view: true, create: false, edit: true, delete: false, export: true, attendance: false, payslip: true },
          reports: { view: true, create: true, edit: true, delete: false, export: true }
        }
      },
      {
        id: "perm-store_manager",
        role_id: "role-store_manager",
        permissions: {
          pos: { view: true, create: true, edit: true, delete: true, export: true, discount: true, override: true, shift: true, reprint: true, drawer: true },
          inventory: { view: true, create: true, edit: true, delete: true, export: true, adjust: true, transfer: true, barcode: true },
          accounting: { view: false, create: false, edit: false, delete: false, export: false },
          warehouse: { view: true, create: true, edit: true, delete: false, export: true },
          hr: { view: true, create: false, edit: true, delete: false, export: true, attendance: true, payslip: true },
          reports: { view: true, create: true, edit: true, delete: false, export: true }
        }
      },
      {
        id: "perm-warehouse_manager",
        role_id: "role-warehouse_manager",
        permissions: {
          pos: { view: false, create: false, edit: false, delete: false, export: false, discount: false, override: false, shift: false, reprint: false, drawer: false },
          inventory: { view: true, create: true, edit: true, delete: false, export: true, adjust: true, transfer: true, barcode: true },
          accounting: { view: false, create: false, edit: false, delete: false, export: false },
          warehouse: { view: true, create: true, edit: true, delete: false, export: true },
          hr: { view: true, create: false, edit: true, delete: false, export: true, attendance: true, payslip: true },
          reports: { view: true, create: false, edit: false, delete: false, export: true }
        }
      },
      {
        id: "perm-cashier",
        role_id: "role-cashier",
        permissions: {
          pos: { view: true, create: true, edit: false, delete: false, export: false, discount: false, override: false, shift: true, reprint: true, drawer: true },
          inventory: { view: false, create: false, edit: false, delete: false, export: false, adjust: false, transfer: false, barcode: false },
          accounting: { view: false, create: false, edit: false, delete: false, export: false },
          warehouse: { view: false, create: false, edit: false, delete: false, export: false },
          hr: { view: false, create: false, edit: false, delete: false, export: false, attendance: true, payslip: true },
          reports: { view: false, create: false, edit: false, delete: false, export: false }
        }
      }
    ];

    // Seed default SensitiveFieldAccess
    const defaultSensitiveFieldAccess = [
      { id: "sfa-owner", role_id: "role-owner", fields: { purchase_price: true, profit_margin: true, salary: true } },
      { id: "sfa-ceo", role_id: "role-ceo", fields: { purchase_price: true, profit_margin: true, salary: false } },
      { id: "sfa-ca", role_id: "role-ca", fields: { purchase_price: true, profit_margin: true, salary: true } },
      { id: "sfa-accountant", role_id: "role-accountant", fields: { purchase_price: true, profit_margin: true, salary: true } },
      { id: "sfa-store_manager", role_id: "role-store_manager", fields: { purchase_price: false, profit_margin: false, salary: false } },
      { id: "sfa-warehouse_manager", role_id: "role-warehouse_manager", fields: { purchase_price: false, profit_margin: false, salary: false } },
      { id: "sfa-cashier", role_id: "role-cashier", fields: { purchase_price: false, profit_margin: false, salary: false } }
    ];

    const batch1 = writeBatch(db);

    // Write Company Metadata with complete schema initialized
    const companyRef = doc(db, "companies", companyId);
    batch1.set(companyRef, {
      name: companyName.trim(),
      business_name: companyName.trim(),
      gstin: gstin ? gstin.trim().toUpperCase() : "",
      created_at: new Date().toISOString(),
      owner_uid: ownerUser.uid,
      tenant_id: companyId,
      account_type: data.account_type || "small_shop",
      business_type: data.business_type || "grocery",
      admin_name: data.admin_name || "Owner",
      admin_email: email.trim().toLowerCase(),
      admin_mobile: phone ? phone.trim() : "",
      city: data.city || "",
      plan: "trial_14days",
      profile_completion: 10,
      is_active: true,
      legal: {
        gstin: gstin ? gstin.trim().toUpperCase() : null,
        pan: null,
        cin: null,
        entity_type: null,
        year_established: null,
        drug_license: null,
        fssai_license: null,
        iec_code: null,
        manufacturing_license: null,
        factory_registration: null,
        certifications: []
      },
      address: {
        line1: null,
        line2: null,
        city: data.city || null,
        state: null,
        state_code: null,
        pincode: null,
        country: "India"
      },
      contact: {
        business_email: email.trim().toLowerCase(),
        business_phone: phone ? phone.trim() : null,
        website: null,
        whatsapp: null
      },
      banking: {
        bank_name: null,
        account_number: null,
        ifsc: null,
        account_holder: null,
        upi_id: null,
        payment_qr_url: null
      },
      branding: {
        logo_url: null,
        favicon_url: null,
        primary_color: "#F5A623",
        invoice_header: null,
        invoice_footer: null,
        invoice_terms: null,
        signature_url: null
      },
      manufacturing: {
        plant_name: null,
        plant_address: null,
        production_capacity: null,
        capacity_unit: null,
        product_categories: [],
        no_of_plants: null,
        raw_material_suppliers: []
      },
      franchise: {
        parent_brand: null,
        agreement_number: null,
        agreement_valid_till: null,
        royalty_percentage: null,
        territory: null,
        ho_address: null,
        total_outlets: null
      },
      enterprise: {
        parent_company: null,
        country_of_origin: null,
        india_ho_city: null,
        total_employees_india: null,
        annual_turnover_range: null,
        stock_exchange: null,
        existing_erp: null,
        compliance_officer: null,
        company_secretary: null,
        international_presence: []
      },
      wholesale: {
        distribution_territory: null,
        retailers_served_count: null,
        warehouse_size_sqft: null,
        no_of_warehouses: null,
        cold_storage: false
      }
    });

    // Write ShopSettings seed
    const settingsRef = doc(db, "companies", companyId, "shopSettings", "seed-settings");
    batch1.set(settingsRef, {
      shop_name: companyName.trim(),
      business_type: "retail",
      owner_name: "Owner",
      gstin: gstin ? gstin.trim().toUpperCase() : "",
      email: email.trim().toLowerCase(),
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString()
    });

    const ownerProfileRef = doc(db, "companies", companyId, "users", ownerUser.uid);
    batch1.set(ownerProfileRef, {
      id: ownerUser.uid,
      name: "Owner",
      email: email.trim().toLowerCase(),
      contact_email: email.trim().toLowerCase(),
      contact_mobile: phone ? phone.trim() : "",
      profile_password: encryptPassword(password),
      role_id: "role-owner",
      branch_id: null,
      is_active: true,
      user_code: "ADMIN-001",
      salary: 150000,
      assigned_at: new Date().toISOString()
    });

    // Write onboarding audit log
    const auditLogsRef = doc(collection(db, "companies", companyId, "auditLogs"));
    batch1.set(auditLogsRef, {
      action: "COMPANY_ONBOARD",
      userId: ownerUser.uid,
      entityType: "Company",
      entityId: companyId,
      branchId: null,
      description: `Company ${companyName} registered and provisioned successfully. ID: ${companyId} (Client Fallback)`,
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString()
    });

    // Commit base infrastructure first
    await batch1.commit();

    // Now seed Roles, Permissions, and SensitiveFieldAccess in separate batches
    // to avoid the 20 document getAfter limit in Firestore rules.
    const batch2 = writeBatch(db);
    defaultRoles.forEach(role => {
      const ref = doc(db, "companies", companyId, "roles", role.id);
      batch2.set(ref, role);
    });
    await batch2.commit();

    const batch3 = writeBatch(db);
    defaultPermissions.forEach(perm => {
      const ref = doc(db, "companies", companyId, "permissions", perm.id);
      batch3.set(ref, perm);
    });
    await batch3.commit();

    const batch4 = writeBatch(db);
    defaultSensitiveFieldAccess.forEach(sfa => {
      const ref = doc(db, "companies", companyId, "sensitiveFieldAccess", sfa.id);
      batch4.set(ref, sfa);
    });
    await batch4.commit();

    // Send welcome email with Company ID via Cloud Function (fire-and-forget)
    try {
      const sendEmail = httpsCallable(firebaseFunctions, 'sendCompanyIdEmail');
      await sendEmail({ email: email.trim().toLowerCase(), companyName: companyName.trim(), companyId });
    } catch (emailErr) {
      console.warn("Client fallback: Welcome email sending failed (non-blocking)", emailErr);
    }

    // Since we created the user, they are currently signed in.
    // Sign out immediately so they can perform a clean login flow.
    await signOut(auth);

    return {
      success: true,
      companyId: companyId,
      userCode: "ADMIN-001"
    };
  }
};

export const manageStaffUser = async (data) => {
  try {
    const res = await manageStaffUserFn(data);
    return res.data;
  } catch (err) {
    console.warn("Calling Firebase Cloud Function manageStaffUser failed. Falling back to client-side user management.", err);
    const { action, companyId } = data;
    if (!action || !companyId) {
      throw new Error("Missing required action or companyId.");
    }

    if (action === "CREATE") {
      const { userCode, email, name, password, roleId, salary, branchId, contact_email, contact_mobile, staff_id } = data;
      if (!userCode || !email || !password || !roleId) {
        throw new Error("Missing required staff registration parameters.");
      }

      // Check if userCode is already taken in this tenant
      const q = query(collection(db, "companies", companyId, "users"), where("user_code", "==", userCode.trim().toUpperCase()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        throw new Error(`User Code ${userCode} is already registered under this company.`);
      }

      const secondaryApp = initSecondaryApp(firebaseConfig, `secondary-${Date.now()}`);
      const secondaryAuth = getAuth(secondaryApp);

      try {
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email.trim().toLowerCase(), password);
        const newStaffUser = userCredential.user;

        // Write user details to tenant's user collection
        const userDocRef = doc(db, "companies", companyId, "users", newStaffUser.uid);
        const batch = writeBatch(db);
        batch.set(userDocRef, {
          id: newStaffUser.uid,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          contact_email: contact_email ? contact_email.trim().toLowerCase() : "",
          contact_mobile: contact_mobile ? contact_mobile.trim() : "",
          staff_id: staff_id ? staff_id.trim() : "",
          profile_password: encryptPassword(password),
          role_id: roleId,
          branch_id: branchId || "MAIN",
          is_active: true,
          user_code: userCode.trim().toUpperCase(),
          salary: salary ? Number(salary) : 0,
          assigned_by: auth.currentUser?.uid || null,
          assigned_at: new Date().toISOString()
        });

        // Log action to Tenant Audit Log subcollection
        const auditRef = doc(collection(db, "companies", companyId, "auditLogs"));
        batch.set(auditRef, {
          action: "USER_CREATE",
          userId: auth.currentUser?.uid || null,
          entityType: "User",
          entityId: newStaffUser.uid,
          branchId: branchId || "MAIN",
          description: `Staff user ${userCode} (${name}) created (Client Fallback).`,
          timestamp: serverTimestamp(),
          createdAt: new Date().toISOString()
        });

        await batch.commit();

        return {
          success: true,
          user: {
            uid: newStaffUser.uid,
            ...data
          }
        };
      } finally {
        await deleteApp(secondaryApp);
      }
    } else if (action === "UPDATE") {
      const { uid, is_active } = data;
      if (!uid) {
        throw new Error("Missing target user UID.");
      }

      const userRef = doc(db, "companies", companyId, "users", uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        throw new Error("Target user profile not found.");
      }

      const targetData = userSnap.data();
      const updates = {};
      if (is_active !== undefined) updates.is_active = is_active;
      if (data.name) updates.name = data.name;
      if (data.salary !== undefined) updates.salary = Number(data.salary);
      if (data.branchId) updates.branch_id = data.branchId;
      if (data.roleId) updates.role_id = data.roleId;
      if (data.userCode) updates.user_code = data.userCode.trim().toUpperCase();
      if (data.email) updates.email = data.email.trim().toLowerCase();
      if (data.contact_email !== undefined) updates.contact_email = data.contact_email.trim().toLowerCase();
      if (data.contact_mobile !== undefined) updates.contact_mobile = data.contact_mobile.trim();
      if (data.staff_id !== undefined) updates.staff_id = data.staff_id.trim();

      if (data.password) {
        updates.profile_password = encryptPassword(data.password);
      }

      await updateDoc(userRef, updates);

      // Log action to Tenant Audit Log
      const auditRef = doc(collection(db, "companies", companyId, "auditLogs"));
      const batch = writeBatch(db);
      batch.set(auditRef, {
        action: "USER_UPDATE",
        userId: auth.currentUser?.uid || null,
        entityType: "User",
        entityId: uid,
        branchId: targetData.branch_id || "MAIN",
        description: `Staff user ${targetData.user_code} updated (Client Fallback).`,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString()
      });
      await batch.commit();

      return { success: true };
    } else if (action === "DELETE") {
      const { uid } = data;
      if (!uid) {
        throw new Error("Missing target user UID.");
      }

      const userRef = doc(db, "companies", companyId, "users", uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        throw new Error("Target user profile not found.");
      }

      const targetData = userSnap.data();
      await deleteDoc(userRef);

      // Log action to Tenant Audit Log
      const auditRef = doc(collection(db, "companies", companyId, "auditLogs"));
      const batch = writeBatch(db);
      batch.set(auditRef, {
        action: "USER_DELETE",
        userId: auth.currentUser?.uid || null,
        entityType: "User",
        entityId: uid,
        branchId: targetData.branch_id || "MAIN",
        description: `Staff user ${targetData.user_code} deleted (Client Fallback).`,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString()
      });
      await batch.commit();

      return { success: true };
    }
  }
  throw new Error(`Unsupported user management action.`);
};
