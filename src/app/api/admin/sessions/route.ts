import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyToken } from '@/backend/utils/auth';

export async function GET(request: NextRequest) {
  console.log('=== GET SESSIONS API REQUEST ===');

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

    if (!decoded || (decoded.role !== 'admin' && decoded.role !== 'super_admin')) {
      console.error('Insufficient permissions:', { role: decoded?.role });
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const flagged = searchParams.get('flagged') === 'true';

    console.log('=== FETCHING QUIZ SESSIONS ===');
    console.log('Flagged filter:', flagged);

    let query = supabaseAdmin
      .from('quiz_sessions')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter for flagged sessions if requested
    if (flagged) {
      query = query.eq('flagged_for_review', true);
    }

    const { data: sessions, error } = await query.limit(100);

    console.log('Sessions query result:', {
      count: sessions?.length,
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

    return NextResponse.json({
      success: true,
      sessions: sessions || [],
      total: sessions?.length || 0
    });

  } catch (error) {
    console.error('=== GET SESSIONS API CATCH BLOCK ===');
    console.error('Get sessions API error:', error);
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch quiz sessions',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}