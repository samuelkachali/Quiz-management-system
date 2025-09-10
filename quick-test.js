const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qbxusidgwovqqnghmvox.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFieHVzaWRnd292cXFuZ2htdm94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4Mzc3ODcsImV4cCI6MjA3MjQxMzc4N30.s9TZMy5dx-NrHLo1GNsEBZnFzdMRqexcR1japlYXvWU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function quickTest() {
  console.log('Testing Supabase connection...');

  try {
    // Simple connection test
    const { data, error } = await supabase.from('users').select('count').limit(1);

    if (error) {
      console.error('❌ Connection failed:', error.message);
      console.error('Error code:', error.code);
      console.error('Error details:', error.details);
      return false;
    } else {
      console.log('✅ Connection successful');
      console.log('Data received:', data);
      return true;
    }
  } catch (error) {
    console.error('❌ Test failed with exception:', error.message);
    return false;
  }
}

quickTest().then(success => {
  if (success) {
    console.log('\n🎉 Supabase is working correctly!');
  } else {
    console.log('\n💥 Supabase connection has issues.');
  }
  process.exit(success ? 0 : 1);
});