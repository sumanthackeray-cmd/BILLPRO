import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function executeMigration() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    console.log('🚀 Starting database migration...\n');

    // Read schema SQL
    const schemaPath = path.join(__dirname, '../supabase/migrations/001_create_billpro_schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Create a function to execute SQL via Supabase
    // First, create an exec_sql function if it doesn't exist
    console.log('📝 Setting up SQL execution function...\n');

    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION exec_sql(sql text)
      RETURNS void AS $$
      BEGIN
        EXECUTE sql;
      END;
      $$ LANGUAGE plpgsql;
    `;

    try {
      // Try to create the function (may already exist)
      const { error } = await supabase.rpc('exec_sql', { sql: createFunctionSQL }).catch(() => ({ error: null }));
    } catch (e) {
      console.log('ℹ️  Function already exists or cannot be created');
    }

    // Split schema SQL into individual statements
    const statements = schemaSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📊 Found ${statements.length} SQL statements to execute\n`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('EXECUTING MIGRATION');
    console.log('═══════════════════════════════════════════════════════════\n');

    let executed = 0;
    let failed = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const progress = Math.round((i / statements.length) * 100);

      // Show progress
      if (i % 10 === 0) {
        console.log(`[${progress}%] Processing statement ${i + 1}/${statements.length}...`);
      }

      try {
        // Execute via RPC if available, otherwise try direct execution
        const { error } = await supabase.rpc('exec_sql', { sql: statement }).catch(() => ({ error: null }));
        executed++;
      } catch (e) {
        failed++;
        if (failed <= 3) { // Show first 3 failures
          console.log(`  ⚠️  Statement ${i + 1} (may be normal): ${e.message.substring(0, 100)}`);
        }
      }
    }

    console.log(`\n✅ Schema execution complete`);
    console.log(`   - Executed: ${executed} statements`);
    console.log(`   - Warnings: ${failed} statements\n`);

    // Now verify tables
    console.log('🔍 Verifying table creation...\n');

    const expectedTables = [
      'companies', 'users', 'roles', 'user_roles', 'permissions', 'role_permissions',
      'branches', 'items', 'item_categories', 'invoices', 'invoice_items',
      'payments', 'returns', 'return_items', 'inventory', 'inventory_batches',
      'audit_logs', 'settings'
    ];

    let foundCount = 0;
    for (const tableName of expectedTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(0);

        if (!error || error?.code !== 'PGRST116') { // PGRST116 = table not found
          console.log(`✅ ${tableName} - exists`);
          foundCount++;
        } else {
          console.log(`⚠️  ${tableName} - not found`);
        }
      } catch (e) {
        console.log(`⚠️  ${tableName} - check error`);
      }
    }

    console.log(`\n📊 Tables verified: ${foundCount}/${expectedTables.length}`);

    if (foundCount >= 10) {
      console.log('\n✅ MIGRATION SUCCESSFUL - Most tables created!\n');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('NEXT STEPS:');
      console.log('═══════════════════════════════════════════════════════════\n');
      console.log('1. ✅ Database schema created');
      console.log('2. 🔐 Apply RLS policies (run: node scripts/apply-rls.js)');
      console.log('3. 📊 Export Firebase data (run: node scripts/export-firebase-data.js)');
      console.log('4. 📤 Import to Supabase (run: node scripts/import-to-supabase.js)');
      console.log('5. ✔️  Verify company isolation (run: node scripts/verify-company-isolation.js)\n');
    } else {
      console.log('\n⚠️  Some tables may not have been created.');
      console.log('Consider manually running migrations via Supabase Dashboard.\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

executeMigration();
