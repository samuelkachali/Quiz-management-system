import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyToken } from '@/backend/utils/auth';

export async function GET(request: NextRequest) {
  console.log('=== CHAT ROOMS API REQUEST ===');

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

    console.log('=== FETCHING CHAT ROOMS ===');
    console.log('User:', decoded.email, 'Role:', decoded.role);

    // Fetch quiz chat rooms with quiz information
    const { data: chatRooms, error } = await supabaseAdmin
      .from('quiz_chat_rooms')
      .select(`
        quiz_id,
        room_name,
        room_description,
        room_type,
        is_active,
        allow_discussion,
        created_at,
        quizzes (
          title,
          description
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    console.log('Chat rooms query result:', {
      count: chatRooms?.length,
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

    // Transform the data to match the expected format
    const transformedRooms = (chatRooms || []).map(room => ({
      quiz_id: room.quiz_id,
      room_name: room.room_name,
      room_description: room.room_description,
      room_type: room.room_type,
      quiz_title: (room.quizzes as Array<{ title: string; description: string; }>)?.[0]?.title || 'Unknown Quiz',
      quiz_description: (room.quizzes as Array<{ title: string; description: string; }>)?.[0]?.description || ''
    }));

    console.log('Transformed rooms:', transformedRooms.length);

    return NextResponse.json({
      success: true,
      rooms: transformedRooms,
      total: transformedRooms.length
    });

  } catch (error) {
    console.error('=== CHAT ROOMS API CATCH BLOCK ===');
    console.error('Chat rooms API error:', error);
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch chat rooms',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}