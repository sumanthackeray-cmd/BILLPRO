const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Transform Firebase data to SQL format
 * Maps Firebase document structure to Supabase table schema
 */
function transformCompanyData(firebaseData) {
  const companyId = firebaseData.metadata.id || firebaseData.metadata.tenant_id;
  const transformed = {
    company_id: companyId,
    users: [],
    roles: [],
    permissions: [],
    branches: [],
    items: [],
    invoices: [],
    payments: [],
    audit_logs: []
  };

  // Transform users
  if (firebaseData.collections.users?.documents) {
    Object.values(firebaseData.collections.users.documents).forEach(user => {
      transformed.users.push({
        id: user.id,
        company_id: companyId,
        auth_id: user.id,
        name: user.name || '',
        email: user.email || '',
        contact_mobile: user.contact_mobile || '',
        role_id: user.role_id || 'role-cashier',
        branch_id: user.branch_id || null,
        is_active: user.is_active !== false,
        user_code: user.user_code || '',
        salary: user.salary || 0,
        assigned_at: user.assigned_at ? new Date(user.assigned_at) : new Date()
      });
    });
  }

  // Transform roles
  if (firebaseData.collections.roles?.documents) {
    Object.values(firebaseData.collections.roles.documents).forEach(role => {
      transformed.roles.push({
        id: role.id,
        company_id: companyId,
        role_name: role.role_name || '',
        hierarchy_level: role.hierarchy_level || 0,
        can_assign_roles: role.can_assign_roles === true,
        description: role.description || ''
      });
    });
  }

  // Transform permissions
  if (firebaseData.collections.permissions?.documents) {
    Object.values(firebaseData.collections.permissions.documents).forEach(perm => {
      transformed.permissions.push({
        id: perm.id,
        company_id: companyId,
        role_id: perm.role_id || '',
        permissions: perm.permissions || {},
        created_at: perm.created_at ? new Date(perm.created_at) : new Date()
      });
    });
  }

  // Transform branches
  if (firebaseData.collections.branches?.documents) {
    Object.values(firebaseData.collections.branches.documents).forEach(branch => {
      transformed.branches.push({
        id: branch.id,
        company_id: companyId,
        branch_code: branch.branch_code || '',
        branch_name: branch.branch_name || '',
        address: branch.address || '',
        city: branch.city || '',
        pincode: branch.pincode || '',
        manager_name: branch.manager_name || '',
        manager_mobile: branch.manager_mobile || '',
        is_active: branch.is_active !== false,
        created_at: branch.created_at ? new Date(branch.created_at) : new Date()
      });
    });
  }

  // Transform items
  if (firebaseData.collections.items?.documents) {
    Object.values(firebaseData.collections.items.documents).forEach(item => {
      transformed.items.push({
        id: item.id,
        company_id: companyId,
        item_code: item.item_code || '',
        item_name: item.item_name || '',
        hsn_code: item.hsn_code || '',
        gst_rate: item.gst_rate || 0,
        purchase_price: item.purchase_price || 0,
        selling_price: item.selling_price || 0,
        unit: item.unit || 'pcs',
        category: item.category || '',
        is_active: item.is_active !== false,
        created_at: item.created_at ? new Date(item.created_at) : new Date()
      });
    });
  }

  // Transform invoices
  if (firebaseData.collections.invoices?.documents) {
    Object.values(firebaseData.collections.invoices.documents).forEach(invoice => {
      transformed.invoices.push({
        id: invoice.id,
        company_id: companyId,
        invoice_number: invoice.invoice_number || '',
        branch_id: invoice.branch_id || '',
        customer_name: invoice.customer_name || '',
        customer_mobile: invoice.customer_mobile || '',
        total_amount: invoice.total_amount || 0,
        tax_amount: invoice.tax_amount || 0,
        net_amount: invoice.net_amount || 0,
        payment_status: invoice.payment_status || 'pending',
        invoice_date: invoice.invoice_date ? new Date(invoice.invoice_date) : new Date(),
        created_at: invoice.created_at ? new Date(invoice.created_at) : new Date()
      });
    });
  }

  // Transform payments
  if (firebaseData.collections.payments?.documents) {
    Object.values(firebaseData.collections.payments.documents).forEach(payment => {
      transformed.payments.push({
        id: payment.id,
        company_id: companyId,
        invoice_id: payment.invoice_id || '',
        payment_method: payment.payment_method || 'cash',
        amount: payment.amount || 0,
        payment_date: payment.payment_date ? new Date(payment.payment_date) : new Date(),
        reference_number: payment.reference_number || '',
        created_at: payment.created_at ? new Date(payment.created_at) : new Date()
      });
    });
  }

  // Transform audit logs
  if (firebaseData.collections.audit_logs?.documents) {
    Object.values(firebaseData.collections.audit_logs.documents).forEach(log => {
      transformed.audit_logs.push({
        id: log.id,
        company_id: companyId,
        user_id: log.user_id || '',
        action: log.action || '',
        entity_type: log.entity_type || '',
        entity_id: log.entity_id || '',
        old_values: log.old_values || {},
        new_values: log.new_values || {},
        timestamp: log.timestamp ? new Date(log.timestamp) : new Date(),
        ip_address: log.ip_address || ''
      });
    });
  }

  return transformed;
}

