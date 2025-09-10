import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function applyRLSPolicies() {
  try {
    console.log('🚀 Applying RLS policies...');

    // Read the SQL file
    const sqlFilePath = join(__dirname, '../supabase/migrations/20240909090000_chat_rls_policies.sql');
    const sql = readFileSync(sqlFilePath, 'utf-8');

    // Split the SQL file into individual statements
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    // Execute each statement
    for (const [index, statement] of statements.entries()) {
      try {
        console.log(`\n🔧 Executing statement ${index + 1}/${statements.length}...`);
        const { error } = await supabase.rpc('pg_temp.execute_sql', {
          sql: statement + ';',
        });

        if (error) {
          // Skip duplicate policy errors
          if (error.message.includes('already exists')) {
            console.log(`ℹ️ ${error.message}`);
            continue;
          }
          throw error;
        }
        console.log('✅ Statement executed successfully');
      } catch (error: any) {
        console.error(`❌ Error executing statement ${index + 1}:`, error.message);
        console.error('Statement:', statement);
        throw error;
      }
    }

    console.log('\n🎉 RLS policies applied successfully!');
  } catch (error) {
    console.error('❌ Error applying RLS policies:', error);
    process.exit(1);
  }
}

// Run the script
applyRLSPolicies();
