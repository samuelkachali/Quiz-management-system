const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read .env file instead of .env.local
let envVars = {};
try {
  const envContent = fs.readFileSync('.env', 'utf8');
  envContent.split('\n').forEach(line => {
    const equalIndex = line.indexOf('=');
    if (equalIndex > 0) {
      const key = line.substring(0, equalIndex).trim();
      const value = line.substring(equalIndex + 1).trim();
      envVars[key] = value;
    }
  });
} catch (error) {
  console.log('Could not read .env file, using hardcoded values');
}

const supabaseUrl = 'https://qbxusidgwovqqnghmvox.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFieHVzaWRnd292cXFuZ2htdm94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4Mzc3ODcsImV4cCI6MjA3MjQxMzc4N30.s9TZMy5dx-NrHLo1GNsEBZnFzdMRqexcR1japlYXvWU';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFieHVzaWRnd292cXFuZ2htdm94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjgzNzc4NywiZXhwIjoyMDcyNDEzNzg3fQ.7FZ1U66vfHGLrSOT6EpMim6k0o3Yw6PRpbxwJB8xTxU';

console.log('Environment variables:');
console.log('URL:', supabaseUrl ? 'Set' : 'Missing');
console.log('Anon Key:', supabaseAnonKey ? 'Set' : 'Missing');
console.log('Service Key:', supabaseServiceKey ? 'Set' : 'Missing');

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testConnection() {
  try {
    // Test basic connection
    console.log('\n--- Testing Supabase Connection ---');
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      console.error('Connection error:', error);
    } else {
      console.log('✅ Connection successful');
    }

    // Test users table structure
    console.log('\n--- Testing Users Table ---');
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('*')
      .limit(5);
    
    if (usersError) {
      console.error('Users table error:', usersError);
    } else {
      console.log('Users found:', users.length);
      if (users.length > 0) {
        console.log('Sample user structure:', Object.keys(users[0]));
        const superAdmin = users.find(u => u.email === 'superadmin@quiz.com');
        console.log('Super admin exists:', superAdmin ? 'Yes' : 'No');
        if (superAdmin) {
          console.log('Super admin auth_id:', superAdmin.auth_id);
          console.log('Super admin status:', superAdmin.status);
          console.log('Super admin role:', superAdmin.role);
        }
      }
    }

    // Test auth users
    console.log('\n--- Testing Auth Users ---');
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('Auth users error:', authError);
    } else {
      console.log('Auth users found:', authUsers.users.length);
      const superAdmin = authUsers.users.find(u => u.email === 'superadmin@quiz.com');
      if (superAdmin) {
        console.log('Super admin auth ID:', superAdmin.id);
      }
    }

    // Test login flow
    console.log('\n--- Testing Login Flow ---');
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'superadmin@quiz.com',
        password: 'SuperAdmin123!' // Replace with actual password
      });

      if (authError) {
        console.error('Auth login error:', authError);
      } else {
        console.log('✅ Auth login successful');
        console.log('Auth user ID:', authData.user.id);
        
        // Test user lookup
        const { data: userData, error: userError } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('auth_id', authData.user.id)
          .single();

        if (userError) {
          console.error('User lookup error:', userError);
        } else {
          console.log('✅ User profile found:', userData.email);
        }
      }
    } catch (loginError) {
      console.error('Login test error:', loginError);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testConnection();
