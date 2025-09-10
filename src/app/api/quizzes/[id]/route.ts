import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '../../../../lib/supabase';
import { verifyToken } from '../../../../../backend/utils/auth';

console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Supabase Anon Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '***' : 'Not set');

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('GET /api/quizzes/[id] called with ID:', params.id);
  
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No token provided');
      return NextResponse.json(
        { success: false, message: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      console.log('Invalid token');
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    console.log('Fetching quiz with ID:', params.id);
    
    console.log('Fetching quiz with ID:', params.id);
    
    console.log('Attempting to fetch quiz with ID:', params.id);
    
    // First, get the quiz
    const { data: quiz, error: quizError } = await supabaseAdmin
      .from('quizzes')
      .select('*')
      .eq('id', params.id)
      .single();
      
    console.log('Quiz fetch result:', { quiz, quizError });
      
    console.log('Quiz fetch result:', { quiz, quizError });

    if (quizError) {
      console.error('Error fetching quiz:', {
        message: quizError.message,
        code: quizError.code,
        details: quizError.details,
        hint: quizError.hint
      });
      return NextResponse.json(
        { 
          success: false, 
          message: 'Error fetching quiz',
          error: {
            message: quizError.message,
            code: quizError.code,
            details: quizError.details,
            hint: quizError.hint
          }
        },
        { status: 500 }
      );
    }

    if (!quiz) {
      console.log('Quiz not found');
      return NextResponse.json(
        { success: false, message: 'Quiz not found' },
        { status: 404 }
      );
    }

    console.log('Quiz found, fetching questions...');
    
    // Log the raw quiz data for debugging
    console.log('Raw quiz data:', JSON.stringify(quiz, null, 2));
    
    // Ensure questions exists and is an array
    const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
    console.log(`Found ${questions.length} questions in quiz data`);
    
    // Transform the questions to match the expected format
    const formattedQuestions = questions.map((q: any) => {
      // Log each question for debugging
      console.log('Processing question:', JSON.stringify(q, null, 2));
      
      return {
        id: q.id || `temp-${Math.random().toString(36).substr(2, 9)}`,
        question_text: q.question_text || q.question || q.text || '',
        question_type: q.question_type || (q.type === 'multiple-choice' ? 'multiple_choice' : 'short_answer'),
        points: typeof q.points === 'number' ? q.points : 1,
        options: Array.isArray(q.options) ? q.options : [],
        correct_answer: q.correct_answer !== undefined ? q.correct_answer : (q.correctAnswer !== undefined ? q.correctAnswer : null),
        explanation: q.explanation || ''
      };
    });
    
    // Combine quiz with its questions
    const quizWithQuestions = {
      ...quiz,
      questions: formattedQuestions
    };

    console.log('Successfully built quiz with questions and answers');
    return NextResponse.json({ 
      success: true, 
      quiz: quizWithQuestions 
    });
    
  } catch (error: unknown) {
    console.error('Unexpected error in GET /api/quizzes/[id]:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        } : undefined
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('DELETE /api/quizzes/[id] - Starting deletion for quiz ID:', params.id);
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No token provided');
      return NextResponse.json(
        { success: false, message: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      console.log('Invalid token');
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }
    
    if (decoded.role !== 'admin' && decoded.role !== 'super_admin') {
      console.log('Admin access required');
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    console.log('Attempting to delete quiz with ID:', params.id);
    
    // First check if the quiz exists
    const { data: existingQuiz, error: fetchError } = await supabaseAdmin
      .from('quizzes')
      .select('id')
      .eq('id', params.id)
      .single();

    if (fetchError || !existingQuiz) {
      console.log('Quiz not found:', params.id);
      return NextResponse.json(
        { success: false, message: 'Quiz not found' },
        { status: 404 }
      );
    }

    // Delete related attempts first if needed
    const { error: deleteAttemptsError } = await supabaseAdmin
      .from('quiz_attempts')
      .delete()
      .eq('quiz_id', params.id);

    if (deleteAttemptsError) {
      console.error('Error deleting quiz attempts:', deleteAttemptsError);
      // Continue with quiz deletion even if attempts deletion fails
    }

    // Now delete the quiz
    const { error } = await supabaseAdmin
      .from('quizzes')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting quiz:', error);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to delete quiz',
          error: error.message,
          details: error
        },
        { status: 500 }
      );
    }

    console.log('Successfully deleted quiz:', params.id);
    return NextResponse.json({ 
      success: true, 
      message: 'Quiz deleted successfully' 
    });
  } catch (error: unknown) {
    console.error('Unexpected error in DELETE /api/quizzes/[id]:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        } : undefined
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No token provided');
      return NextResponse.json(
        { success: false, message: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded || (decoded.role !== 'admin' && decoded.role !== 'super_admin')) {
      console.log('Unauthorized access attempt');
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error: unknown) {
      console.error('Error parsing request body:', error);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid request body',
          error: process.env.NODE_ENV === 'development' ? {
            message: error instanceof Error ? error.message : 'Unknown error'
          } : undefined
        },
        { status: 400 }
      );
    }

    const { title, description, questions, passingScore } = body;

    // Validate required fields
    if (!title || !description || !questions || !passingScore) {
      const missingFields = [];
      if (!title) missingFields.push('title');
      if (!description) missingFields.push('description');
      if (!questions) missingFields.push('questions');
      if (!passingScore) missingFields.push('passingScore');
      
      console.log('Missing required fields:', missingFields);
      return NextResponse.json(
        { 
          success: false, 
          message: 'All fields are required',
          missingFields,
          receivedData: { title: !!title, description: !!description, questions: !!questions, passingScore: !!passingScore }
        },
        { status: 400 }
      );
    }

    // Validate questions array
    if (!Array.isArray(questions) || questions.length === 0) {
      console.log('Invalid questions array');
      return NextResponse.json(
        { success: false, message: 'At least one question is required' },
        { status: 400 }
      );
    }

    // Check if quiz exists
    const { data: existingQuiz, error: fetchError } = await supabaseAdmin
      .from('quizzes')
      .select('id')
      .eq('id', params.id)
      .single();

    if (fetchError || !existingQuiz) {
      console.log('Quiz not found:', params.id);
      return NextResponse.json(
        { success: false, message: 'Quiz not found' },
        { status: 404 }
      );
    }

    console.log('Updating quiz:', params.id);
    
    // Update the quiz
    const { data: updatedQuiz, error: updateError } = await supabaseAdmin
      .from('quizzes')
      .update({
        title,
        description,
        questions,
        passing_score: passingScore,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      console.error('Quiz update error:', updateError);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to update quiz',
          error: process.env.NODE_ENV === 'development' ? {
            message: updateError.message,
            code: updateError.code,
            details: updateError.details
          } : undefined
        },
        { status: 500 }
      );
    }

    console.log('Successfully updated quiz:', params.id);
    return NextResponse.json({ 
      success: true, 
      quiz: updatedQuiz 
    });

  } catch (error: unknown) {
    console.error('Unexpected error in PUT /api/quizzes/[id]:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        } : undefined
      },
      { status: 500 }
    );
  }
}
