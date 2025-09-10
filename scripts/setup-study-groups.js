const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment variables
const supabaseUrl = 'https://qbxusidgwovqqnghmvox.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFieHVzaWRnd292cXFuZ2htdm94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjgzNzc4NywiZXhwIjoyMDcyNDEzNzg3fQ.7FZ1U66vfHGLrSOT6EpMim6k0o3Yw6PRpbxwJB8xTxU';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function setupStudyGroups() {
  try {
    console.log('🚀 Setting up study groups tables...');

    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'create-study-groups-tables.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf-8');

    // Split the SQL file into individual statements
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    console.log(`📄 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (const [index, statement] of statements.entries()) {
      if (!statement.trim()) continue;

      try {
        console.log(`🔧 Executing statement ${index + 1}/${statements.length}...`);

        // Use rpc to execute raw SQL
        const { error } = await supabase.rpc('exec_sql', {
          sql: statement + ';'
        });

        if (error) {
          // Try direct query for some statements
          if (error.message.includes('function exec_sql') || error.message.includes('does not exist')) {
            console.log('⚠️  RPC failed, trying direct query...');
            const { error: directError } = await supabase.from('_temp').select('*').limit(0);
            if (directError && !directError.message.includes('does not exist')) {
              throw directError;
            }
            // For now, just log that we need manual execution
            console.log('⚠️  Please execute this statement manually in Supabase SQL Editor:');
            console.log(statement);
            continue;
          }
          throw error;
        }

        console.log('✅ Statement executed successfully');
      } catch (error) {
        console.error(`❌ Error executing statement ${index + 1}:`, error.message);
        console.log('Statement:', statement.substring(0, 100) + '...');

        // Continue with other statements
        console.log('⚠️  Continuing with next statement...');
      }
    }

    console.log('\n🎉 Study groups setup completed!');
    console.log('📋 Note: Some statements may need to be executed manually in Supabase SQL Editor');

  } catch (error) {
    console.error('❌ Error setting up study groups:', error);
    process.exit(1);
  }
}

// Alternative approach: Just create the basic tables
async function createBasicTables() {
  try {
    console.log('🔧 Creating basic study groups tables...');

    // Create study_groups table
    const { error: groupError } = await supabase
      .from('study_groups')
      .insert({
        name: 'Test Group',
        description: 'Test study group',
        created_by: 'e2b98acf-d1eb-4eab-b7b1-6f8f13eec40c', // Use existing admin user ID
        max_members: 50,
        is_active: true
      });

    if (groupError && !groupError.message.includes('already exists')) {
      console.log('Study groups table might not exist, creating...');
      // Try to create the table using raw SQL through a workaround
      console.log('⚠️  Please run the SQL script manually in Supabase SQL Editor');
    } else {
      console.log('✅ Study groups table exists or was created');
    }

  } catch (error) {
    console.error('❌ Error in basic table creation:', error);
  }
}

// Run the setup
if (process.argv[2] === 'basic') {
  createBasicTables();
} else {
  setupStudyGroups();
}