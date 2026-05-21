import { getAuth, signInWithEmailAndPassword, signOut, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getDoc, doc, setDoc, updateDoc, collection } from "firebase/firestore";
import { db, auth } from "@/firebase/config";

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
  const internalEmail = `${formattedUserCode}@${formattedCompanyId.replace("-", "")}.gstbill.app`;

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
      const emailQuery = query(companiesRef, where("admin_email", "==", email.trim().toLowerCase()));
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
