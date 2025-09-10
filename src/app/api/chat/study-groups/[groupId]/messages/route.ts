import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyToken } from '@/backend/utils/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  console.log('=== GET STUDY GROUP MESSAGES API REQUEST ===');

  try {
    const authHeader = request.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('No or invalid authorization header');
      return NextResponse.json(
        { success: false, message: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    console.log('Token received (first 10 chars):', token.substring(0, 10) + '...');

    let decoded;
    try {
      decoded = verifyToken(token);
      console.log('Token decoded successfully:', {
        id: decoded?.id,
        email: decoded?.email,
        role: decoded?.role
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Token verification failed:', errorMessage);
      return NextResponse.json(
        { success: false, message: 'Invalid token', error: errorMessage },
        { status: 401 }
      );
    }

    if (!decoded) {
      console.error('No decoded user data');
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    const groupId = params.groupId;
    console.log('=== FETCHING STUDY GROUP MESSAGES ===');
    console.log('Group ID:', groupId, 'User:', decoded.email);

    // Check if user is a member of the study group
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('user_study_groups')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', decoded.id)
      .single();

    if (membershipError || !membership) {
      console.error('User is not a member of this study group');
      return NextResponse.json(
        { success: false, message: 'You are not a member of this study group' },
        { status: 403 }
      );
    }

    // Get messages directly from the table
    console.log('=== EXECUTING MESSAGES QUERY ===');
    console.log('Query details:', {
      table: 'study_group_messages',
      groupId,
      select: `
        *,
        user:user_id(id, name, email),
        reactions:study_group_message_reactions(
          id,
          emoji,
          user_id,
          created_at,
          user:user_id(id, name, email)
        )
      `
    });

    const { data: messages, error } = await supabaseAdmin
      .from('study_group_messages')
      .select(`
        *,
        user:user_id(id, name, email),
        reactions:study_group_message_reactions(
          id,
          emoji,
          user_id,
          created_at,
          user:user_id(id, name, email)
        )
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })
      .limit(50);

    console.log('Messages query result:', {
      count: messages?.length,
      error: error?.message,
      errorCode: error?.code,
      errorDetails: error?.details,
      errorHint: error?.hint,
      firstMessage: messages?.[0] ? {
        id: messages[0].id,
        user_name: messages[0].user?.name,
        content: messages[0].content?.substring(0, 50)
      } : null
    });

    if (error) {
      console.error('Supabase query error:', {
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message
      });
      throw error;
    }

    return NextResponse.json({
      success: true,
      messages: messages || [],
      userRole: membership.role
    });

  } catch (error) {
    console.error('=== GET STUDY GROUP MESSAGES API CATCH BLOCK ===');
    console.error('Get study group messages API error:', error);
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch study group messages',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  console.log('=== POST STUDY GROUP MESSAGE API REQUEST ===');

  try {
    const authHeader = request.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('No or invalid authorization header');
      return NextResponse.json(
        { success: false, message: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    console.log('Token received (first 10 chars):', token.substring(0, 10) + '...');

    let decoded;
    try {
      decoded = verifyToken(token);
      console.log('Token decoded successfully:', {
        id: decoded?.id,
        email: decoded?.email,
        role: decoded?.role
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Token verification failed:', errorMessage);
      return NextResponse.json(
        { success: false, message: 'Invalid token', error: errorMessage },
        { status: 401 }
      );
    }

    if (!decoded) {
      console.error('No decoded user data');
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    const groupId = params.groupId;
    const body = await request.json();
    const { content, messageType = 'text', replyToId, fileUrl, fileName, fileSize, fileType } = body;

    console.log('=== CREATING STUDY GROUP MESSAGE ===');
    console.log('Group ID:', groupId, 'User:', decoded.email);
    console.log('Message data:', { content, messageType, replyToId, fileUrl, fileName });

    // Check if user is a member of the study group
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('user_study_groups')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', decoded.id)
      .single();

    if (membershipError || !membership) {
      console.error('User is not a member of this study group');
      return NextResponse.json(
        { success: false, message: 'You are not a member of this study group' },
        { status: 403 }
      );
    }

    // Validate message content
    if (messageType === 'text' && (!content || !content.trim())) {
      return NextResponse.json(
        { success: false, message: 'Message content is required' },
        { status: 400 }
      );
    }

    if (messageType === 'file' && !fileUrl) {
      return NextResponse.json(
        { success: false, message: 'File URL is required for file messages' },
        { status: 400 }
      );
    }

    // Create the message
    const { data: newMessage, error } = await supabaseAdmin
      .from('study_group_messages')
      .insert({
        group_id: groupId,
        user_id: decoded.id,
        message_type: messageType,
        content: messageType === 'text' ? content.trim() : null,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        file_type: fileType,
        parent_message_id: replyToId || null
      })
      .select(`
        *,
        user:user_id(id, name, email)
      `)
      .single();

    console.log('Create message result:', {
      success: !error,
      messageId: newMessage?.id,
      error: error?.message
    });

    if (error) {
      console.error('Supabase insert error:', {
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message
      });
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      messageData: newMessage
    });

  } catch (error) {
    console.error('=== POST STUDY GROUP MESSAGE API CATCH BLOCK ===');
    console.error('Post study group message API error:', error);
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to send message',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}