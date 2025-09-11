import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyToken } from '@/backend/utils/auth';
import { generateGeminiResponse } from '@/lib/gemini';

export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    const conversationId = params.conversationId;

    // Get conversation messages
    const { data: messages, error } = await supabaseAdmin
      .rpc('get_chatbot_conversation_messages', {
        p_conversation_id: conversationId,
        p_limit: 50,
        p_offset: 0
      });

    if (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messages: messages || []
    });

  } catch (error) {
    console.error('Chatbot messages API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Function to ensure chatbot tables exist
async function ensureChatbotTables() {
  try {
    console.log('Ensuring chatbot tables exist...');

    // Try to create tables if they don't exist
    const createTablesSQL = `
      CREATE TABLE IF NOT EXISTS public.chatbot_conversations (
        id uuid primary key default uuid_generate_v4(),
        user_id uuid not null references public.users(id) on delete cascade,
        title text,
        status text not null default 'active' check (status in ('active', 'completed', 'archived')),
        created_at timestamp with time zone default now(),
        updated_at timestamp with time zone default now()
      );

      CREATE TABLE IF NOT EXISTS public.chatbot_messages (
        id uuid primary key default uuid_generate_v4(),
        conversation_id uuid not null references public.chatbot_conversations(id) on delete cascade,
        role text not null check (role in ('user', 'assistant')),
        content text not null,
        metadata jsonb default '{}',
        created_at timestamp with time zone default now()
      );

      ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.chatbot_messages ENABLE ROW LEVEL SECURITY;
    `;

    // Execute the SQL using rpc if available, otherwise try direct execution
    try {
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql: createTablesSQL });
      if (error) {
        console.log('RPC exec_sql failed, trying alternative method');
        throw error;
      }
    } catch (rpcError) {
      console.log('RPC method failed, tables might already exist or RPC not available');
    }

    console.log('Chatbot tables check completed');
  } catch (error) {
    console.error('Error in ensureChatbotTables:', error);
    // Don't throw error - let the main function continue
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    const conversationId = params.conversationId;
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'Message is required' },
        { status: 400 }
      );
    }

    // Ensure chatbot tables exist
    try {
      await ensureChatbotTables();
    } catch (tableError) {
      console.error('Error ensuring chatbot tables:', tableError);
    }

    // Verify conversation ownership
    const { data: conversation, error: convError } = await supabaseAdmin
      .from('chatbot_conversations')
      .select('id, user_id')
      .eq('id', conversationId)
      .eq('user_id', decoded.id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { success: false, message: 'Conversation not found or access denied' },
        { status: 404 }
      );
    }

    // Store user message
    const { data: userMessage, error: userMsgError } = await supabaseAdmin
      .from('chatbot_messages')
      .insert({
        conversation_id: conversationId,
        role: 'user',
        content: message.trim(),
        metadata: {}
      })
      .select()
      .single();

    if (userMsgError) {
      console.error('Error storing user message:', userMsgError);
      return NextResponse.json(
        { success: false, message: 'Failed to store message' },
        { status: 500 }
      );
    }

    // Get conversation history for context
    const { data: history, error: historyError } = await supabaseAdmin
      .rpc('get_chatbot_conversation_messages', {
        p_conversation_id: conversationId,
        p_limit: 20,
        p_offset: 0
      });

    if (historyError) {
      console.error('Error fetching conversation history:', historyError);
    }

    // Prepare conversation history for Gemini
    const conversationHistory = (history || [])
      .filter((msg: any) => msg.role === 'user' || msg.role === 'assistant')
      .map((msg: any) => ({
        role: msg.role,
        content: msg.content
      }));

    // Generate response with Gemini
    const geminiResult = await generateGeminiResponse(message.trim(), conversationHistory, {
      temperature: 0.7,
      maxTokens: 1024,
      model: 'gemini-1.5-flash'
    });

    if (!geminiResult.success) {
      console.error('Gemini API error:', geminiResult.error);
      return NextResponse.json(
        { success: false, message: 'Failed to generate AI response' },
        { status: 500 }
      );
    }

    const aiResponse = geminiResult.text;

    // Store AI response
    const { data: aiMessage, error: aiMsgError } = await supabaseAdmin
      .from('chatbot_messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: aiResponse,
        metadata: {
          model: geminiResult.model,
          tokens_used: geminiResult.usage.totalTokenCount,
          prompt_tokens: geminiResult.usage.promptTokenCount,
          completion_tokens: geminiResult.usage.candidatesTokenCount
        }
      })
      .select()
      .single();

    if (aiMsgError) {
      console.error('Error storing AI message:', aiMsgError);
      return NextResponse.json(
        { success: false, message: 'Failed to store AI response' },
        { status: 500 }
      );
    }

    // Update conversation updated_at
    await supabaseAdmin
      .from('chatbot_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    return NextResponse.json({
      success: true,
      userMessage,
      aiMessage,
      response: aiResponse
    });

  } catch (error) {
    console.error('Chatbot messages API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}