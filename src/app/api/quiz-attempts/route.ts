import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { verifyToken } from '../../../../backend/utils/auth';
import { Question } from '../../../types';

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
    if (!decoded || decoded.role !== 'student') {
      return NextResponse.json(
        { success: false, message: 'Student access required' },
        { status: 403 }
      );
    }

    const { quizId, answers } = await request.json();

    if (!quizId || !answers) {
      return NextResponse.json(
        { success: false, message: 'Quiz ID and answers are required' },
        { status: 400 }
      );
    }

    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .single();

    if (quizError || !quiz) {
      return NextResponse.json(
        { success: false, message: 'Quiz not found' },
        { status: 404 }
      );
    }

    // Calculate score
    let correctAnswers = 0;
    quiz.questions.forEach((question: Question) => {
      const studentAnswer = answers[question.id];
      if (studentAnswer === question.correctAnswer) {
        correctAnswers++;
      }
    });

    const score = Math.round((correctAnswers / quiz.questions.length) * 100);
    const passed = score >= quiz.passingScore;

    const { data: attempt, error: attemptError } = await supabase
      .from('quiz_attempts')
      .insert({
        quiz_id: quizId,
        student_id: decoded.id,
        answers,
        score,
        passed,
        completed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (attemptError) {
      return NextResponse.json(
        { success: false, message: 'Failed to save quiz attempt' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      attempt,
      quiz: { title: quiz.title, passingScore: quiz.passingScore }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
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
    if (!decoded || decoded.role !== 'student') {
      return NextResponse.json(
        { success: false, message: 'Student access required' },
        { status: 403 }
      );
    }

    const { data: attempts, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('student_id', decoded.id);

    if (error) {
      return NextResponse.json(
        { success: false, message: 'Failed to fetch quiz attempts' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, attempts });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
