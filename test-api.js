const jwt = require('jsonwebtoken');

// Test the admin users API endpoint
async function testUsersAPI() {
  console.log('Testing admin users API endpoint...');

  // Create a test JWT token (this would normally come from authentication)
  const JWT_SECRET = 'your-super-secret-jwt-key-change-this-in-production';
  const testToken = jwt.sign(
    {
      id: 'test-admin-id',
      email: 'admin@test.com',
      role: 'admin'
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  console.log('Test token created:', testToken.substring(0, 20) + '...');

  try {
    const response = await fetch('http://localhost:3000/api/admin/users', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('✅ API test successful!');
    } else {
      console.log('❌ API test failed');
    }

  } catch (error) {
    console.error('❌ Test failed with exception:', error.message);
  }
}

testUsersAPI();