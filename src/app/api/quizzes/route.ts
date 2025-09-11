import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/backend/utils/auth';
import { supabase, supabaseAdmin } from '@/lib/supabase';

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
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);

    console.log('Executing Supabase query...');
    const { data: quizzes, error } = await supabaseAdmin
      .from('quizzes')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('Supabase query completed');
    console.log('Quizzes query result:', { count: quizzes?.length, error: error?.message });
    console.log('Quizzes data:', quizzes);

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

    const { title, description, questions, passing_score } = await request.json();

    if (!title || !description || !questions || passing_score === undefined) {
      return NextResponse.json(
        { success: false, message: 'All fields are required' },
        { status: 400 }
      );
    }

    console.log('Creating quiz:', { title, description, questionsCount: questions.length, passing_score, created_by: decoded.id });

    // Save quiz to Supabase
    const { data: newQuiz, error } = await supabaseAdmin
      .from('quizzes')
      .insert({
        title,
        description,
        questions,
        passing_score,
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

    // Automatically create a chat room for the quiz
    try {
      console.log('Creating chat room for quiz:', newQuiz.id);

      const { data: chatRoom, error: chatError } = await supabaseAdmin
        .from('quiz_chat_rooms')
        .insert({
          quiz_id: newQuiz.id,
          room_name: `${title} Discussion`,
          room_description: `Discussion room for the quiz: ${title}`,
          room_type: 'quiz_discussion',
          is_active: true,
          allow_discussion: true,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (chatError) {
        console.error('Error creating chat room:', chatError);
        // Don't fail the entire request if chat room creation fails
        // Just log the error and continue
      } else {
        console.log('Chat room created successfully:', chatRoom.quiz_id);
      }
    } catch (chatRoomError) {
      console.error('Failed to create chat room:', chatRoomError);
      // Continue with quiz creation even if chat room fails
    }

    return NextResponse.json({ success: true, quiz: newQuiz });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
