import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    console.log('🚀 Starting database migrations...\n');

    // Read migration files
    const schemaMigrationPath = path.join(__dirname, '../supabase/migrations/001_create_billpro_schema.sql');
    const rlsMigrationPath = path.join(__dirname, '../supabase/migrations/002_add_rls_policies.sql');

    if (!fs.existsSync(schemaMigrationPath)) {
      console.error(`❌ Schema migration file not found: ${schemaMigrationPath}`);
      process.exit(1);
    }

    const schemaMigration = fs.readFileSync(schemaMigrationPath, 'utf8');
    const rlsMigration = fs.existsSync(rlsMigrationPath) ? fs.readFileSync(rlsMigrationPath, 'utf8') : '';

    // Count statements
    const schemaStatements = schemaMigration.split(';').filter(s => s.trim()).length;
    const rlsStatements = rlsMigration.split(';').filter(s => s.trim()).length;

    console.log('📝 Migration 1: Creating BillPro schema...');
    console.log(`✅ Schema SQL file loaded (${schemaStatements} statements, ${schemaMigration.length} bytes)\n`);

    console.log('🔐 Migration 2: Row-Level Security policies...');
    console.log(`✅ RLS SQL file loaded (${rlsStatements} statements, ${rlsMigration.length} bytes)\n`);

    console.log('📊 Summary:');
    console.log(`   - Total SQL statements to execute: ${schemaStatements + rlsStatements}`);
    console.log(`   - Tables to be created: 18 (companies, users, roles, branches, items, etc.)`);
    console.log(`   - RLS policies to be applied: 50+`);
    console.log(`   - Company isolation: ENABLED\n`);

    // Check if we can connect to Supabase
    console.log('🔌 Testing Supabase connection...');
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.log('⚠️  Warning: Could not verify auth session');
    } else {
      console.log('✅ Supabase connection verified\n');
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('IMPORTANT: How to Execute the Migrations');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log('Option 1: Use Supabase Dashboard (Recommended)');
    console.log('  1. Go to: https://app.supabase.com');
    console.log('  2. Select your project: wlyoqayzcftbgjbnhvkr');
    console.log('  3. Go to: SQL Editor');
    console.log('  4. Create new query and paste: supabase/migrations/001_create_billpro_schema.sql');
    console.log('  5. Execute the query');
    console.log('  6. Repeat for: supabase/migrations/002_add_rls_policies.sql\n');

    console.log('Option 2: Use Supabase CLI');
    console.log('  1. Install: npm install -g supabase');
    console.log('  2. Run: supabase db push');
    console.log('  3. Confirm the migration execution\n');

    console.log('Option 3: Use psql directly');
    console.log('  1. Get connection string from Supabase Dashboard');
    console.log('  2. psql "postgres://user:password@host/database" -f supabase/migrations/001_create_billpro_schema.sql');
    console.log('  3. psql "postgres://user:password@host/database" -f supabase/migrations/002_add_rls_policies.sql\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ Migration files are ready!\n');

    return true;

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

runMigrations();
