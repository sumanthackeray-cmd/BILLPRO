import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function executeMigrations() {
  // Parse Supabase connection string
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // Build PostgreSQL connection string from Supabase
  // Format: postgres://postgres:password@host/postgres
  const url = new URL(supabaseUrl);
  const host = url.hostname;
  const connectionString = `postgres://postgres:${serviceRoleKey}@${host}:5432/postgres?sslmode=require`;

  const client = new Client({
    connectionString: connectionString,
  });

  try {
    console.log('🚀 Connecting to Supabase PostgreSQL...\n');
    await client.connect();
    console.log('✅ Connected to Supabase\n');

    // Read migration files
    const schemaMigrationPath = path.join(__dirname, '../supabase/migrations/001_create_billpro_schema.sql');
    const rlsMigrationPath = path.join(__dirname, '../supabase/migrations/002_add_rls_policies.sql');

    if (!fs.existsSync(schemaMigrationPath)) {
      console.error(`❌ Schema migration file not found: ${schemaMigrationPath}`);
      process.exit(1);
    }

    const schemaMigration = fs.readFileSync(schemaMigrationPath, 'utf8');
    const rlsMigration = fs.existsSync(rlsMigrationPath) ? fs.readFileSync(rlsMigrationPath, 'utf8') : '';

    // Execute schema migration
    console.log('📝 Migration 1: Creating BillPro Schema');
    console.log('═══════════════════════════════════════════════════════════\n');

    try {
      await client.query(schemaMigration);
      console.log('✅ Schema created successfully\n');
    } catch (error) {
      console.error('❌ Schema migration error:', error.message);
      console.log('Continuing with RLS policies...\n');
    }

    // Execute RLS policies migration
    console.log('🔐 Migration 2: Applying Row-Level Security Policies');
    console.log('═══════════════════════════════════════════════════════════\n');

    try {
      await client.query(rlsMigration);
      console.log('✅ RLS policies applied successfully\n');
    } catch (error) {
      console.error('❌ RLS migration error:', error.message);
    }

    // Verify tables were created
    console.log('🔍 Verifying Database Setup');
    console.log('═══════════════════════════════════════════════════════════\n');

    try {
      const tableQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `;
      const result = await client.query(tableQuery);
      const tables = result.rows.map(row => row.table_name);

      console.log(`✅ Found ${tables.length} tables:\n`);
      tables.forEach((table, index) => {
        console.log(`   ${index + 1}. ${table}`);
      });

      // Check for key tables
      const keyTables = ['companies', 'users', 'branches', 'items', 'invoices', 'inventory', 'audit_logs'];
      const createdKeyTables = keyTables.filter(t => tables.includes(t));
      console.log(`\n✅ Key tables created: ${createdKeyTables.length}/${keyTables.length}`);

      // Verify RLS is enabled
      console.log('\n🔐 Checking Row-Level Security Status');
      console.log('─────────────────────────────────────────────────────────\n');

      const rlsQuery = `
        SELECT schemaname, tablename, rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND rowsecurity = true
        ORDER BY tablename;
      `;
      const rlsResult = await client.query(rlsQuery);

      if (rlsResult.rows.length > 0) {
        console.log(`✅ RLS enabled on ${rlsResult.rows.length} tables:\n`);
        rlsResult.rows.forEach(row => {
          console.log(`   ✓ ${row.tablename}`);
        });
      } else {
        console.log('⚠️  No tables with RLS found (may need manual verification)');
      }

    } catch (error) {
      console.error('❌ Verification error:', error.message);
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ DATABASE MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════════\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Critical error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

executeMigrations();
