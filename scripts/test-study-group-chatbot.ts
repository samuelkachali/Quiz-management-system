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

    // First, let's see if there are any existing study groups
    console.log('1. Checking for existing study groups...');
    const groupsResponse = await api.get('/api/chat/study-groups');
    console.log('Study groups:', groupsResponse.data);

    if (!groupsResponse.data.success || groupsResponse.data.groups.length === 0) {
      console.log('No study groups found. Study group chat functionality requires a study group.');
      return;
    }

    const groupId = groupsResponse.data.groups[0].id;
    console.log(`Using study group: ${groupId}`);

    // Test 2: Join the study group first
    console.log('\n2. Joining study group...');
    try {
      const joinResponse = await api.post(`/api/chat/study-groups/${groupId}/join`);
      console.log('Join response:', joinResponse.data);
    } catch (error: any) {
      console.log('Join failed (might already be a member):', error.response?.data?.message || error.message);
    }

    // Test 3: Get existing messages
    console.log('\n3. Getting existing messages...');
    const messagesResponse = await api.get(`/api/chat/study-groups/${groupId}/messages`);
    console.log('Existing messages:', messagesResponse.data.messages?.length || 0);

    // Test 3: Send a regular message
    console.log('\n3. Sending a regular message...');
    const regularMessageResponse = await api.post(`/api/chat/study-groups/${groupId}/messages`, {
      content: 'Hello everyone! This is a test message.',
      messageType: 'text'
    });
    console.log('Regular message response:', regularMessageResponse.data);

    // Test 4: Send a chatbot message
    console.log('\n4. Sending a chatbot message...');
    const botMessageResponse = await api.post(`/api/chat/study-groups/${groupId}/messages`, {
      content: '@bot Hello! Can you help me understand JavaScript closures?',
      messageType: 'text'
    });
    console.log('Bot message response:', botMessageResponse.data);

    // Test 5: Check for bot response
    console.log('\n5. Checking for bot response...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds for bot response

    const updatedMessagesResponse = await api.get(`/api/chat/study-groups/${groupId}/messages`);
    const messages = updatedMessagesResponse.data.messages || [];
    const botMessages = messages.filter((msg: any) => msg.message_type === 'bot');

    console.log(`Found ${botMessages.length} bot messages`);
    if (botMessages.length > 0) {
      console.log('Latest bot response:', botMessages[botMessages.length - 1].content?.substring(0, 100) + '...');
    }

    console.log('\n🎉 Study group chatbot test completed!');

  } catch (error: any) {
    console.error('❌ Study group chatbot test error:', error.response?.data || error.message);
  }
}

async function runTests() {
  console.log('Starting study group chatbot integration tests...\n');

  const token = await loginAndGetToken();
  if (!token) {
    console.log('Cannot proceed without authentication token');
    return;
  }

  await testStudyGroupChatbot(token);
}

runTests().catch(console.error);