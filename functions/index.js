const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();

/**
 * registerTenant
 * Registers a new company workspace, sets up default roles/permissions/settings,
 * creates the owner auth account, and maps Custom Claims.
 */
exports.registerTenant = functions.https.onCall(async (data, context) => {
  const { email, password, companyName, gstin } = data;
  const phone = data.phone || data.mobile || data.admin_mobile || "";
  if (!email || !password || !companyName) {
    throw new functions.https.HttpsError("invalid-argument", "Missing required onboarding fields (email, password, companyName).");
  }

  // Format and validate GSTIN if provided
  if (gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin.trim().toUpperCase())) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid GSTIN format.");
  }

  try {
    // Generate a unique companyId (e.g. COMPANY-4279)
    const cleanedName = companyName.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 8);
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const companyId = `${cleanedName}-${randomSuffix}`;

    // Create Owner in Firebase Auth (direct login email)
    let ownerUser;
    try {
      ownerUser = await auth.createUser({
        email: email.trim().toLowerCase(),
        password: password,
        displayName: "Owner"
      });
    } catch (authErr) {
      if (authErr.code === "auth/email-already-exists") {
        // Retrieve existing user
        ownerUser = await auth.getUserByEmail(email.trim().toLowerCase());
        // Update password to ensure it matches
        await auth.updateUser(ownerUser.uid, { password: password });
      } else {
        throw authErr;
      }
    }

    // Set Owner Custom Claims
    await auth.setCustomUserClaims(ownerUser.uid, {
      company_id: companyId,
      role: "owner",
      is_active: true,
      user_code: "ADMIN-001"
    });

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

    const batch = db.batch();

    // Write Company Metadata with complete schema initialized
    const companyRef = db.doc(`companies/${companyId}`);
    batch.set(companyRef, {
      name: companyName.trim(),
      business_name: companyName.trim(),
      gstin: gstin ? gstin.trim().toUpperCase() : "",
      created_at: admin.firestore.FieldValue.serverTimestamp(),
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
    const settingsRef = db.doc(`companies/${companyId}/shopSettings/seed-settings`);
    batch.set(settingsRef, {
      shop_name: companyName.trim(),
      business_type: "retail",
      owner_name: "Owner",
      gstin: gstin ? gstin.trim().toUpperCase() : "",
      email: email.trim().toLowerCase(),
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString()
    });

    // Write Owner profile to Tenant collection
    const ownerProfileRef = db.doc(`companies/${companyId}/users/${ownerUser.uid}`);
    batch.set(ownerProfileRef, {
      id: ownerUser.uid,
      name: "Owner",
      email: email.trim().toLowerCase(),
      contact_email: email.trim().toLowerCase(),
      contact_mobile: phone ? phone.trim() : "",
      profile_password: "enc:" + Buffer.from(password).toString("base64"),
      role_id: "role-owner",
      branch_id: null,
      is_active: true,
      user_code: "ADMIN-001",
      salary: 150000,
      assigned_at: new Date().toISOString()
    });

    // Write Roles
    defaultRoles.forEach(role => {
      const ref = db.doc(`companies/${companyId}/roles/${role.id}`);
      batch.set(ref, role);
    });

    // Write Permissions
    defaultPermissions.forEach(perm => {
      const ref = db.doc(`companies/${companyId}/permissions/${perm.id}`);
      batch.set(ref, perm);
    });

    // Write SensitiveFieldAccess
    defaultSensitiveFieldAccess.forEach(sfa => {
      const ref = db.doc(`companies/${companyId}/sensitiveFieldAccess/${sfa.id}`);
      batch.set(ref, sfa);
    });

    await batch.commit();

    // Log onboarding action to Audit Log subcollection
    await db.collection(`companies/${companyId}/auditLogs`).add({
      action: "COMPANY_ONBOARD",
      userId: ownerUser.uid,
      entityType: "Company",
      entityId: companyId,
      branchId: null,
      description: `Company ${companyName} registered and provisioned successfully. ID: ${companyId}`,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString()
    });

    // Send welcome email with Company ID (fire-and-forget, don't block registration)
    try {
      await sendWelcomeEmailInternal(email.trim().toLowerCase(), companyName.trim(), companyId);
    } catch (emailErr) {
      console.warn("Welcome email failed (non-blocking):", emailErr.message);
    }

    return {
      success: true,
      companyId: companyId,
      userCode: "ADMIN-001"
    };

  } catch (error) {
    console.error("Onboarding failed:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * manageStaffUser
 * Handles creation, updates, and activation toggling of staff members
 * while enforcing hierarchical security rules.
 */
exports.manageStaffUser = functions.https.onCall(async (data, context) => {
  // 1. Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Authentication required.");
  }

  const callerUid = context.auth.uid;
  const callerClaims = context.auth.token;
  const { action, companyId } = data;

  if (!action || !companyId) {
    throw new functions.https.HttpsError("invalid-argument", "Missing required action or companyId.");
  }

  // Ensure caller belongs to the same tenant
  if (callerClaims.company_id !== companyId) {
    throw new functions.https.HttpsError("permission-denied", "Unauthorized tenant access.");
  }

  // Resolve caller hierarchy level
  const callerRoleName = callerClaims.role || "cashier";
  const roleHierarchyMap = {
    owner: 1,
    ceo: 2,
    ca: 3,
    accountant: 4,
    store_manager: 5,
    warehouse_manager: 6,
    cashier: 7
  };
  const callerHierarchy = roleHierarchyMap[callerRoleName] || 7;

  // Only Owner (1), CEO (2), CA (3) have staff management administrative clearance
  if (callerHierarchy > 3) {
    throw new functions.https.HttpsError("permission-denied", "Insufficient clearance to manage user accounts.");
  }

  if (action === "CREATE") {
    const { userCode, email, name, password, roleId, salary, branchId, contact_email, contact_mobile, staff_id } = data;
    if (!userCode || !email || !password || !roleId) {
      throw new functions.https.HttpsError("invalid-argument", "Missing required staff registration parameters.");
    }

    // Resolve target role hierarchy
    const targetRoleName = roleId.replace("role-", "");
    const targetHierarchy = roleHierarchyMap[targetRoleName] || 7;

    // Enforce hierarchical restriction: target role level must be strictly lower than caller's
    if (targetHierarchy <= callerHierarchy) {
      throw new functions.https.HttpsError("permission-denied", "Forbidden: You cannot assign a role equal to or higher than your own.");
    }

    try {
      // Verify userCode is not already taken in this tenant
      const existingUserQuery = await db.collection(`companies/${companyId}/users`)
        .where("user_code", "==", userCode.trim().toUpperCase())
        .get();
      if (!existingUserQuery.empty) {
        throw new functions.https.HttpsError("already-exists", `User Code ${userCode} is already registered under this company.`);
      }

      // Create Firebase Auth user
      const newStaffUser = await auth.createUser({
        email: email.trim().toLowerCase(),
        password: password,
        displayName: name.trim()
      });

      // Set custom token claims
      await auth.setCustomUserClaims(newStaffUser.uid, {
        company_id: companyId,
        role: targetRoleName,
        is_active: true,
        user_code: userCode.trim().toUpperCase()
      });

      // Write user details to tenant's user collection
      await db.doc(`companies/${companyId}/users/${newStaffUser.uid}`).set({
        id: newStaffUser.uid,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        contact_email: contact_email ? contact_email.trim().toLowerCase() : "",
        contact_mobile: contact_mobile ? contact_mobile.trim() : "",
        staff_id: staff_id ? staff_id.trim() : "",
        profile_password: "enc:" + Buffer.from(password).toString("base64"),
        role_id: roleId,
        branch_id: branchId || "MAIN",
        is_active: true,
        user_code: userCode.trim().toUpperCase(),
        salary: salary ? Number(salary) : 0,
        assigned_by: callerUid,
        assigned_at: new Date().toISOString()
      });

      // Log action to Tenant Audit Log subcollection
      await db.collection(`companies/${companyId}/auditLogs`).add({
        action: "USER_CREATE",
        userId: callerUid,
        entityType: "User",
        entityId: newStaffUser.uid,
        branchId: branchId || "MAIN",
        description: `Staff user ${userCode} (${name}) created by ${callerClaims.user_code || callerUid}.`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: new Date().toISOString()
      });

      return { success: true, uid: newStaffUser.uid };

    } catch (error) {
      console.error("Staff creation failed:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }

  } else if (action === "UPDATE") {
    const { uid, is_active } = data;
    if (!uid) {
      throw new functions.https.HttpsError("invalid-argument", "Missing target user UID.");
    }

    try {
      // Resolve target user record details
      const targetUserDoc = await db.doc(`companies/${companyId}/users/${uid}`).get();
      if (!targetUserDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Target user profile not found.");
      }

      const targetData = targetUserDoc.data();
      const targetRoleName = targetData.role_id.replace("role-", "");
      const targetHierarchy = roleHierarchyMap[targetRoleName] || 7;

      // Enforce hierarchical restriction: target role level must be strictly lower than caller's
      if (targetHierarchy <= callerHierarchy) {
        throw new functions.https.HttpsError("permission-denied", "Forbidden: You cannot modify a user with an equal or higher authority level.");
      }

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
        updates.profile_password = "enc:" + Buffer.from(data.password).toString("base64");
      }

      await db.doc(`companies/${companyId}/users/${uid}`).update(updates);

      // Securely update password in Firebase Auth if provided
      if (data.password) {
        await auth.updateUser(uid, { password: data.password });
      }

      // Propagate custom claims if role, active status, or user code changes
      if (data.roleId || is_active !== undefined || data.userCode) {
        const finalRole = data.roleId ? data.roleId.replace("role-", "") : targetRoleName;
        const finalActive = is_active !== undefined ? is_active : (targetData.is_active !== undefined ? targetData.is_active : true);
        const finalUserCode = data.userCode ? data.userCode.trim().toUpperCase() : (targetData.user_code || "");
        
        await auth.setCustomUserClaims(uid, {
          company_id: companyId,
          role: finalRole,
          is_active: finalActive,
          user_code: finalUserCode
        });

        // Revoke tokens to force immediate logout/refresh
        await auth.revokeRefreshTokens(uid);
      }

      // Log action to Tenant Audit Log subcollection
      await db.collection(`companies/${companyId}/auditLogs`).add({
        action: "USER_UPDATE",
        userId: callerUid,
        entityType: "User",
        entityId: uid,
        branchId: targetData.branch_id || "MAIN",
        description: `Staff user ${targetData.user_code} updated by ${callerClaims.user_code || callerUid}.`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: new Date().toISOString()
      });

      return { success: true };

    } catch (error) {
      console.error("Staff update failed:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  }

  throw new functions.https.HttpsError("invalid-argument", `Unsupported user management action: ${action}`);
});

const nodemailer = require("nodemailer");

// Create reusable transporter object using the default SMTP transport
// You can replace these with your actual SMTP credentials or environment variables
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: 'YOUR_EMAIL@gmail.com', // Replace with your email
    pass: 'YOUR_APP_PASSWORD'     // Replace with your app password
  }
});

async function sendWelcomeEmailInternal(email, companyName, companyId) {
  const mailOptions = {
    from: '"GST Billing App" <noreply@gstbillingapp.com>', // sender address
    to: email, // list of receivers
    subject: "Welcome to GST Billing! Here is your Company ID", // Subject line
    text: `Hello ${companyName},\n\nWelcome to GST Billing! Your company has been registered successfully.\n\nYour Company ID is: ${companyId}\n\nPlease keep this ID safe and share it with your staff so they can log in to your workspace.\n\nThank you,\nGST Billing Team`, // plain text body
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Welcome to GST Billing!</h2>
        <p>Hello <b>${companyName}</b>,</p>
        <p>Your company has been registered successfully.</p>
        <div style="background-color: #f4f4f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #666;">Your Company ID:</p>
          <h3 style="margin: 5px 0 0 0; font-size: 24px; color: #4f46e5; letter-spacing: 2px;">${companyId}</h3>
        </div>
        <p>Please keep this ID safe. You will need to share it with your staff members so they can log in to your workspace.</p>
        <br>
        <p>Thank you,<br>GST Billing Team</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Message sent: %s", info.messageId);
  } catch (error) {
    console.error("Error sending email: ", error);
    // Don't throw the error so it doesn't break the registration flow
  }
}

exports.sendCompanyIdEmail = functions.https.onCall(async (data, context) => {
  const { email, companyName, companyId } = data;
  if (!email || !companyName || !companyId) {
    throw new functions.https.HttpsError("invalid-argument", "Missing required fields.");
  }
  await sendWelcomeEmailInternal(email, companyName, companyId);
  return { success: true };
});

exports.sendRegistrationOtp = functions.https.onCall(async (data, context) => {
  const { email } = data;
  if (!email) {
    throw new functions.https.HttpsError("invalid-argument", "Email is required.");
  }

  const normalizedEmail = email.trim().toLowerCase();
  
  // Generate 6-digit OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Expiration: 10 minutes from now
  const expiresAt = Date.now() + 10 * 60 * 1000;

  try {
    await db.collection("registration_otps").doc(normalizedEmail).set({
      otp: otpCode,
      expiresAt: expiresAt,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      attempts: 0
    });

    const mailOptions = {
      from: '"GST Billing App" <noreply@gstbillingapp.com>',
      to: normalizedEmail,
      subject: "Your Registration OTP - GST Billing",
      text: `Your OTP for registration is: ${otpCode}\n\nThis OTP is valid for 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2>GST Billing Registration</h2>
          <p>You requested to register a new workspace.</p>
          <div style="background-color: #f4f4f5; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; font-size: 14px; color: #666;">Your Verification Code:</p>
            <h3 style="margin: 10px 0 0 0; font-size: 32px; color: #4f46e5; letter-spacing: 4px;">${otpCode}</h3>
          </div>
          <p style="color: #666; font-size: 12px;">This code is valid for 10 minutes. Do not share it with anyone.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error("Failed to send OTP:", error);
    
    // Fallback for development/testing: 
    // If the email fails to send for any reason (unconfigured SMTP, network, etc.),
    // we bypass the failure so the user can still complete registration testing.
    return { 
      success: true, 
      warning: "Email sending failed. Using development mode OTP.",
      developmentOtp: otpCode,
      debugError: error.message
    };
  }
});

exports.verifyRegistrationOtp = functions.https.onCall(async (data, context) => {
  const { email, otp } = data;
  if (!email || !otp) {
    throw new functions.https.HttpsError("invalid-argument", "Email and OTP are required.");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const docRef = db.collection("registration_otps").doc(normalizedEmail);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    throw new functions.https.HttpsError("not-found", "No OTP found for this email. Please request a new one.");
  }

  const otpData = docSnap.data();

  if (Date.now() > otpData.expiresAt) {
    throw new functions.https.HttpsError("failed-precondition", "OTP has expired. Please request a new one.");
  }

  if (otpData.attempts >= 5) {
    throw new functions.https.HttpsError("resource-exhausted", "Too many failed attempts. Please request a new OTP.");
  }

  if (otpData.otp !== otp.trim()) {
    await docRef.update({ attempts: admin.firestore.FieldValue.increment(1) });
    throw new functions.https.HttpsError("invalid-argument", "Invalid OTP.");
  }

  // OTP verified successfully. Delete the OTP document so it can't be reused.
  await docRef.delete();

  return { success: true };
});

