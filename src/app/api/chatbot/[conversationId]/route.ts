import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyToken } from '@/backend/utils/auth';

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

    // Get conversation details
    const { data: conversation, error } = await supabaseAdmin
      .from('chatbot_conversations')
      .select(`
        id,
        user_id,
        title,
        status,
        created_at,
        updated_at
      `)
      .eq('id', conversationId)
      .eq('user_id', decoded.id)
      .single();

    if (error || !conversation) {
      return NextResponse.json(
        { success: false, message: 'Conversation not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      conversation
    });

  } catch (error) {
    console.error('Chatbot conversation API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const { title, status } = body;

    // Update conversation
    const updateData: any = { updated_at: new Date().toISOString() };
    if (title !== undefined) updateData.title = title;
    if (status !== undefined) updateData.status = status;

    const { data: conversation, error } = await supabaseAdmin
      .from('chatbot_conversations')
      .update(updateData)
      .eq('id', conversationId)
      .eq('user_id', decoded.id)
      .select()
      .single();

    if (error || !conversation) {
      return NextResponse.json(
        { success: false, message: 'Conversation not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      conversation
    });

  } catch (error) {
    console.error('Chatbot conversation API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Delete conversation (messages will be deleted automatically due to CASCADE)
    const { error } = await supabaseAdmin
      .from('chatbot_conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', decoded.id);

    if (error) {
      console.error('Error deleting conversation:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to delete conversation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Conversation deleted successfully'
    });

  } catch (error) {
    console.error('Chatbot conversation API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}