const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qbxusidgwovqqnghmvox.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFieHVzaWRnd292cXFuZ2htdm94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjgzNzc4NywiZXhwIjoyMDcyNDEzNzg3fQ.7FZ1U66vfHGLrSOT6EpMim6k0o3Yw6PRpbxwJB8xTxU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetSamuelPassword() {
  try {
    console.log('Finding Samuel\'s user record...');
    
    // First, get Samuel's record from the users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, auth_id, email, name')
      .eq('email', 'samuelkachali11@gmail.com')
      .single();

    if (userError || !userData) {
      console.error('User not found:', userError);
      return;
    }

    console.log('Found user:', userData);

    // If auth_id is null, find the auth user by email
    let authUserId = userData.auth_id;
    
    if (!authUserId) {
      console.log('Auth ID is null, searching for auth user by email...');
      
      // List all auth users to find Samuel
      const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
      
      if (listError) {
        console.error('Failed to list auth users:', listError);
        return;
      }
      
      const samuelAuthUser = authUsers.users.find(user => user.email === 'samuelkachali11@gmail.com');
      
      if (!samuelAuthUser) {
        console.error('Auth user not found for email');
        return;
      }
      
      authUserId = samuelAuthUser.id;
      console.log('Found auth user ID:', authUserId);
      
      // Update the users table with the correct auth_id
      const { error: updateError } = await supabase
        .from('users')
        .update({ auth_id: authUserId })
        .eq('id', userData.id);
        
      if (updateError) {
        console.error('Failed to update auth_id:', updateError);
        return;
      }
      
      console.log('Updated users table with auth_id');
    }

    // Reset password and confirm email in Supabase Auth
    const { error: authError } = await supabase.auth.admin.updateUserById(
      authUserId,
      { 
        password: 'samuel',
        email_confirm: true
      }
    );

    if (authError) {
      console.error('Failed to reset password:', authError);
      return;
    }

    console.log('✅ Password reset successfully!');
    console.log('Samuel can now login with:');
    console.log('Email: samuelkachali11@gmail.com');
    console.log('Password: samuel');
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

resetSamuelPassword();
