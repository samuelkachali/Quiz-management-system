import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyToken } from '@/backend/utils/auth';

export async function PATCH(request: NextRequest) {
  console.log('=== MARK ALL NOTIFICATIONS AS READ API REQUEST ===');

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

    console.log('=== MARKING ALL NOTIFICATIONS AS READ ===');
    console.log('User ID:', decoded.id);

    // Mark all notifications as read
    const { data: updatedNotifications, error } = await supabaseAdmin
      .from('notifications')
      .update({
        read: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', decoded.id)
      .eq('read', false)
      .select('id');

    console.log('Mark all read result:', {
      updatedCount: updatedNotifications?.length || 0,
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
      message: 'All notifications marked as read',
      updatedCount: updatedNotifications?.length || 0
    });

  } catch (error) {
    console.error('=== MARK ALL NOTIFICATIONS AS READ API CATCH BLOCK ===');
    console.error('Mark all notifications as read API error:', error);
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to mark notifications as read',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}