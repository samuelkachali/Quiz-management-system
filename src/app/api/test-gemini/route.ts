import { NextRequest, NextResponse } from 'next/server';
import { generateGeminiResponse } from '@/lib/gemini';

type ConversationMessage = { role: string; content: string };

export async function GET() {
  try {
    console.log('🧪 Testing Gemini API integration...');

    // Test with a simple prompt
    const testPrompt = 'Explain how AI works in a few words';
    const conversationHistory: ConversationMessage[] = [];

    console.log('📝 Test prompt:', testPrompt);
    console.log('🔄 Testing with retry logic enabled...');

    const response = await generateGeminiResponse(testPrompt, conversationHistory, {
      maxRetries: 3
    });

    console.log('✅ Gemini API test successful!');
    console.log('📄 Response:', response);

    return NextResponse.json({
      success: true,
      message: 'Gemini API integration test successful',
      prompt: testPrompt,
      response: response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Gemini API test failed:', error);

    return NextResponse.json({
      success: false,
      message: 'Gemini API integration test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, history = [] } = body;

    console.log('🤖 Custom Gemini test with prompt:', prompt);

    const response = await generateGeminiResponse(prompt, history);

    return NextResponse.json({
      success: true,
      prompt,
      response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Custom Gemini test failed:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}