import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { verifyToken } from '../../../../../backend/utils/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { data: quiz, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !quiz) {
      return NextResponse.json(
        { success: false, message: 'Quiz not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, quiz });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
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
    const { data: existingQuiz, error: fetchError } = await supabase
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
    const { error: deleteAttemptsError } = await supabase
      .from('quiz_attempts')
      .delete()
      .eq('quiz_id', params.id);

    if (deleteAttemptsError) {
      console.error('Error deleting quiz attempts:', deleteAttemptsError);
      // Continue with quiz deletion even if attempts deletion fails
    }

    // Now delete the quiz
    const { error } = await supabase
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
  } catch (error) {
    console.error('Unexpected error in DELETE /api/quizzes/[id]:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
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

    const { title, description, questions, passingScore } = await request.json();

    if (!title || !description || !questions || !passingScore) {
      return NextResponse.json(
        { success: false, message: 'All fields are required' },
        { status: 400 }
      );
    }

    const { data: updatedQuiz, error } = await supabase
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

    if (error) {
      console.error('Quiz update error:', error);
      return NextResponse.json(
        { success: false, message: `Failed to update quiz: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, quiz: updatedQuiz });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
