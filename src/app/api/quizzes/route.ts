import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '../../../../backend/utils/auth';
import { supabase } from '@/lib/supabase';

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
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    console.log('Fetching quizzes from Supabase...');
    
    console.log('Executing Supabase query...');
    const { data: quizzes, error } = await supabase
      .from('quizzes')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('Supabase query completed');

    if (error) {
      console.error('Supabase error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to fetch quizzes',
          error: process.env.NODE_ENV === 'development' ? {
            message: error.message,
            code: error.code
          } : 'Failed to fetch quizzes'
        },
        { status: 500 }
      );
    }
    
    console.log(`Successfully fetched ${quizzes?.length || 0} quizzes`);

    return NextResponse.json({ success: true, quizzes: quizzes || [] });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    
    console.log('Quiz creation - Token decoded:', decoded);
    
    if (!decoded || (decoded.role !== 'admin' && decoded.role !== 'super_admin')) {
      console.log('Quiz creation - Role check failed:', { decoded: !!decoded, role: decoded?.role });
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const { title, description, questions, passingScore } = await request.json();

    if (!title || !description || !questions || !passingScore) {
      return NextResponse.json(
        { success: false, message: 'All fields are required' },
        { status: 400 }
      );
    }

    console.log('Creating quiz:', { title, description, questionsCount: questions.length, passingScore, createdBy: decoded.id });

    // Save quiz to Supabase
    const { data: newQuiz, error } = await supabase
      .from('quizzes')
      .insert({
        title,
        description,
        questions,
        passing_score: passingScore,
        created_by: decoded.id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating quiz:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to create quiz' },
        { status: 500 }
      );
    }

    console.log('Quiz created successfully:', newQuiz.id);

    return NextResponse.json({ success: true, quiz: newQuiz });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
