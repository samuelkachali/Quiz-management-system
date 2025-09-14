import { supabaseAdmin } from '../src/lib/supabase';

async function checkChatTables() {
  console.log('🔍 CHECKING CHAT-RELATED TABLES');
  console.log('='.repeat(50));

  try {
    // Check study_groups table
    console.log('1. Checking study_groups table...');
    const { data: studyGroups, error: studyGroupsError } = await supabaseAdmin
      .from('study_groups')
      .select('*')
      .limit(3);

    if (studyGroupsError) {
      console.error('❌ study_groups error:', studyGroupsError);
    } else {
      console.log(`✅ study_groups table exists with ${studyGroups?.length || 0} records`);
      if (studyGroups && studyGroups.length > 0) {
        console.log('Sample record:', studyGroups[0]);
      }
    }

    // Check user_study_groups table
    console.log('\n2. Checking user_study_groups table...');
    const { data: userStudyGroups, error: userStudyGroupsError } = await supabaseAdmin
      .from('user_study_groups')
      .select('*')
      .limit(3);

    if (userStudyGroupsError) {
      console.error('❌ user_study_groups error:', userStudyGroupsError);
    } else {
      console.log(`✅ user_study_groups table exists with ${userStudyGroups?.length || 0} records`);
      if (userStudyGroups && userStudyGroups.length > 0) {
        console.log('Sample record:', userStudyGroups[0]);
      }
    }

    // Check study_group_messages table
    console.log('\n3. Checking study_group_messages table...');
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('study_group_messages')
      .select('*')
      .limit(3);

    if (messagesError) {
      console.error('❌ study_group_messages error:', messagesError);
    } else {
      console.log(`✅ study_group_messages table exists with ${messages?.length || 0} records`);
      if (messages && messages.length > 0) {
        console.log('Sample record:', messages[0]);
      }
    }

    // Check quiz_chat_rooms table
    console.log('\n4. Checking quiz_chat_rooms table...');
    const { data: chatRooms, error: chatRoomsError } = await supabaseAdmin
      .from('quiz_chat_rooms')
      .select('*')
      .limit(3);

    if (chatRoomsError) {
      console.error('❌ quiz_chat_rooms error:', chatRoomsError);
    } else {
      console.log(`✅ quiz_chat_rooms table exists with ${chatRooms?.length || 0} records`);
      if (chatRooms && chatRooms.length > 0) {
        console.log('Sample record:', chatRooms[0]);
      }
    }

    // Check quizzes table
    console.log('\n5. Checking quizzes table...');
    const { data: quizzes, error: quizzesError } = await supabaseAdmin
      .from('quizzes')
      .select('id, title, description')
      .limit(3);

    if (quizzesError) {
      console.error('❌ quizzes error:', quizzesError);
    } else {
      console.log(`✅ quizzes table exists with ${quizzes?.length || 0} records`);
      if (quizzes && quizzes.length > 0) {
        console.log('Sample record:', quizzes[0]);
      }
    }

  } catch (error) {
    console.error('❌ Error during table check:', error);
  }
}

checkChatTables();