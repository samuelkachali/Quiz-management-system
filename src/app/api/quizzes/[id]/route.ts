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

    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', params.id);

    if (error) {
      return NextResponse.json(
        { success: false, message: 'Failed to delete quiz' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Quiz deleted successfully' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
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
