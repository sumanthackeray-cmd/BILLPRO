import { getAuth, signInWithEmailAndPassword, signOut, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getDoc, doc, setDoc, updateDoc, collection } from "firebase/firestore";
import { db, auth } from "@/firebase/config";
import { base44 } from "@/api/base44Client";


export async function prePopulateLoginCache(firebaseUser, companyId, userCode) {
  try {
    // 1. Fetch all authentication resources in parallel (Users, Roles, Permissions, field access maps)
    const [usersList, roles, permissions, sensitiveFieldAccess] = await Promise.all([
      base44.entities.User.list().catch(e => { console.error("Error listing users in cache warmup:", e); return []; }),
      base44.entities.Role.list().catch(e => { console.error("Error listing roles in cache warmup:", e); return []; }),
      base44.entities.Permission.list().catch(e => { console.error("Error listing permissions in cache warmup:", e); return []; }),
      base44.entities.SensitiveFieldAccess.list().catch(e => { console.error("Error listing sensitive field access in cache warmup:", e); return []; })
    ]);

    let userRecord = usersList.find(u => u.id === firebaseUser.uid);
    
    if (!userRecord) {
      // First registered user is the owner, others are cashiers
      const isFirstUser = usersList.length === 0;
      const defaultRole = isFirstUser ? "role-owner" : "role-cashier";
      const defaultSalary = isFirstUser ? 150000 : 18000;
      
      userRecord = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
        email: firebaseUser.email,
        role_id: defaultRole,
        branch_id: null,
        is_active: true,
        assigned_by: null,
        assigned_at: new Date().toISOString(),
        salary: defaultSalary
      };
      
      try {
        await base44.entities.User.create(userRecord);
      } catch (e) {
        console.error("Error creating user record in cache warmup:", e);
      }
    }

    const matchingRole = roles.find(r => r.id === userRecord.role_id) || roles.find(r => r.role_name === 'cashier') || { role_name: 'cashier', hierarchy_level: 7 };
    const matchingPermission = permissions.find(p => p.role_id === userRecord.role_id) || {
      permissions: {
        pos: { view: true, create: true, edit: false, delete: false, export: false },
        inventory: { view: false, create: false, edit: false, delete: false, export: false },
        accounting: { view: false, create: false, edit: false, delete: false, export: false },
        warehouse: { view: false, create: false, edit: false, delete: false, export: false },
        hr: { view: false, create: false, edit: false, delete: false, export: false, attendance: true, payslip: true },
        reports: { view: false, create: false, edit: false, delete: false, export: false }
      }
    };
    const matchingSensitiveFieldAccess = sensitiveFieldAccess.find(s => s.role_id === userRecord.role_id) || {
      fields: { purchase_price: false, profit_margin: false, salary: false }
    };

    const rbacProfile = {
      role_name: matchingRole.role_name,
      hierarchy_level: matchingRole.hierarchy_level,
      permissions: matchingPermission.permissions,
      sensitive_fields: matchingSensitiveFieldAccess.fields,
      is_active: userRecord.is_active
    };

    // Cache profile for base44Client
    localStorage.setItem(`rbac_profile_${firebaseUser.uid}`, JSON.stringify(rbacProfile));

    const currentUser = {
      id: firebaseUser.uid,
      email: firebaseUser.email,
      name: userRecord.name || firebaseUser.displayName,
      full_name: userRecord.name || firebaseUser.displayName || firebaseUser.email.split('@')[0],
      displayName: userRecord.name || firebaseUser.displayName,
      role: matchingRole.role_name,
      role_id: userRecord.role_id,
      hierarchy_level: matchingRole.hierarchy_level,
      permissions: matchingPermission.permissions,
      sensitive_fields: matchingSensitiveFieldAccess.fields,
      is_active: userRecord.is_active,
      branch_id: userRecord.branch_id,
      salary: userRecord.salary,
      phone: userRecord.contact_mobile || userRecord.phone || userRecord.mobile || firebaseUser.phoneNumber || "",
      contact_mobile: userRecord.contact_mobile || "",
      contact_email: userRecord.contact_email || userRecord.email || firebaseUser.email || "",
      user_code: userRecord.user_code || userCode || localStorage.getItem('user_code') || "",
    };

    localStorage.setItem('base44_cached_user', JSON.stringify(currentUser));
  } catch (err) {
    console.error("RBAC Profile load failed in cache warmup:", err);
  }
}

export async function checkCompanyExists(companyId) {
  const companyRef = doc(db, "companies", companyId);
  const companySnap = await getDoc(companyRef);
  return companySnap.exists();
}