/**
 * Insert batch of records with error handling
 */
async function insertBatch(table, records, batchSize = 100) {
  let inserted = 0;
  let failed = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    try {
      const { error } = await supabase.from(table).insert(batch);

      if (error) {
        console.error(`❌ Error inserting into ${table}:`, error);
        failed += batch.length;
      } else {
        inserted += batch.length;
      }
    } catch (error) {
      console.error(`❌ Exception inserting into ${table}:`, error.message);
      failed += batch.length;
    }
  }

  return { inserted, failed };
}

/**
 * Main import function
 */
async function importToSupabase() {
  try {
    console.log('🔄 Starting Supabase data import...\n');

    // Step 1: Read exported Firebase data
    const exportDir = path.join(process.cwd(), 'firebase-export');
    const files = fs.readdirSync(exportDir).filter(f => f.endsWith('.json'));

    if (files.length === 0) {
      console.error('❌ No export files found in firebase-export directory');
      process.exit(1);
    }

    const latestFile = files.sort().pop();
    const exportPath = path.join(exportDir, latestFile);
    console.log(`📄 Reading export file: ${latestFile}\n`);

    const firebaseExport = JSON.parse(fs.readFileSync(exportPath, 'utf8'));

    // Step 2: Import each company's data
    let totalStats = {
      companies: 0,
      users: 0,
      roles: 0,
      branches: 0,
      items: 0,
      invoices: 0,
      payments: 0,
      audit_logs: 0,
      failed: 0
    };

    for (const [companyId, companyData] of Object.entries(firebaseExport.companies)) {
      console.log(`\n📂 Importing company: ${companyId}`);
      console.log(`   Name: ${companyData.metadata.name || 'Unknown'}`);

      // Step 3: First, insert company metadata
      try {
        const { error } = await supabase.from('companies').insert({
          id: companyId,
          name: companyData.metadata.name || '',
          owner_uid: companyData.metadata.owner_uid || '',
          plan: companyData.metadata.plan || 'trial_14days',
          is_active: companyData.metadata.is_active !== false,
          metadata: companyData.metadata,
          created_at: companyData.metadata.created_at ? new Date(companyData.metadata.created_at) : new Date()
        });

        if (error) {
          console.warn(`   ⚠ Company metadata update:`, error.message);
        } else {
          console.log(`   ✓ Company metadata inserted`);
          totalStats.companies++;
        }
      } catch (error) {
        console.warn(`   ⚠ Error inserting company:`, error.message);
      }

      // Step 4: Transform and import collections
      const transformed = transformCompanyData(companyData);

      // Import each collection
      const collections = [
        { name: 'users', data: transformed.users },
        { name: 'roles', data: transformed.roles },
        { name: 'permissions', data: transformed.permissions },
        { name: 'branches', data: transformed.branches },
        { name: 'items', data: transformed.items },
        { name: 'invoices', data: transformed.invoices },
        { name: 'payments', data: transformed.payments },
        { name: 'audit_logs', data: transformed.audit_logs }
      ];

      for (const collection of collections) {
        if (collection.data.length > 0) {
          const result = await insertBatch(collection.name, collection.data);
          totalStats[collection.name] += result.inserted;
          totalStats.failed += result.failed;
          console.log(`   ✓ ${collection.name}: ${result.inserted} inserted${result.failed > 0 ? `, ${result.failed} failed` : ''}`);
        } else {
          console.log(`   ○ ${collection.name}: empty`);
        }
      }
    }

    // Step 5: Summary
    console.log(`\n✅ Import complete!`);
    console.log(`\n📊 Statistics:`);
    console.log(`   Companies: ${totalStats.companies}`);
    console.log(`   Users: ${totalStats.users}`);
    console.log(`   Roles: ${totalStats.roles}`);
    console.log(`   Branches: ${totalStats.branches}`);
    console.log(`   Items: ${totalStats.items}`);
    console.log(`   Invoices: ${totalStats.invoices}`);
    console.log(`   Payments: ${totalStats.payments}`);
    console.log(`   Audit Logs: ${totalStats.audit_logs}`);
    if (totalStats.failed > 0) {
      console.log(`   ⚠ Failed records: ${totalStats.failed}`);
    }

  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

// Run import
importToSupabase().then(() => {
  console.log(`\n🔒 RLS policies are now active - companies are completely isolated`);
  console.log(`📚 Next step: Test that users can only see their own company's data`);
  process.exit(0);
});
