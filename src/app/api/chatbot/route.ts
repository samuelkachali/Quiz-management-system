import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyToken } from '@/backend/utils/auth';

export async function GET(request: NextRequest) {
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

    // Get user's conversations
    const { data: conversations, error } = await supabaseAdmin
      .rpc('get_user_chatbot_conversations', { p_limit: 20, p_offset: 0 });

    if (error) {
      console.error('Error fetching conversations:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch conversations' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      conversations: conversations || []
    });

  } catch (error) {
    console.error('Chatbot API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { title } = body;

    // First, ensure the chatbot tables exist
    try {
      await ensureChatbotTables();
    } catch (tableError) {
      console.error('Error ensuring chatbot tables:', tableError);
      // Continue anyway - tables might already exist
    }

    // Create new conversation
    const { data: conversation, error } = await supabaseAdmin
      .from('chatbot_conversations')
      .insert({
        user_id: decoded.id,
        title: title || 'New Conversation',
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to create conversation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      conversation
    });

  } catch (error) {
    console.error('Chatbot API error:', error);
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

      -- RLS Policies for chatbot_conversations
      DROP POLICY IF EXISTS "Users can view their own conversations" ON public.chatbot_conversations;
      CREATE POLICY "Users can view their own conversations" ON public.chatbot_conversations
        FOR SELECT USING (auth.uid() = user_id);

      DROP POLICY IF EXISTS "Users can create their own conversations" ON public.chatbot_conversations;
      CREATE POLICY "Users can create their own conversations" ON public.chatbot_conversations
        FOR INSERT WITH CHECK (auth.uid() = user_id);

      DROP POLICY IF EXISTS "Users can update their own conversations" ON public.chatbot_conversations;
      CREATE POLICY "Users can update their own conversations" ON public.chatbot_conversations
        FOR UPDATE USING (auth.uid() = user_id);

      DROP POLICY IF EXISTS "Users can delete their own conversations" ON public.chatbot_conversations;
      CREATE POLICY "Users can delete their own conversations" ON public.chatbot_conversations
        FOR DELETE USING (auth.uid() = user_id);

      -- RLS Policies for chatbot_messages
      DROP POLICY IF EXISTS "Users can view messages from their conversations" ON public.chatbot_messages;
      CREATE POLICY "Users can view messages from their conversations" ON public.chatbot_messages
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM public.chatbot_conversations
            WHERE id = chatbot_messages.conversation_id
            AND user_id = auth.uid()
          )
        );

      DROP POLICY IF EXISTS "Users can create messages in their conversations" ON public.chatbot_messages;
      CREATE POLICY "Users can create messages in their conversations" ON public.chatbot_messages
        FOR INSERT WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.chatbot_conversations
            WHERE id = chatbot_messages.conversation_id
            AND user_id = auth.uid()
          )
        );

      DROP POLICY IF EXISTS "Users can update messages in their conversations" ON public.chatbot_messages;
      CREATE POLICY "Users can update messages in their conversations" ON public.chatbot_messages
        FOR UPDATE USING (
          EXISTS (
            SELECT 1 FROM public.chatbot_conversations
            WHERE id = chatbot_messages.conversation_id
            AND user_id = auth.uid()
          )
        );

      DROP POLICY IF EXISTS "Users can delete messages in their conversations" ON public.chatbot_messages;
      CREATE POLICY "Users can delete messages in their conversations" ON public.chatbot_messages
        FOR DELETE USING (
          EXISTS (
            SELECT 1 FROM public.chatbot_conversations
            WHERE id = chatbot_messages.conversation_id
            AND user_id = auth.uid()
          )
        );
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