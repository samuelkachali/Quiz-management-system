import { supabaseAdmin } from '../src/lib/supabase';

// Define TypeScript interfaces
interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
}

interface Message {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  message_type: string;
  created_at: string;
  user: User;
}

interface StudyGroup {
  id: string;
  name: string;
  description?: string;
  member_count?: number;
  created_at: string;
}

interface StudyGroupMembership {
  group_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  user: User;
  group: {
    name: string;
  };
}

async function debugChatMessages() {
  console.log('🔍 DEBUGGING CHAT MESSAGES');
  console.log('='.repeat(50));

  try {
    // 1. Check if messages are being stored in database
    console.log('1. Checking recent messages in database...');
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('study_group_messages')
      .select(`
        id,
        group_id,
        user_id,
        content,
        message_type,
        created_at,
        user:user_id(id, name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (messagesError) {
      console.error('❌ Error fetching messages:', messagesError);
    } else {
      console.log(`✅ Found ${messages?.length || 0} recent messages:`);
      (messages as unknown as Array<{
        id: string;
        group_id: string;
        user_id: string;
        content: string;
        message_type: string;
        created_at: string;
        user: { id: string; name: string; email: string } | null;
      }>)?.forEach((msg, index) => {
        const userName = msg.user?.name || 'Unknown';
        console.log(`  ${index + 1}. ID: ${msg.id}`);
        console.log(`     Group: ${msg.group_id}`);
        console.log(`     User: ${userName} (${msg.user_id})`);
        console.log(`     Content: "${msg.content}"`);
        console.log(`     Created: ${msg.created_at}`);
        console.log('     ---');
      });
    }

    // 2. Check study groups
    console.log('\n2. Checking study groups...');
    const { data: groups, error: groupsError } = await supabaseAdmin
      .from('study_groups')
      .select('id, name, description, member_count')
      .limit(5);

    if (groupsError) {
      console.error('❌ Error fetching groups:', groupsError);
    } else {
      console.log(`✅ Found ${groups?.length || 0} study groups:`);
      (groups as StudyGroup[])?.forEach((group, index) => {
        console.log(`  ${index + 1}. ${group.name} (${group.id})`);
        console.log(`     Members: ${group.member_count}`);
        console.log('     ---');
      });
    }

    // 3. Check user memberships
    console.log('\n3. Checking user study group memberships...');
    const { data: memberships, error: membershipsError } = await supabaseAdmin
      .from('user_study_groups')
      .select(`
        group_id,
        user_id,
        role,
        joined_at,
        user:user_id(id, name, email),
        group:group_id(id, name)
      `)
      .limit(10);

    if (membershipsError) {
      console.error('❌ Error fetching memberships:', membershipsError);
    } else {
      console.log(`✅ Found ${memberships?.length || 0} memberships:`);
      (memberships as unknown as Array<{
        group_id: string;
        user_id: string;
        role: string;
        joined_at: string;
        user: { id: string; name: string; email: string } | null;
        group: { id: string; name: string } | null;
      }>)?.forEach((membership, index) => {
        const userName = membership.user?.name || 'Unknown';
        const groupName = membership.group?.name || 'Unknown';
        console.log(`  ${index + 1}. User: ${userName}`);
        console.log(`     Group: ${groupName}`);
        console.log(`     Role: ${membership.role}`);
        console.log(`     Group ID: ${membership.group_id}`);
        console.log(`     User ID: ${membership.user_id}`);
        console.log('     ---');
      });
    }

    // 4. Check users table
    console.log('\n4. Checking users...');
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, name, email, role')
      .limit(10);

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
    } else {
      console.log(`✅ Found ${users?.length || 0} users:`);
      (users as User[])?.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.name} (${user.email})`);
        console.log(`     ID: ${user.id}`);
        console.log(`     Role: ${user.role || 'N/A'}`);
        console.log('     ---');
      });
    }

    console.log('\n🎯 SUMMARY:');
    console.log(`- Messages in DB: ${messages?.length || 0}`);
    console.log(`- Study Groups: ${groups?.length || 0}`);
    console.log(`- User Memberships: ${memberships?.length || 0}`);
    console.log(`- Users: ${users?.length || 0}`);

  } catch (error) {
    console.error('❌ Error during debugging:', error);
  }
}

debugChatMessages();