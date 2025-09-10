import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { verifyToken } from '@/backend/utils/auth';

// Enable debug logging for Supabase
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Supabase Admin Key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

interface User {
  id: string;
  email?: string;
  name?: string;
}

interface Quiz {
  id: string;
  title?: string;
}

interface QuizAttempt {
  id: string;
  quiz_id: string;
  student_id: string;
  answers: Record<string, any>;
  score: number;
  passed: boolean;
  completed_at: string;
  user?: User;
  quiz?: Quiz;
}

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
    if (!decoded || (decoded.role !== 'admin' && decoded.role !== 'super_admin')) {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    console.log('Fetching quiz attempts from Supabase...');
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);

    // First, get the attempts with basic data using admin client
    console.log('Fetching quiz attempts from Supabase...');
    const { data: attempts, error } = await supabaseAdmin
      .from('quiz_attempts')
      .select('*')
      .order('completed_at', { ascending: false });

    console.log('Attempts query result:', { count: attempts?.length, error: error?.message });
    console.log('Attempts data:', attempts);
    
    if (error) {
      console.error('Error fetching quiz attempts:', error);
      console.error('Supabase error details:', {
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message
      });
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to fetch quiz attempts',
          error: process.env.NODE_ENV === 'development' ? {
            message: error.message,
            code: error.code,
            details: error.details
          } : undefined
        },
        { status: 500 }
      );
    }
    
    if (!attempts || attempts.length === 0) {
      return NextResponse.json({ success: true, attempts: [] });
    }
    
    try {
      // Get unique user and quiz IDs
      const userIds = Array.from(new Set(attempts.map(a => a.student_id).filter(Boolean) as string[]));
      const quizIds = Array.from(new Set(attempts.map(a => a.quiz_id).filter(Boolean) as string[]));
      
      // Fetch related users and quizzes
      const [
        { data: users, error: usersError },
        { data: quizzes, error: quizzesError }
      ] = await Promise.all([
        userIds.length > 0
          ? supabaseAdmin
              .from('users')
              .select('id, email, name')
              .in('id', userIds)
          : { data: null, error: null },
        quizIds.length > 0
          ? supabaseAdmin
              .from('quizzes')
              .select('id, title')
              .in('id', quizIds)
          : { data: null, error: null }
      ]);
      
      if (usersError || quizzesError) {
        console.error('Error fetching related data:', { usersError, quizzesError });
        return NextResponse.json(
          { success: false, message: 'Failed to fetch related data' },
          { status: 500 }
        );
      }
      
      // Create maps for quick lookup
      const userMap = new Map<string, User>();
      const quizMap = new Map<string, Quiz>();
      
      users?.forEach(user => user && user.id && userMap.set(user.id, user));
      quizzes?.forEach(quiz => quiz && quiz.id && quizMap.set(quiz.id, quiz));
      
      // Combine the data with proper typing
      const attemptsWithRelations: QuizAttempt[] = attempts.map(attempt => ({
        ...attempt,
        user: userMap.get(attempt.student_id) || { id: attempt.student_id },
        quiz: quizMap.get(attempt.quiz_id) || { id: attempt.quiz_id }
      }));
      
      return NextResponse.json({ 
        success: true, 
        attempts: attemptsWithRelations 
      });
      
    } catch (error: any) {
      console.error('Error processing quiz attempts:', error);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Error processing quiz attempts',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Unexpected error in GET /api/admin/attempts:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' 
          ? error instanceof Error ? error.message : String(error)
          : undefined
      },
      { status: 500 }
    );
  }
}
