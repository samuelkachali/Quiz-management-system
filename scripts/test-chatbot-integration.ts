const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Test user credentials (you may need to adjust these)
const testUser = {
  email: 'test@gmail.com',
  password: 'Password123!',
  name: 'Test User',
  role: 'student'
};

async function registerTestUser() {
  try {
    console.log('Attempting to register test user...');
    const response = await axios.post(`${BASE_URL}/api/auth/signup`, testUser);

    if (response.data.success) {
      console.log('✅ User registration successful');
      return true;
    } else {
      console.log('❌ Registration failed:', response.data.message);
      return false;
    }
  } catch (error: any) {
    if (error.response?.data?.message?.includes('already exists')) {
      console.log('✅ User already exists, proceeding to login...');
      return true;
    }
    console.log('❌ Registration error:', error.response?.data || error.message);
    return false;
  }
}

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

async function testChatbotAPI(token: string) {
  const api = axios.create({
    baseURL: BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  try {
    console.log('\n=== Testing Chatbot API ===');

    // Test 1: Get conversations
    console.log('1. Getting user conversations...');
    const conversationsResponse = await api.get('/api/chatbot');
    console.log('✅ Conversations:', conversationsResponse.data);

    // Test 2: Create a new conversation
    console.log('\n2. Creating new conversation...');
    const createResponse = await api.post('/api/chatbot', {
      title: 'Test Chatbot Conversation'
    });
    console.log('✅ Created conversation:', createResponse.data);

    const conversationId = createResponse.data.conversation.id;

    // Test 3: Send a message
    console.log('\n3. Sending message...');
    const messageResponse = await api.post(`/api/chatbot/${conversationId}/messages`, {
      message: 'Hello, can you help me with JavaScript?'
    });
    console.log('✅ Message response:', messageResponse.data);

    // Test 4: Get conversation messages
    console.log('\n4. Getting conversation messages...');
    const messagesResponse = await api.get(`/api/chatbot/${conversationId}/messages`);
    console.log('✅ Messages:', messagesResponse.data);

    console.log('\n🎉 All chatbot tests passed!');

  } catch (error: any) {
    console.error('❌ Chatbot test error:', error.response?.data || error.message);
  }
}

async function runTests() {
  console.log('Starting chatbot integration tests...\n');

  // First try to register the test user
  const userRegistered = await registerTestUser();
  if (!userRegistered) {
    console.log('Cannot proceed without test user');
    return;
  }

  // Then login and get token
  const token = await loginAndGetToken();
  if (!token) {
    console.log('Cannot proceed without authentication token');
    return;
  }

  await testChatbotAPI(token);
}

runTests().catch(console.error);