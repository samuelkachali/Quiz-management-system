import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyToken } from '@/backend/utils/auth';

export async function POST(request: NextRequest) {
  console.log('=== INTEGRITY VIOLATION API REQUEST ===');

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

    const body = await request.json();
    const { violation, sessionId, quizId } = body;

    console.log('=== RECORDING INTEGRITY VIOLATION ===');
    console.log('Violation data:', { type: violation?.type, severity: violation?.severity });
    console.log('Session ID:', sessionId);
    console.log('Quiz ID:', quizId);

    // Validate required fields
    if (!violation || !sessionId || !quizId) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: violation, sessionId, or quizId' },
        { status: 400 }
      );
    }

    // Record the violation in the database
    const { data: recordedViolation, error } = await supabaseAdmin
      .from('integrity_violations')
      .insert({
        session_id: sessionId,
        quiz_id: quizId,
        student_id: decoded.id,
        violation_type: violation.type,
        description: violation.description,
        severity: violation.severity,
        metadata: {
          timestamp: violation.timestamp,
          userAgent: request.headers.get('user-agent'),
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
        }
      })
      .select()
      .single();

    console.log('Violation recording result:', {
      success: !error,
      violationId: recordedViolation?.id,
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

    // Check if student should be flagged for suspicious activity
    const { count: violationCount, error: countError } = await supabaseAdmin
      .from('integrity_violations')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('student_id', decoded.id);

    if (countError) {
      console.error('Error counting violations:', countError);
    }

    // If student has multiple high-severity violations, flag the session
    if (violationCount && violationCount >= 3) {
      await supabaseAdmin
        .from('quiz_sessions')
        .update({
          flagged_for_review: true,
          risk_level: 'high',
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);
    }

    return NextResponse.json({
      success: true,
      message: 'Integrity violation recorded successfully',
      violation: recordedViolation,
      totalViolations: violationCount || 0
    });

  } catch (error) {
    console.error('=== INTEGRITY VIOLATION API CATCH BLOCK ===');
    console.error('Integrity violation API error:', error);
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to record integrity violation',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  console.log('=== GET INTEGRITY VIOLATIONS API REQUEST ===');

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
    const quizId = searchParams.get('quizId');
    const sessionId = searchParams.get('sessionId');

    console.log('=== FETCHING INTEGRITY VIOLATIONS ===');
    console.log('Quiz ID:', quizId);
    console.log('Session ID:', sessionId);
    console.log('User role:', decoded.role);

    let query = supabaseAdmin
      .from('integrity_violations')
      .select(`
        *,
        student:student_id(id, name, email),
        quiz:quiz_id(id, title)
      `)
      .order('created_at', { ascending: false });

    // Filter based on user role and permissions
    if (decoded.role === 'student') {
      // Students can only see their own violations
      query = query.eq('student_id', decoded.id);
    } else if (decoded.role === 'admin' || decoded.role === 'super_admin') {
      // Admins can see all violations, but can filter by quiz/session
      if (quizId) {
        query = query.eq('quiz_id', quizId);
      }
      if (sessionId) {
        query = query.eq('session_id', sessionId);
      }
    }

    const { data: violations, error } = await query.limit(100);

    console.log('Violations query result:', {
      count: violations?.length,
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

    // Group violations by severity for summary
    const summary = {
      total: violations?.length || 0,
      high: violations?.filter(v => v.severity === 'high').length || 0,
      medium: violations?.filter(v => v.severity === 'medium').length || 0,
      low: violations?.filter(v => v.severity === 'low').length || 0
    };

    return NextResponse.json({
      success: true,
      violations: violations || [],
      summary
    });

  } catch (error) {
    console.error('=== GET INTEGRITY VIOLATIONS API CATCH BLOCK ===');
    console.error('Get integrity violations API error:', error);
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch integrity violations',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}