export async function staffLogin(companyId, userCode, password) {
  const formattedCompanyId = companyId.trim().toUpperCase();
  const formattedUserCode = userCode.trim().toUpperCase();

  // 1. Verify company exists
  const companyExists = await checkCompanyExists(formattedCompanyId);
  if (!companyExists) {
    throw new Error("Invalid Company ID. Company does not exist.");
  }

  // 2. Construct internal email
  const internalEmail = `${formattedUserCode}@${formattedCompanyId.replace("-", "")}.easybmt.app`;

  // 3. Authenticate with Firebase
  await setPersistence(auth, browserLocalPersistence);
  const userCredential = await signInWithEmailAndPassword(auth, internalEmail, password);
  const firebaseUser = userCredential.user;

  // 4. Force token refresh to parse Claims
  const tokenResult = await firebaseUser.getIdTokenResult(true);
  const claims = tokenResult.claims;

  // 5. Verify claims match or fall back to Firestore
  let userActive = claims.is_active;
  let userCompanyId = claims.company_id;
  let role = claims.role;

  if (!userCompanyId) {
    // Fallback: check Firestore for the user doc under /companies/{companyId}/users/{uid}
    const userDocRef = doc(db, `companies/${formattedCompanyId}/users`, firebaseUser.uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      userActive = userData.is_active;
      userCompanyId = formattedCompanyId;
      role = userData.role_id ? userData.role_id.replace("role-", "") : "cashier";
    }
  }

  if (userCompanyId !== formattedCompanyId) {
    await signOut(auth);
    throw new Error("Access Denied: Invalid company assignment.");
  }
  if (!userActive) {
    await signOut(auth);
    throw new Error("Access Denied: Your account is deactivated.");
  }

  // Save info in localStorage
  localStorage.setItem("company_id", formattedCompanyId);
  localStorage.setItem("user_code", formattedUserCode);
  localStorage.setItem("base44_access_token", tokenResult.token);
  localStorage.setItem("onboarding_completed", "true"); // Guarantee modal bypass

  // 6. Create Session document in Firestore
  const sessionId = doc(collection(db, "temp")).id; // generate unique ID
  localStorage.setItem("session_id", sessionId);

  const sessionRef = doc(db, `companies/${formattedCompanyId}/sessions`, sessionId);
  await setDoc(sessionRef, {
    uid: firebaseUser.uid,
    user_code: formattedUserCode,
    login_at: new Date().toISOString(),
    logout_at: null,
    ip: "127.0.0.1", // client-side fallback
    device: navigator.userAgent,
    is_active: true
  });

  // 7. Update User's last login in Firestore
  const userRef = doc(db, `companies/${formattedCompanyId}/users`, firebaseUser.uid);
  try {
    await updateDoc(userRef, {
      last_login: new Date().toISOString()
    });
  } catch (e) {
    console.warn("Failed to update last_login, trying setDoc with merge", e);
    await setDoc(userRef, {
      last_login: new Date().toISOString()
    }, { merge: true });
  }

  // Pre-populate caching layer instantly to support instant startup loading bypass
  await prePopulateLoginCache(firebaseUser, formattedCompanyId, formattedUserCode);

  return {
    user: firebaseUser,
    claims: {
      ...claims,
      company_id: userCompanyId,
      user_code: formattedUserCode,
      role: role || "cashier",
      is_active: userActive
    },
    sessionId,
    mustChangePassword: claims.must_change_password || false
  };
}

export async function ownerLogin(emailOrCompanyId, password) {
  let finalEmail = emailOrCompanyId.trim().toLowerCase();
  
  if (!finalEmail.includes('@')) {
    // Treat as Company ID
    const companyId = finalEmail.toUpperCase();
    const companyRef = doc(db, "companies", companyId);
    const companySnap = await getDoc(companyRef);
    if (!companySnap.exists()) {
      throw new Error("Invalid Company ID. No workspace found.");
    }
    const data = companySnap.data();
    if (data.admin_email) {
      finalEmail = data.admin_email;
    } else {
      throw new Error("No admin email associated with this Company ID.");
    }
  }

  // Owners can log in directly with their standard email address
  await setPersistence(auth, browserLocalPersistence);
  const userCredential = await signInWithEmailAndPassword(auth, finalEmail, password);
  const tokenResult = await userCredential.user.getIdTokenResult(true);
  const claims = tokenResult.claims;

  let companyId = claims.company_id;
  let role = claims.role;
  let userCode = claims.user_code || "ADMIN-001";

  if (!companyId || role !== "owner") {
    // Fallback: Check if there is a company where owner_uid == userCredential.user.uid
    const { query, collection, where, getDocs } = await import("firebase/firestore");
    const companiesRef = collection(db, "companies");
    
    let q = query(companiesRef, where("owner_uid", "==", userCredential.user.uid));
    let querySnapshot = await getDocs(q);

    // Secondary fallback: check admin_email if owner_uid is missing
    if (querySnapshot.empty) {
      const emailQuery = query(companiesRef, where("admin_email", "==", finalEmail));
      querySnapshot = await getDocs(emailQuery);
    }

    if (!querySnapshot.empty) {
      const companyDoc = querySnapshot.docs[0];
      companyId = companyDoc.id;
      role = "owner";
      userCode = "ADMIN-001";
    } else {
      await signOut(auth);
      throw new Error("No company workspace found for this email. Please register a new workspace or contact support.");
    }
  }

  localStorage.setItem("company_id", companyId);
  localStorage.setItem("user_code", userCode);
  localStorage.setItem("base44_access_token", tokenResult.token);
  localStorage.setItem("onboarding_completed", "true"); // Guarantee modal bypass

  // Pre-populate caching layer instantly to support instant startup loading bypass
  await prePopulateLoginCache(userCredential.user, companyId, userCode);

  return {
    user: userCredential.user,
    claims: {
      ...claims,
      company_id: companyId,
      role: role,
      user_code: userCode
    },
    mustChangePassword: false
  };
}
