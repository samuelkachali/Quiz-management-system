const { createClient } = require('@supabase/supabase-js');

// Use service role key for admin operations
const supabaseUrl = 'https://qbxusidgwovqqnghmvox.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFieHVzaWRnd292cXFuZ2htdm94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjgzNzc4NywiZXhwIjoyMDcyNDEzNzg3fQ.7FZ1U66vfHGLrSOT6EpMim6k0o3Yw6PRpbxwJB8xTxU';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function checkUsersAndCreateGroup() {
  try {
    console.log('🔍 Checking existing users...');

    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('❌ Error fetching users:', usersError.message);
      return;
    }

    console.log(`📋 Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - ID: ${user.id} - Role: ${user.role}`);
    });

    // Use the first admin user found
    const adminUser = users.find(u => u.role === 'admin' || u.role === 'super_admin');
    if (!adminUser) {
      console.error('❌ No admin user found!');
      return;
    }

    console.log(`👑 Using admin user: ${adminUser.name} (${adminUser.email})`);

    // Check existing study groups
    console.log('📚 Checking existing study groups...');
    const { data: existingGroups, error: groupsError } = await supabase
      .from('study_groups')
      .select('*');

    if (groupsError) {
      console.error('❌ Error fetching study groups:', groupsError.message);
      return;
    }

    console.log(`📚 Found ${existingGroups.length} existing study groups`);

    if (existingGroups.length > 0) {
      console.log('Existing groups:');
      existingGroups.forEach(group => {
        console.log(`  - ${group.name} (ID: ${group.id})`);
      });
    }

    // Create a test study group if none exist
    if (existingGroups.length === 0) {
      console.log('🎯 Creating a test study group...');

      const { data: newGroup, error: createError } = await supabase
        .from('study_groups')
        .insert({
          name: 'General Study Group',
          description: 'A general study group for discussing quizzes and learning',
          created_by: adminUser.id,
          max_members: 100,
          is_active: true
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating study group:', createError.message);
        console.error('Error details:', createError);
      } else {
        console.log('✅ Study group created successfully!');
        console.log('Group details:', {
          id: newGroup.id,
          name: newGroup.name,
          created_by: newGroup.created_by
        });

        // Add the creator as an admin member
        console.log('👥 Adding creator as group admin...');
        const { error: memberError } = await supabase
          .from('user_study_groups')
          .insert({
            user_id: adminUser.id,
            group_id: newGroup.id,
            role: 'admin'
          });

        if (memberError) {
          console.error('❌ Error adding member:', memberError.message);
        } else {
          console.log('✅ Creator added as group admin');
        }
      }
    } else {
      console.log('✅ Study groups already exist, no need to create test group');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkUsersAndCreateGroup();