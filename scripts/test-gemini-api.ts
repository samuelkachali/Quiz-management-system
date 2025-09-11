import { GoogleGenerativeAI } from '@google/generative-ai';

// Test the Gemini API directly
async function testGeminiAPI() {
  console.log('🧪 Testing Gemini API Integration...\n');

  // Use the API key from the curl command
  const API_KEY = 'AIzaSyD6JlCYy-7t8N8gb7izO_M-YDzqxG4Dd-4';

  try {
    // Initialize the Gemini API client
    const genAI = new GoogleGenerativeAI(API_KEY);

    // Get the model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    console.log('✅ Gemini API client initialized successfully');
    console.log('📝 Model: gemini-2.0-flash\n');

    // Test with the same prompt from the curl command
    const prompt = 'Explain how AI works in a few words';

    console.log('🤖 Sending prompt:', prompt);
    console.log('⏳ Generating response...\n');

    // Generate content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('🎉 Response received:');
    console.log('─'.repeat(50));
    console.log(text);
    console.log('─'.repeat(50));

    // Test with a more complex prompt
    console.log('\n🔄 Testing with a more complex prompt...');
    const complexPrompt = 'Explain the concept of machine learning and its applications in education in 3-4 sentences.';

    const result2 = await model.generateContent(complexPrompt);
    const response2 = await result2.response;
    const text2 = response2.text();

    console.log('\n📚 Complex Response:');
    console.log('─'.repeat(50));
    console.log(text2);
    console.log('─'.repeat(50));

    console.log('\n✅ Gemini API test completed successfully!');
    console.log('🚀 The chatbot integration should work perfectly with this API key.');

  } catch (error) {
    console.error('❌ Gemini API test failed:');
    console.error(error);

    if (error instanceof Error) {
      if (error.message.includes('API_KEY')) {
        console.log('\n💡 Possible issues:');
        console.log('• API key might be invalid or expired');
        console.log('• API key might not have the required permissions');
        console.log('• You might need to enable the Generative AI API in Google Cloud Console');
      } else if (error.message.includes('quota')) {
        console.log('\n💡 Possible issues:');
        console.log('• API quota exceeded');
        console.log('• Billing might need to be enabled');
      }
    }
  }
}

// Run the test
testGeminiAPI().catch(console.error);