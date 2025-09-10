import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyToken } from '@/backend/utils/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('=== MARK NOTIFICATION AS READ API REQUEST ===');

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
    const notificationId = params.id;

    console.log('Notification ID:', notificationId);

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

    console.log('=== MARKING NOTIFICATION AS READ ===');
    console.log('User ID:', decoded.id);
    console.log('Notification ID:', notificationId);

    // First verify the notification belongs to the user
    const { data: existingNotification, error: fetchError } = await supabaseAdmin
      .from('notifications')
      .select('id, user_id, read')
      .eq('id', notificationId)
      .eq('user_id', decoded.id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') { // No rows returned
        return NextResponse.json(
          { success: false, message: 'Notification not found or access denied' },
          { status: 404 }
        );
      }
      console.error('Supabase fetch error:', {
        code: fetchError.code,
        details: fetchError.details,
        hint: fetchError.hint,
        message: fetchError.message
      });
      throw fetchError;
    }

    if (existingNotification.read) {
      return NextResponse.json({
        success: true,
        message: 'Notification was already marked as read',
        notification: existingNotification
      });
    }

    // Mark the notification as read
    const { data: updatedNotification, error } = await supabaseAdmin
      .from('notifications')
      .update({
        read: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', notificationId)
      .eq('user_id', decoded.id)
      .select()
      .single();

    console.log('Mark as read result:', {
      success: !error,
      notificationId: updatedNotification?.id,
      error: error?.message
    });

    if (error) {
      console.error('Supabase update error:', {
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message
      });
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Notification marked as read successfully',
      notification: updatedNotification
    });

  } catch (error) {
    console.error('=== MARK NOTIFICATION AS READ API CATCH BLOCK ===');
    console.error('Mark notification as read API error:', error);
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to mark notification as read',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}