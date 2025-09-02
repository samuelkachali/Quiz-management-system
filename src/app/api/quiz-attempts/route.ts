import { NextRequest, NextResponse } from 'next/server';
import { addQuizAttempt, findQuizById, getQuizAttemptsByStudent } from '../../../../backend/data/storage';
import { verifyToken } from '../../../../backend/utils/auth';

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

    const quiz = findQuizById(quizId);
    if (!quiz) {
      return NextResponse.json(
        { success: false, message: 'Quiz not found' },
        { status: 404 }
      );
    }

    // Calculate score
    let correctAnswers = 0;
    quiz.questions.forEach(question => {
      const studentAnswer = answers[question.id];
      if (studentAnswer === question.correctAnswer) {
        correctAnswers++;
      }
    });

    const score = Math.round((correctAnswers / quiz.questions.length) * 100);
    const passed = score >= quiz.passingScore;

    const attempt = addQuizAttempt({
      quizId,
      studentId: decoded.id,
      answers,
      score,
      passed
    });

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

    const attempts = getQuizAttemptsByStudent(decoded.id);
    return NextResponse.json({ success: true, attempts });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
