import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFile, unlink } from 'fs/promises';
import * as pdf from 'pdf-parse';
import * as mammoth from 'mammoth';

// This is required for file uploads in App Router
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('=== QUIZ IMPORT REQUEST STARTED ===');
  
  try {
    // Check authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // Verify token and get user role
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || !['admin', 'super_admin'].includes(userData.role)) {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 }
      );
    }

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: 'File size exceeds 5MB limit' },
        { status: 400 }
      );
    }

    // Process the file based on type
    let text = '';
    const fileType = file.type;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    if (fileType === 'application/pdf') {
      const pdfData = await pdf.default(fileBuffer);
      text = pdfData.text;
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // Convert Buffer to ArrayBuffer for mammoth
      const arrayBuffer = fileBuffer.buffer.slice(
        fileBuffer.byteOffset,
        fileBuffer.byteOffset + fileBuffer.byteLength
      );
      const result = await mammoth.extractRawText({ arrayBuffer });
      text = result.value;
    } else if (fileType === 'text/plain') {
      text = fileBuffer.toString('utf-8');
    } else {
      return NextResponse.json(
        { success: false, message: 'Unsupported file type' },
        { status: 400 }
      );
    }

    // Parse questions from text
    const questions = parseQuestionsFromText(text);
    
    if (questions.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No questions found in the document' },
        { status: 400 }
      );
    }

    // Create quiz in database
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .insert({
        title: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
        description: `Imported from ${file.name}`,
        created_by: user.id,
        is_published: false,
      })
      .select('id')
      .single();

    if (quizError || !quiz) {
      console.error('Error creating quiz:', quizError);
      return NextResponse.json(
        { success: false, message: 'Failed to create quiz' },
        { status: 500 }
      );
    }

    // Add questions to the quiz
    for (const question of questions) {
      const { error: questionError } = await supabase
        .from('questions')
        .insert({
          quiz_id: quiz.id,
          question_text: question.text,
          question_type: question.type,
          options: question.options,
          correct_answer: question.correctAnswer,
          points: 1,
        });

      if (questionError) {
        console.error('Error adding question:', questionError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Quiz imported successfully!',
      quizId: quiz.id,
      questionsCount: questions.length
    });

  } catch (error) {
    console.error('Error in quiz import:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process file' },
      { status: 500 }
    );
  }
}

// Helper function to parse questions from text
function parseQuestionsFromText(text: string): Array<{
  text: string;
  type: 'multiple_choice';
  options: string[];
  correctAnswer: string;
}> {
  // This is a simple parser - you'll need to adjust it based on your document format
  const questions: Array<{
    text: string;
    type: 'multiple_choice';
    options: string[];
    correctAnswer: string;
  }> = [];

  // Split text into lines and process
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  
  let currentQuestion: {
    text: string;
    options: string[];
    correctAnswer: string;
  } | null = null;

  for (const line of lines) {
    // Check if line starts with a number followed by a dot (e.g., "1. ")
    if (/^\d+\.\s+.+/.test(line)) {
      // Save previous question if exists
      if (currentQuestion) {
        if (currentQuestion.options.length > 0 && currentQuestion.correctAnswer) {
          questions.push({
            ...currentQuestion,
            type: 'multiple_choice'
          });
        }
      }
      
      // Start new question
      currentQuestion = {
        text: line.replace(/^\d+\.\s*/, ''),
        options: [],
        correctAnswer: ''
      };
    } 
    // Check for options (lines starting with a letter and parenthesis, e.g., "A) Option 1")
    else if (currentQuestion && /^[A-Za-z]\)\s+.+/.test(line)) {
      const optionMatch = line.match(/^([A-Za-z])\)\s+(.+)/);
      if (optionMatch) {
        const [_, letter, text] = optionMatch;
        currentQuestion.options.push(text);
      }
    }
    // Check for correct answer indicator (e.g., "Answer: A")
    else if (currentQuestion && /^answer:\s*[A-Za-z]\s*$/i.test(line)) {
      const match = line.match(/^answer:\s*([A-Za-z])\s*$/i);
      if (match) {
        currentQuestion.correctAnswer = match[1].toUpperCase();
      }
    }
  }

  // Add the last question if it exists
  if (currentQuestion && currentQuestion.options.length > 0 && currentQuestion.correctAnswer) {
    questions.push({
      ...currentQuestion,
      type: 'multiple_choice'
    });
  }

  return questions;
}

// Block all other methods
export async function GET() {
  return NextResponse.json(
    { success: false, message: 'Method not allowed' },
    { status: 405 }
  );
}
