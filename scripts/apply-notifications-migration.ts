import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import 'dotenv/config';

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  if (!supabaseUrl) console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseServiceKey) console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('Starting notifications migration...');
    
    // Read the SQL file
    const migrationPath = join(
      __dirname,
      '..',
      'supabase',
      'migrations',
      '20240909091000_create_notifications_table.sql'
    );
    
    console.log(`Reading migration file: ${migrationPath}`);
    const sql = readFileSync(migrationPath, 'utf-8');
    
    // Split the SQL into individual statements
    const statements = sql
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\nExecuting statement ${i + 1}/${statements.length}...`);
      
      try {
        const { error } = await supabase.rpc('pg_temp.execute_sql', { 
          sql: statement 
        });
        
        if (error) {
          // If the error is about a duplicate object, we can continue
          if (error.message.includes('already exists') || 
              error.message.includes('duplicate key')) {
            console.log(`  - Warning: ${error.message.split('\n')[0]}`);
            continue;
          }
          throw error;
        }
        
        console.log('  - Success');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`  - Error executing statement ${i + 1}:`, errorMessage);
        throw error;
      }
    }
    
    console.log('\n✅ Notifications migration completed successfully!');
    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Migration failed:', errorMessage);
    process.exit(1);
  }
}

// Create a temporary function to execute raw SQL
async function setupTemporaryExecuteFunction() {
  try {
    const { error } = await supabase.rpc('pg_temp.create_execute_sql_function');
    if (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (!errorMessage.includes('already exists')) {
        console.error('Error creating temporary execute function:', errorMessage);
        process.exit(1);
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // If the function doesn't exist, create it
    if (errorMessage.includes('function pg_temp.create_execute_sql_function() does not exist')) {
      const createFunctionSql = `
        CREATE OR REPLACE FUNCTION pg_temp.execute_sql(sql text)
        RETURNS json AS $$
        DECLARE
          result json;
        BEGIN
          EXECUTE sql;
          RETURN json_build_object('success', true);
        EXCEPTION WHEN OTHERS THEN
          RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'sqlstate', SQLSTATE
          );
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `;
      
      const { error: createError } = await supabase.rpc('pg_temp.execute_sql', { 
        sql: createFunctionSql 
      });
      
      if (createError) {
        console.error('Error creating temporary execute function:', createError);
        process.exit(1);
      }
    } else {
      console.error('Unexpected error:', error);
      process.exit(1);
    }
  }
}

// Run the migration
async function run() {
  try {
    await setupTemporaryExecuteFunction();
    await applyMigration();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

run();
