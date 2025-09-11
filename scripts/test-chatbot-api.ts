const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qbxusidgwovqqnghmvox.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFieHVzaWRnd292cXFuZ2htdm94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjgzNzc4NywiZXhwIjoyMDcyNDEzNzg3fQ.7FZ1U66vfHGLrSOT6EpMim6k0o3Yw6PRpbxwJB8xTxU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testChatbotAPI() {
  console.log('=== Testing Chatbot API ===');

  try {
    // Test 1: Create or find a test user
    console.log('\n1. Finding or creating test user...');
    let userId: string;

    // Use a known existing user ID for testing
    // In a real scenario, you'd get this from authentication
    userId = '550e8400-e29b-41d4-a716-446655440000'; // Example UUID
    console.log('Using test user ID:', userId);

    // Test 2: Create a conversation
    console.log('\n2. Creating conversation...');
    const { data: conversation, error: convError } = await supabase
      .from('chatbot_conversations')
      .insert({
        user_id: userId,
        title: 'Test Conversation',
        status: 'active'
      })
      .select()
      .single();

    if (convError) {
      console.error('Error creating conversation:', convError);
      return;
    }

    console.log('Conversation created:', conversation.id);

    // Test 3: Add messages to conversation
    console.log('\n3. Adding messages...');
    const messages = [
      { role: 'user', content: 'Hello, can you help me with a coding question?' },
      { role: 'assistant', content: 'Of course! I\'d be happy to help you with coding questions. What would you like to know?' },
      { role: 'user', content: 'How do I create a function in JavaScript?' }
    ];

    for (const msg of messages) {
      const { error: msgError } = await supabase
        .from('chatbot_messages')
        .insert({
          conversation_id: conversation.id,
          role: msg.role,
          content: msg.content
        });

      if (msgError) {
        console.error('Error adding message:', msgError);
        return;
      }
    }

    console.log('Messages added successfully');

    // Test 4: Retrieve conversation messages
    console.log('\n4. Retrieving conversation messages...');
    const { data: retrievedMessages, error: retrieveError } = await supabase
      .rpc('get_chatbot_conversation_messages', {
        p_conversation_id: conversation.id,
        p_limit: 10,
        p_offset: 0
      });

    if (retrieveError) {
      console.error('Error retrieving messages:', retrieveError);
      return;
    }

    console.log('Retrieved messages:', retrievedMessages?.length);

    // Test 5: Get user's conversations
    console.log('\n5. Getting user conversations...');
    const { data: userConversations, error: userConvError } = await supabase
      .rpc('get_user_chatbot_conversations', {
        p_limit: 10,
        p_offset: 0
      });

    if (userConvError) {
      console.error('Error getting user conversations:', userConvError);
      return;
    }

    console.log('User conversations:', userConversations?.length);

    // Cleanup: Delete test data
    console.log('\n6. Cleaning up test data...');
    await supabase
      .from('chatbot_conversations')
      .delete()
      .eq('id', conversation.id);

    // Note: Not deleting the user as it might be used by other tests
    console.log('Keeping test user for future tests');

    console.log('Test completed successfully!');

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testChatbotAPI();