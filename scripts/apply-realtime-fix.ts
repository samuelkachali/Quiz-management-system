import { supabaseAdmin } from '../src/lib/supabase';

async function applyRealtimeFix() {
  console.log('🔧 Applying real-time messaging fix...');
  
  try {
    // Enable replica identity for real-time updates
    console.log('1. Setting replica identity for study_group_messages...');
    const { error: replicaError1 } = await supabaseAdmin.rpc('exec_sql', {
      sql: 'ALTER TABLE public.study_group_messages REPLICA IDENTITY FULL;'
    });
    
    if (replicaError1) {
      console.log('Note: Replica identity might already be set or requires direct database access');
      console.log('Error:', replicaError1.message);
    } else {
      console.log('✅ Replica identity set for study_group_messages');
    }

    // Add table to realtime publication
    console.log('2. Adding study_group_messages to realtime publication...');
    const { error: pubError1 } = await supabaseAdmin.rpc('exec_sql', {
      sql: 'ALTER PUBLICATION supabase_realtime ADD TABLE public.study_group_messages;'
    });
    
    if (pubError1) {
      console.log('Note: Table might already be in publication or requires direct database access');
      console.log('Error:', pubError1.message);
    } else {
      console.log('✅ study_group_messages added to realtime publication');
    }

    // Enable replica identity for reactions table
    console.log('3. Setting replica identity for study_group_message_reactions...');
    const { error: replicaError2 } = await supabaseAdmin.rpc('exec_sql', {
      sql: 'ALTER TABLE public.study_group_message_reactions REPLICA IDENTITY FULL;'
    });
    
    if (replicaError2) {
      console.log('Note: Replica identity might already be set or requires direct database access');
      console.log('Error:', replicaError2.message);
    } else {
      console.log('✅ Replica identity set for study_group_message_reactions');
    }

    // Add reactions table to realtime publication
    console.log('4. Adding study_group_message_reactions to realtime publication...');
    const { error: pubError2 } = await supabaseAdmin.rpc('exec_sql', {
      sql: 'ALTER PUBLICATION supabase_realtime ADD TABLE public.study_group_message_reactions;'
    });
    
    if (pubError2) {
      console.log('Note: Table might already be in publication or requires direct database access');
      console.log('Error:', pubError2.message);
    } else {
      console.log('✅ study_group_message_reactions added to realtime publication');
    }

    // Test real-time subscription
    console.log('5. Testing real-time subscription...');
    const channel = supabaseAdmin
      .channel('test-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'study_group_messages'
        },
        (payload) => {
          console.log('✅ Real-time test successful:', payload);
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time subscription working!');
          supabaseAdmin.removeChannel(channel);
        }
      });

    console.log('🎉 Real-time fix application completed!');
    console.log('');
    console.log('📋 MANUAL STEPS REQUIRED:');
    console.log('If the above commands failed, you need to run these SQL commands directly in your Supabase dashboard:');
    console.log('');
    console.log('1. ALTER TABLE public.study_group_messages REPLICA IDENTITY FULL;');
    console.log('2. ALTER PUBLICATION supabase_realtime ADD TABLE public.study_group_messages;');
    console.log('3. ALTER TABLE public.study_group_message_reactions REPLICA IDENTITY FULL;');
    console.log('4. ALTER PUBLICATION supabase_realtime ADD TABLE public.study_group_message_reactions;');
    console.log('');
    console.log('Then test the chat functionality to see if messages appear in real-time.');

  } catch (error) {
    console.error('❌ Error applying real-time fix:', error);
    console.log('');
    console.log('📋 MANUAL STEPS REQUIRED:');
    console.log('Please run these SQL commands directly in your Supabase dashboard:');
    console.log('');
    console.log('1. ALTER TABLE public.study_group_messages REPLICA IDENTITY FULL;');
    console.log('2. ALTER PUBLICATION supabase_realtime ADD TABLE public.study_group_messages;');
    console.log('3. ALTER TABLE public.study_group_message_reactions REPLICA IDENTITY FULL;');
    console.log('4. ALTER PUBLICATION supabase_realtime ADD TABLE public.study_group_message_reactions;');
  }
}

applyRealtimeFix();