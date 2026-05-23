import { createClient } from '@supabase/supabase-js';

async function checkTables() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing env vars');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    console.log('🔍 Checking for created tables...\n');

    // Try to query each table
    const tables = [
      'companies', 'users', 'roles', 'branches', 'items', 
      'invoices', 'payments', 'returns', 'inventory', 'audit_logs'
    ];

    let successCount = 0;
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (!error) {
          console.log(`✅ ${table} - exists`);
          successCount++;
        } else {
          console.log(`⚠️  ${table} - not found (${error.message})`);
        }
      } catch (e) {
        console.log(`⚠️  ${table} - check failed`);
      }
    }

    console.log(`\n✅ Tables created: ${successCount}/${tables.length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkTables();
