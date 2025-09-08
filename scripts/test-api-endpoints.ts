import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'http://localhost:3000';
const token = process.env.TEST_TOKEN || '';

if (!token) {
  console.error('Please set TEST_TOKEN environment variable with a valid JWT token');
  process.exit(1);
}

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
});

async function testEndpoint(endpoint: string, name: string) {
  try {
    console.log(`Testing ${name} endpoint: ${endpoint}`);
    const response = await api.get(endpoint);
    console.log(`✅ ${name} Success:`, {
      status: response.status,
      data: response.data
    });
    return true;
  } catch (error: any) {
    console.error(`❌ ${name} Error:`, {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    return false;
  }
}

async function runTests() {
  console.log('Starting API endpoint tests...\n');
  
  // Test each endpoint
  await testEndpoint('/api/admin/users', 'Users');
  await testEndpoint('/api/quizzes', 'Quizzes');
  await testEndpoint('/api/admin/attempts', 'Attempts');
  
  console.log('\nAPI endpoint tests completed');
}

runTests().catch(console.error);
