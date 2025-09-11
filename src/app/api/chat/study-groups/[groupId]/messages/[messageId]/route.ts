import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyToken } from '@/backend/utils/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: { groupId: string; messageId: string } }
) {
  console.log('=== PUT STUDY GROUP MESSAGE API REQUEST (EDIT) ===');

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

    const { groupId, messageId } = params;
    const body = await request.json();
    const { content } = body;

    console.log(`Editing message ${messageId} in group ${groupId} by user ${decoded.email}`);

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
    if (!content || !content.trim()) {
      return NextResponse.json(
        { success: false, message: 'Message content is required' },
        { status: 400 }
      );
    }

    // Check if the message exists and belongs to the user
    const { data: existingMessage, error: fetchError } = await supabaseAdmin
      .from('study_group_messages')
      .select('user_id, message_type')
      .eq('id', messageId)
      .eq('group_id', groupId)
      .single();

    if (fetchError || !existingMessage) {
      console.error('Message not found or fetch error:', fetchError);
      return NextResponse.json(
        { success: false, message: 'Message not found' },
        { status: 404 }
      );
    }

    // Check if user owns the message
    if (existingMessage.user_id !== decoded.id) {
      console.error('User does not own this message');
      return NextResponse.json(
        { success: false, message: 'You can only edit your own messages' },
        { status: 403 }
      );
    }

    // Update the message
    const { data: updatedMessage, error } = await supabaseAdmin
      .from('study_group_messages')
      .update({
        content: content.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', messageId)
      .eq('group_id', groupId)
      .select(`
        *,
        user:user_id(id, name, email)
      `)
      .single();

    if (error) {
      console.error('Database update error:', error.message);
      console.error('Supabase update error:', {
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message
      });
      throw error;
    }

    console.log(`Message ${messageId} updated successfully`);

    return NextResponse.json({
      success: true,
      message: 'Message updated successfully',
      messageData: {
        ...updatedMessage,
        user: updatedMessage.user || null,
        user_name: updatedMessage.user?.name || null,
        user_email: updatedMessage.user?.email || null,
        user_role: membership.role || 'member'
      }
    });

  } catch (error) {
    console.error('=== PUT STUDY GROUP MESSAGE API CATCH BLOCK ===');
    console.error('Put study group message API error:', error);
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to edit message',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { groupId: string; messageId: string } }
) {
  console.log('=== DELETE STUDY GROUP MESSAGE API REQUEST ===');

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

    const { groupId, messageId } = params;

    console.log(`Deleting message ${messageId} in group ${groupId} by user ${decoded.email}`);

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

    // Check if the message exists and belongs to the user
    const { data: existingMessage, error: fetchError } = await supabaseAdmin
      .from('study_group_messages')
      .select('user_id, message_type')
      .eq('id', messageId)
      .eq('group_id', groupId)
      .single();

    if (fetchError || !existingMessage) {
      console.error('Message not found or fetch error:', fetchError);
      return NextResponse.json(
        { success: false, message: 'Message not found' },
        { status: 404 }
      );
    }

    // Check if user owns the message or is an admin
    if (existingMessage.user_id !== decoded.id && membership.role !== 'admin') {
      console.error('User does not own this message and is not an admin');
      return NextResponse.json(
        { success: false, message: 'You can only delete your own messages' },
        { status: 403 }
      );
    }

    // Delete the message
    const { error } = await supabaseAdmin
      .from('study_group_messages')
      .delete()
      .eq('id', messageId)
      .eq('group_id', groupId);

    if (error) {
      console.error('Database delete error:', error.message);
      console.error('Supabase delete error:', {
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message
      });
      throw error;
    }

    console.log(`Message ${messageId} deleted successfully`);

    return NextResponse.json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('=== DELETE STUDY GROUP MESSAGE API CATCH BLOCK ===');
    console.error('Delete study group message API error:', error);
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to delete message',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}