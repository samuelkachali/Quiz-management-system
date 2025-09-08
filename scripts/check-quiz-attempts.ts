import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qbxusidgwovqqnghmvox.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFieHVzaWRnd292cXFuZ2htdm94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjgzNzc4NywiZXhwIjoyMDcyNDEzNzg3fQ.7FZ1U66vfHGLrSOT6EpMim6k0o3Yw6PRpbxwJB8xTxU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableStructure() {
  try {
    console.log('Checking quiz_attempts table structure...');
    
    // Get table schema
    const { data: schema, error: schemaError } = await supabase
      .from('information_schema.tables')
      .select('*')
      .eq('table_name', 'quiz_attempts');
    
    if (schemaError) {
      console.error('Error fetching table schema:', schemaError);
    } else {
      console.log('Table schema:', schema);
    }
    
    // Get table columns
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('*')
      .eq('table_name', 'quiz_attempts');
    
    if (columnsError) {
      console.error('Error fetching columns:', columnsError);
    } else {
      console.log('Table columns:', columns);
    }
    
    // Try to fetch a single attempt
    const { data: attempts, error: fetchError } = await supabase
      .from('quiz_attempts')
      .select('*')
      .limit(1);
    
    if (fetchError) {
      console.error('Error fetching attempts:', fetchError);
    } else {
      console.log('Sample attempt:', attempts?.[0]);
    }
    
    // Check if the table exists by running a simple query
    const { data: tableCheck, error: tableCheckError } = await supabase
      .from('quiz_attempts')
      .select('*')
      .limit(0);
    
    if (tableCheckError) {
      console.error('Table check failed:', tableCheckError);
    } else {
      console.log('Table exists and is accessible');
    }
    
  } catch (error) {
    console.error('Error checking table structure:', error);
  }
}

checkTableStructure();
