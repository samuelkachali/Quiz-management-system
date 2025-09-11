const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Test user credentials
const testUser = {
  email: 'test@gmail.com',
  password: 'Password123!',
  name: 'Test User',
  role: 'student'
};

async function loginAndGetToken() {
  try {
    console.log('Attempting to login...');
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });

    if (response.data.success && response.data.token) {
      console.log('✅ Login successful');
      return response.data.token;
    } else {
      console.log('❌ Login failed:', response.data.message);
      return null;
    }
  } catch (error: any) {
    console.log('❌ Login error:', error.response?.data || error.message);
    return null;
  }
}

async function testStudyGroupChatbot(token: string) {
  const api = axios.create({
    baseURL: BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  try {
    console.log('\n=== Testing Study Group Chatbot ===');

    // Test 1: Get study groups
    console.log('1. Getting study groups...');
    const groupsResponse = await api.get('/api/chat/study-groups');
    console.log('Study groups found:', groupsResponse.data.groups?.length || 0);

    let groupId: string;

    if (!groupsResponse.data.success || groupsResponse.data.groups.length === 0) {
      console.log('❌ No study groups found. Creating one...');

      // Create a study group
      const createResponse = await api.post('/api/chat/study-groups', {
        name: 'Test Study Group for Chatbot',
        description: 'Testing chatbot functionality',
        maxMembers: 10
      });

      if (!createResponse.data.success) {
        console.log('❌ Failed to create study group:', createResponse.data.message);
        return;
      }

      console.log('✅ Study group created:', createResponse.data.group.id);
      groupId = createResponse.data.group.id;
    } else {
      groupId = groupsResponse.data.groups[0].id;
      console.log(`Using existing study group: ${groupId}`);

      // Try to join if not already a member
      try {
        const joinResponse = await api.post(`/api/chat/study-groups/${groupId}/join`);
        console.log('✅ Joined study group');
      } catch (error: any) {
        console.log('Join status:', error.response?.data?.message || 'Already a member or join failed');
      }
    }

    // Test 2: Get messages
    console.log('\n2. Getting messages...');
    const messagesResponse = await api.get(`/api/chat/study-groups/${groupId}/messages`);
    console.log('✅ Messages loaded:', messagesResponse.data.messages?.length || 0);

    // Test 3: Send regular message
    console.log('\n3. Sending regular message...');
    const regularMessage = await api.post(`/api/chat/study-groups/${groupId}/messages`, {
      content: 'Hello everyone! Testing the chatbot functionality.',
      messageType: 'text'
    });
    console.log('✅ Regular message sent');

    // Test 4: Send chatbot message
    console.log('\n4. Sending chatbot message...');
    const botMessage = await api.post(`/api/chat/study-groups/${groupId}/messages`, {
      content: '@bot Hello! Can you explain what a closure is in JavaScript?',
      messageType: 'text'
    });
    console.log('✅ Bot message sent');

    // Wait for bot response
    console.log('\n5. Waiting for bot response...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check for bot response
    const updatedMessages = await api.get(`/api/chat/study-groups/${groupId}/messages`);
    const messages = updatedMessages.data.messages || [];
    const botMessages = messages.filter((msg: any) => msg.message_type === 'bot');

    console.log(`\n=== RESULTS ===`);
    console.log(`Total messages: ${messages.length}`);
    console.log(`Bot messages: ${botMessages.length}`);

    if (botMessages.length > 0) {
      console.log('✅ Bot responded successfully!');
      console.log('Bot response preview:', botMessages[botMessages.length - 1].content?.substring(0, 100) + '...');
    } else {
      console.log('❌ No bot response received');
    }

    console.log('\n🎉 Study group chatbot test completed!');

  } catch (error: any) {
    console.error('❌ Study group chatbot test error:', error.response?.data || error.message);
  }
}

async function runTests() {
  console.log('Starting complete study group chatbot integration tests...\n');

  const token = await loginAndGetToken();
  if (!token) {
    console.log('Cannot proceed without authentication token');
    return;
  }

  await testStudyGroupChatbot(token);
}

runTests().catch(console.error);