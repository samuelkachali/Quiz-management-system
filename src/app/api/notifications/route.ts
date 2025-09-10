import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyToken } from '@/backend/utils/auth';

export async function GET(request: NextRequest) {
  console.log('=== GET NOTIFICATIONS API REQUEST ===');

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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const unreadOnly = searchParams.get('unread') === 'true';

    console.log('=== FETCHING NOTIFICATIONS ===');
    console.log('User ID:', decoded.id);
    console.log('Limit:', limit, 'Offset:', offset, 'Unread only:', unreadOnly);

    let query = supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', decoded.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    const { data: notifications, error, count } = await query;

    console.log('Notifications query result:', {
      count: notifications?.length,
      totalCount: count,
      error: error?.message
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

    // Get unread count
    const { count: unreadCount } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', decoded.id)
      .eq('read', false);

    return NextResponse.json({
      success: true,
      notifications: notifications || [],
      total: count || 0,
      unread: unreadCount || 0,
      pagination: {
        limit,
        offset,
        hasMore: (offset + limit) < (count || 0)
      }
    });

  } catch (error) {
    console.error('=== GET NOTIFICATIONS API CATCH BLOCK ===');
    console.error('Get notifications API error:', error);
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch notifications',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log('=== CREATE NOTIFICATION API REQUEST ===');

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

    const body = await request.json();
    const { type, title, message, priority = 'medium', metadata = {}, recipientId } = body;

    console.log('=== CREATING NOTIFICATION ===');
    console.log('Type:', type, 'Priority:', priority);
    console.log('Recipient ID:', recipientId || decoded.id);

    // Validate required fields
    if (!type || !title || !message) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: type, title, message' },
        { status: 400 }
      );
    }

    // Determine recipient (can be different user or self)
    const targetUserId = recipientId || decoded.id;

    // Create notification
    const { data: notification, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: targetUserId,
        type,
        title,
        message,
        priority,
        metadata,
        read: false
      })
      .select()
      .single();

    console.log('Notification creation result:', {
      success: !error,
      notificationId: notification?.id,
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

    // If this is a high-priority notification, we could trigger additional actions here
    // like sending email notifications, push notifications, etc.

    return NextResponse.json({
      success: true,
      message: 'Notification created successfully',
      notification
    });

  } catch (error) {
    console.error('=== CREATE NOTIFICATION API CATCH BLOCK ===');
    console.error('Create notification API error:', error);
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to create notification',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}
