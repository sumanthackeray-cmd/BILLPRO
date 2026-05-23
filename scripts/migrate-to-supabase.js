#!/usr/bin/env node

/**
 * Migration Script: Firebase to Supabase
 * Runs the SQL migrations on Supabase and prepares for data migration
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase environment variables');
  console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigrations() {
  try {
    console.log('🚀 Starting Supabase schema migration...\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/001_create_billpro_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📝 Executing SQL migrations...');
    
    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    let executedCount = 0;
    for (const statement of statements) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error && error.message.includes('function exec_sql')) {
          // Fallback: Try using the query method
          const result = await supabase.from('_migrations').insert({ 
            statement: statement.substring(0, 100),
            status: 'pending'
          });
          
          if (!result.error) {
            executedCount++;
          }
        } else if (!error) {
          executedCount++;
        } else {
          console.warn(`⚠️  Warning: ${error.message}`);
        }
      } catch (err) {
        console.warn(`⚠️  Statement execution warning: ${err.message}`);
      }
    }

    console.log(`✅ Migration preparation complete!\n`);
    console.log('📌 Next Steps:');
    console.log('1. Go to Supabase Dashboard > SQL Editor');
    console.log('2. Copy the entire contents of supabase/migrations/001_create_billpro_schema.sql');
    console.log('3. Paste and execute in the SQL Editor');
    console.log('4. Once complete, run: npm run migrate:data\n');

    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigrations();
